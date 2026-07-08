import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Appointment from '../models/Appointment.js';
import Consultation from '../models/Consultation.js';
import Notification from '../models/Notification.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import { config } from '../config/env.js';

const router = Router();

// Zod Validation Schemas
const walkinSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  doctorId: z.string().min(1, "Doctor ID is required"),
  symptoms: z.array(z.string()).optional()
});

const lateOptionsSchema = z.object({
  arrivalTime: z.string().regex(/^\d{2}:\d{2}$/, "Arrival time must be HH:MM format")
});

// POST /appointments/:id/checkin - Check-in a patient for an appointment
router.post('/appointments/:id/checkin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { code: 'APPOINTMENT_NOT_FOUND', message: 'The requested appointment does not exist.' }
      });
    }

    // Prevent double check-in
    if (appointment.status === 'checked_in') {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_CHECKED_IN', message: 'This patient is already checked in.' }
      });
    }

    // Validate correct check-in date
    const todayStr = new Date().toISOString().split('T')[0];
    if (appointment.appointmentDate !== todayStr) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DATE', message: 'You can only check in for today\'s appointment.' }
      });
    }

    // Load Patient and Doctor details for notification
    const patient = await Patient.findById(appointment.patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: { code: 'PATIENT_NOT_FOUND', message: 'Patient profile not found.' }
      });
    }

    // Update appointment status
    appointment.status = 'checked_in';
    await appointment.save();

    // Create a consultation record with status "open" (joined wait queue)
    const newConsultation = new Consultation({
      appointmentId: appointment._id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      status: 'open'
    });
    await newConsultation.save();

    // Create Notification for the doctor
    const docNotification = new Notification({
      recipientId: appointment.doctorId.toString(),
      type: 'PATIENT_CHECKIN',
      title: 'Patient Checked In',
      message: `Patient ${patient.firstName} ${patient.lastName} has checked in for their appointment.`,
      status: 'unread'
    });
    await docNotification.save();

    return res.status(200).json({
      success: true,
      data: {
        appointment,
        consultation: newConsultation,
        notification: docNotification
      },
      message: 'Patient checked in successfully.'
    });
  } catch (error) {
    next(error);
  }
});

// POST /consultations/walkin - Create a walk-in consultation directly
router.post('/consultations/walkin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const valResult = walkinSchema.safeParse(req.body);
    if (!valResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: valResult.error.errors[0].message }
      });
    }

    const { patientId, doctorId, symptoms } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: { code: 'PATIENT_NOT_FOUND', message: 'Unregistered patient profiles cannot register walk-in consultations.' }
      });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: { code: 'DOCTOR_NOT_FOUND', message: 'Assigned doctor not found.' }
      });
    }

    // Create consultation directly
    const walkinConsultation = new Consultation({
      patientId,
      doctorId,
      symptoms: symptoms || [],
      status: 'open'
    });
    await walkinConsultation.save();

    return res.status(201).json({
      success: true,
      data: walkinConsultation,
      message: 'Walk-in consultation created. Patient added to wait queue.'
    });
  } catch (error) {
    next(error);
  }
});

// GET /consultations/queue - Get active waiting consultation queue list
router.get('/consultations/queue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activeConsultations = await Consultation.find({
      status: { $in: ['open', 'in_progress'] }
    })
      .populate('patientId', 'firstName lastName hospitalId phone')
      .populate('doctorId', 'firstName lastName specialization')
      .sort({ createdAt: 1 });

    const priorityWeight: Record<string, number> = {
      'emergency': 1,
      'urgent': 2,
      'routine': 3
    };

    const sortedConsultations = activeConsultations.sort((a, b) => {
      const weightA = priorityWeight[a.priority || 'routine'] || 3;
      const weightB = priorityWeight[b.priority || 'routine'] || 3;
      if (weightA !== weightB) {
        return weightA - weightB;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return res.status(200).json({
      success: true,
      data: sortedConsultations
    });
  } catch (error) {
    next(error);
  }
});

// POST /appointments/:id/late-options - Fetch AI advice for late arrivals
router.post('/appointments/:id/late-options', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const valResult = lateOptionsSchema.safeParse(req.body);
    if (!valResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: valResult.error.errors[0].message }
      });
    }

    const { id } = req.params;
    const { arrivalTime } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { code: 'APPOINTMENT_NOT_FOUND', message: 'The requested appointment does not exist.' }
      });
    }

    const doctor = await Doctor.findById(appointment.doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: { code: 'DOCTOR_NOT_FOUND', message: 'Doctor not found.' }
      });
    }

    // Retrieve active bookings to calculate workload
    const workloadCount = await Appointment.countDocuments({
      doctorId: appointment.doctorId,
      appointmentDate: appointment.appointmentDate,
      status: { $ne: 'cancelled' }
    });

    // Call FastAPI agent for late arrival advice
    try {
      const url = `${config.aiServiceUrl}/api/v1/agent/reception/checkin/late-options`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentTime: appointment.appointmentTime,
          arrivalTime,
          doctorName: `${doctor.firstName} ${doctor.lastName}`,
          doctorWorkload: workloadCount
        }),
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const result = await response.json();
        return res.status(200).json({
          success: true,
          data: result
        });
      }
    } catch (aiError) {
      console.error("AI check-in options failed, using fallback:", aiError);
    }

    // Local fallback calculation
    let delay = 20;
    try {
      const [apptHour, apptMin] = appointment.appointmentTime.split(':').map(Number);
      const [arrHour, arrMin] = arrivalTime.split(':').map(Number);
      delay = (arrHour - apptHour) * 60 + (arrMin - apptMin);
    } catch {}

    let action = "proceed";
    let explanation = "";
    if (delay <= 15 && workloadCount < 4) {
      action = "proceed";
      explanation = `Patient is only ${delay} minutes late, and Dr. ${doctor.lastName} has a light workload. We can proceed with standard check-in.`;
    } else if (delay <= 30 && workloadCount < 6) {
      action = "queue_as_walkin";
      explanation = `Patient is ${delay} minutes late. Dr. ${doctor.lastName} is on schedule but busy; adding patient to wait queue as a walk-in is recommended.`;
    } else {
      action = "reschedule";
      explanation = `Patient arrived ${delay} minutes late. Because of the excessive delay or heavy workload (${workloadCount} bookings), please reschedule this appointment.`;
    }

    return res.status(200).json({
      success: true,
      data: {
        recommendedAction: action,
        explanation
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
