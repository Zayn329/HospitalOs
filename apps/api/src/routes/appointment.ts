import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import { config } from '../config/env.js';

const router = Router();

// Zod Validation Schemas
const createAppointmentSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  doctorId: z.string().min(1, "Doctor ID is required"),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
  reason: z.string().optional(),
  appointmentType: z.enum(['consultation', 'follow_up', 'emergency', 'routine']).optional()
});

const rescheduleSchema = z.object({
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format")
});

const suggestSchema = z.object({
  doctorId: z.string().min(1, "Doctor ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  urgency: z.enum(['low', 'medium', 'high']).optional(),
  reason: z.string().optional(),
  appointmentType: z.string().optional()
});

// GET /doctors - Retrieve all doctors
router.get('/doctors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctors = await Doctor.find({ status: 'active' });
    return res.status(200).json({
      success: true,
      data: doctors
    });
  } catch (error) {
    next(error);
  }
});

// GET /appointments - Retrieve all appointments (populated)
router.get('/appointments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointments = await Appointment.find({})
      .populate('patientId', 'firstName lastName hospitalId phone')
      .populate('doctorId', 'firstName lastName specialization department')
      .sort({ appointmentDate: 1, appointmentTime: 1 });

    return res.status(200).json({
      success: true,
      data: appointments
    });
  } catch (error) {
    next(error);
  }
});

// POST /appointments - Book an appointment
router.post('/appointments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createAppointmentSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message }
      });
    }

    const { patientId, doctorId, appointmentDate, appointmentTime, reason, appointmentType } = req.body;

    // Check doctor and patient existence
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: { code: 'DOCTOR_NOT_FOUND', message: 'The selected doctor does not exist.' }
      });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: { code: 'PATIENT_NOT_FOUND', message: 'The selected patient does not exist.' }
      });
    }

    // Enforce no double-booking for the doctor
    const doctorConflict = await Appointment.findOne({
      doctorId,
      appointmentDate,
      appointmentTime,
      status: { $ne: 'cancelled' }
    });

    if (doctorConflict) {
      const activeBookings = await Appointment.find({
        doctorId,
        appointmentDate,
        status: { $ne: 'cancelled' }
      });
      const bookedTimes = activeBookings.map(b => b.appointmentTime);
      const alternatives = doctor.availability.filter(slot => !bookedTimes.includes(slot));

      return res.status(409).json({
        success: false,
        error: {
          code: 'DOUBLE_BOOKING',
          message: `Dr. ${doctor.lastName} is already booked at ${appointmentTime} on ${appointmentDate}.`,
          alternatives
        }
      });
    }

    // Enforce no double-booking for the patient
    const patientConflict = await Appointment.findOne({
      patientId,
      appointmentDate,
      appointmentTime,
      status: { $ne: 'cancelled' }
    });

    if (patientConflict) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'PATIENT_CONFLICT',
          message: 'This patient already has an appointment scheduled at this time slot.'
        }
      });
    }

    const newAppointment = new Appointment({
      patientId,
      doctorId,
      appointmentDate,
      appointmentTime,
      reason,
      appointmentType,
      status: 'confirmed'
    });

    await newAppointment.save();

    // Populate before returning
    const populated = await Appointment.findById(newAppointment._id)
      .populate('patientId', 'firstName lastName hospitalId')
      .populate('doctorId', 'firstName lastName specialization');

    return res.status(201).json({
      success: true,
      data: populated,
      message: 'Appointment scheduled successfully.'
    });
  } catch (error) {
    next(error);
  }
});

// PUT /appointments/:id - Reschedule an appointment
router.put('/appointments/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = rescheduleSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: validationResult.error.errors[0].message }
      });
    }

    const { id } = req.params;
    const { appointmentDate, appointmentTime } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { code: 'APPOINTMENT_NOT_FOUND', message: 'The requested appointment does not exist.' }
      });
    }

    // Ensure slot is not double booked on reschedule
    const conflict = await Appointment.findOne({
      doctorId: appointment.doctorId,
      appointmentDate,
      appointmentTime,
      status: { $ne: 'cancelled' },
      _id: { $ne: id }
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DOUBLE_BOOKING',
          message: 'The selected time slot is already booked for this doctor.'
        }
      });
    }

    appointment.appointmentDate = appointmentDate;
    appointment.appointmentTime = appointmentTime;
    appointment.status = 'confirmed'; // reset to confirmed if it was requested

    await appointment.save();

    const populated = await Appointment.findById(id)
      .populate('patientId', 'firstName lastName hospitalId')
      .populate('doctorId', 'firstName lastName specialization');

    return res.status(200).json({
      success: true,
      data: populated,
      message: 'Appointment rescheduled successfully.'
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /appointments/:id/cancel - Cancel an appointment
router.patch('/appointments/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { code: 'APPOINTMENT_NOT_FOUND', message: 'The requested appointment does not exist.' }
      });
    }

    const originalTime = appointment.appointmentTime;
    const originalDate = appointment.appointmentDate;
    const doctorId = appointment.doctorId;

    appointment.status = 'cancelled';
    await appointment.save();

    const populated = await Appointment.findById(id)
      .populate('patientId', 'firstName lastName hospitalId')
      .populate('doctorId', 'firstName lastName specialization department');

    const doctor = populated?.doctorId as any;

    // Find other active appointments scheduled for the same doctor and same day but at a later time
    const laterAppointments = await Appointment.find({
      doctorId,
      appointmentDate: originalDate,
      status: 'confirmed',
      appointmentTime: { $gt: originalTime }
    }).populate('patientId', 'firstName lastName hospitalId');

    const rescheduleRecommendations = laterAppointments.map(appt => ({
      appointmentId: appt._id,
      patientName: `${(appt.patientId as any).firstName} ${(appt.patientId as any).lastName}`,
      currentTime: appt.appointmentTime,
      recommendedTime: originalTime,
      reason: `Dr. ${doctor?.lastName || 'doctor'}'s earlier slot at ${originalTime} became available due to cancellation.`
    }));

    return res.status(200).json({
      success: true,
      data: populated,
      rescheduleRecommendations,
      message: 'Appointment cancelled successfully. Time slot is now open.'
    });
  } catch (error) {
    next(error);
  }
});

// POST /appointments/suggest - Call FastAPI Reception Agent for slots advice
router.post('/appointments/suggest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const valResult = suggestSchema.safeParse(req.body);
    if (!valResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: valResult.error.errors[0].message }
      });
    }

    const { doctorId, date, urgency, reason, appointmentType } = req.body;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: { code: 'DOCTOR_NOT_FOUND', message: 'Doctor not found.' }
      });
    }

    // Get active booked slots for the doctor on that date
    const bookedAppointments = await Appointment.find({
      doctorId,
      appointmentDate: date,
      status: { $ne: 'cancelled' }
    });

    // Map to the shape FastAPI expects
    const existingAppointments = bookedAppointments.map(appt => ({
      appointmentTime: appt.appointmentTime,
      status: appt.status
    }));

    // Invoke FastAPI AI Reception Agent
    const url = `${config.aiServiceUrl}/api/v1/agent/reception/suggest`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorId: doctor._id.toString(),
        doctorName: `${doctor.firstName} ${doctor.lastName}`,
        specialization: doctor.specialization,
        department: doctor.department,
        date,
        availability: doctor.availability,
        existingAppointments,
        urgency: urgency || 'low',
        reason: reason || '',
        appointmentType: appointmentType || 'consultation'
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`AI service responded with HTTP status ${response.status}`);
    }

    const result = await response.json();

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("AI slot suggestion fetch failed:", error);
    // Graceful fallback: local slot calculation without AI message if offline
    try {
      const { doctorId, date } = req.body;
      const doctor = await Doctor.findById(doctorId);
      if (doctor) {
        const booked = await Appointment.find({ doctorId, appointmentDate: date, status: { $ne: 'cancelled' } });
        const bookedTimes = booked.map(b => b.appointmentTime);
        const available = doctor.availability.filter(slot => !bookedTimes.includes(slot));
        return res.status(200).json({
          success: true,
          data: {
            availableSlots: available,
            bookedSlots: bookedTimes,
            recommendation: `(Fallback Mode) Local check complete. Dr. ${doctor.firstName} ${doctor.lastName} has availability: ${available.join(', ')}.`
          }
        });
      }
    } catch (fallbackError) {
      // ignore
    }
    next(error);
  }
});

export default router;
