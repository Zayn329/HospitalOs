import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Consultation from '../models/Consultation.js';
import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import Prescription from '../models/Prescription.js';
import AuditLog from '../models/AuditLog.js';
import { config } from '../config/env.js';

const router = Router();

// Zod Validation Schemas
const startSchema = z.object({});

const scribeSchema = z.object({
  symptoms: z.array(z.string()),
  findings: z.string().min(1, "Findings text is required"),
  treatment: z.string().min(1, "Treatment plan is required")
});

const completeSchema = z.object({
  diagnosis: z.string().min(1, "Diagnosis is required"),
  findings: z.string().min(1, "Findings are required"),
  treatmentPlan: z.string().min(1, "Treatment plan is required"),
  soapNotes: z.object({
    subjective: z.string(),
    objective: z.string(),
    assessment: z.string(),
    plan: z.string()
  }),
  medications: z.array(z.string()).optional(),
  instructions: z.string().optional(),
  allergyOverrideReason: z.string().optional()
});

// GET /consultations - Retrieve all consultations
router.get('/consultations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await Consultation.find()
      .populate('patientId', 'firstName lastName hospitalId phone')
      .populate('doctorId', 'firstName lastName specialization')
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      data: list
    });
  } catch (error) {
    next(error);
  }
});

// POST /consultations/:id/start - Open a consultation and retrieve context
router.post('/consultations/:id/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const consultation = await Consultation.findById(id);
    if (!consultation) {
      return res.status(404).json({
        success: false,
        error: { code: 'CONSULTATION_NOT_FOUND', message: 'Consultation record not found.' }
      });
    }

    // Prevent double consultation starting if already completed
    if (consultation.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_COMPLETED', message: 'This consultation is already completed.' }
      });
    }

    // Update status to in_progress
    consultation.status = 'in_progress';
    await consultation.save();

    // Fetch clinical context
    const patient = await Patient.findById(consultation.patientId);
    
    // Retrieve past prescriptions
    const pastPrescriptions = await Prescription.find({ patientId: consultation.patientId });

    // Retrieve past completed consultations
    const pastConsultations = await Consultation.find({
      patientId: consultation.patientId,
      status: 'completed',
      _id: { $ne: consultation._id }
    }).sort({ createdAt: -1 });

    // Mock laboratory results
    const mockLabResults = [
      { testName: 'Complete Blood Count (CBC)', result: 'Normal', date: '2026-06-01' },
      { testName: 'Lipid Panel', result: 'Cholesterol slightly elevated (210 mg/dL)', date: '2026-06-01' }
    ];

    return res.status(200).json({
      success: true,
      data: {
        consultation,
        patient: {
          firstName: patient?.firstName,
          lastName: patient?.lastName,
          allergies: patient?.allergies || [],
          medicalHistory: patient?.medicalHistory || []
        },
        pastPrescriptions,
        pastConsultations,
        labResults: mockLabResults
      },
      message: 'Consultation opened. Patient clinical context loaded.'
    });
  } catch (error) {
    next(error);
  }
});

// POST /consultations/:id/scribe - Consult AI Scribe to restructure findings into SOAP
router.post('/consultations/:id/scribe', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const valResult = scribeSchema.safeParse(req.body);
    if (!valResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: valResult.error.errors[0].message }
      });
    }

    const { symptoms, findings, treatment } = req.body;

    try {
      const url = `${config.aiServiceUrl}/api/v1/agent/consultation/soap-notes`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms, findings, treatment }),
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
      console.error("AI Scribe failed, using fallback:", aiError);
    }

    // Local fallback
    return res.status(200).json({
      success: true,
      data: {
        subjective: `Patient reports presenting symptoms of: ${symptoms.join(', ')}.`,
        objective: `Clinical findings recorded: ${findings}.`,
        assessment: `Symptom report and evaluation suggest primary diagnostic findings of interest.`,
        plan: `Outline: ${treatment}`
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /consultations/:id/complete - Complete the consultation, review allergies, save prescription, update history
router.post('/consultations/:id/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const valResult = completeSchema.safeParse(req.body);
    if (!valResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: valResult.error.errors[0].message }
      });
    }

    const { id } = req.params;
    const { diagnosis, findings, treatmentPlan, soapNotes, medications, instructions, allergyOverrideReason } = req.body;

    const consultation = await Consultation.findById(id);
    if (!consultation) {
      return res.status(404).json({
        success: false,
        error: { code: 'CONSULTATION_NOT_FOUND', message: 'Consultation record not found.' }
      });
    }

    const patient = await Patient.findById(consultation.patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: { code: 'PATIENT_NOT_FOUND', message: 'Patient profile not found.' }
      });
    }

    // 1. Cross-reference allergies, interactions, and duplicates if medications are proposed
    if (medications && medications.length > 0) {
      const patientAllergies = patient.allergies || [];
      let warnings: string[] = [];

      // Retrieve patient's existing active medications from active prescriptions
      const activePrescriptions = await Prescription.find({
        patientId: consultation.patientId,
        status: 'active'
      });
      const currentMedications = activePrescriptions.flatMap(p => p.medications);

      try {
        const url = `${config.aiServiceUrl}/api/v1/agent/medication-safety/check`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ allergies: patientAllergies, medications, current_medications: currentMedications }),
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
          const result = await response.json();
          if (result.isConflict) {
            warnings = result.warnings;
          }
        }
      } catch (aiError) {
        // Fallback local allergy, interaction, and duplicate validation logic
        for (const med of medications) {
          const medLower = med.toLowerCase();
          for (const allergy of patientAllergies) {
            const allLower = allergy.toLowerCase();
            if (allLower.includes(medLower) || medLower.includes(allLower)) {
              warnings.push(`Direct match conflict: Prescribed medication '${med}' matches patient allergen '${allergy}'.`);
            } else if (allLower.includes("penicillin") && (medLower.includes("amoxicillin") || medLower.includes("ampicillin"))) {
              warnings.push(`Class Cross-Reactivity warning: Penicillin allergen reacts with prescribed '${med}'.`);
            }
          }

          for (const curr of currentMedications) {
            const currLower = curr.toLowerCase();
            if (currLower.includes("warfarin") && (medLower.includes("aspirin") || medLower.includes("ibuprofen"))) {
              warnings.push(`Drug-Drug Interaction: Prescribing '${med}' alongside '${curr}' increases bleeding risk.`);
            } else if (medLower.includes("warfarin") && (currLower.includes("aspirin") || currLower.includes("ibuprofen"))) {
              warnings.push(`Drug-Drug Interaction: Prescribing '${med}' alongside '${curr}' increases bleeding risk.`);
            } else if (currLower.includes("lisinopril") && medLower.includes("spironolactone")) {
              warnings.push(`Drug-Drug Interaction: Prescribing '${med}' alongside '${curr}' increases hyperkalemia risk.`);
            } else if (medLower.includes("lisinopril") && currLower.includes("spironolactone")) {
              warnings.push(`Drug-Drug Interaction: Prescribing '${med}' alongside '${curr}' increases hyperkalemia risk.`);
            }

            const medClean = med.split(' ')[0].toLowerCase();
            const currClean = curr.split(' ')[0].toLowerCase();
            if (medClean === currClean) {
              warnings.push(`Duplicate Medication: Patient is already prescribed '${curr}' which duplicates proposed '${med}'.`);
            } else if ((medClean === 'ibuprofen' || medClean === 'naproxen' || medClean === 'aspirin') &&
                       (currClean === 'ibuprofen' || currClean === 'naproxen' || currClean === 'aspirin')) {
              warnings.push(`Therapeutic Duplication: Both '${med}' and '${curr}' are NSAIDs. Avoid co-prescribing.`);
            }
          }
        }
      }

      // If warnings exist and override is missing, block completion
      if (warnings.length > 0 && !allergyOverrideReason) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ALLERGY_CONFLICT',
            message: 'Medication conflict with documented patient allergies.',
            warnings
          }
        });
      }

      // If override reason is provided, log to audit trail
      if (warnings.length > 0 && allergyOverrideReason) {
        const log = new AuditLog({
          actorId: 'doctor_demo',
          action: 'OVERRIDE_ALLERGY_WARNING',
          resource: 'Consultation',
          resourceId: id,
          details: `Allergy warnings overridden for patient: ${patient.firstName} ${patient.lastName}. Reason: ${allergyOverrideReason}`,
          metadata: {
            consultationId: id,
            patientId: patient._id.toString(),
            warnings,
            overrideReason: allergyOverrideReason
          }
        });
        await log.save();
      }

      // Create Active Prescription
      const newPrescription = new Prescription({
        consultationId: id,
        patientId: consultation.patientId,
        medications,
        instructions: instructions || 'Take as directed.',
        status: 'active'
      });
      await newPrescription.save();
    }

    // 2. Update Consultation record
    consultation.status = 'completed';
    consultation.diagnosis = diagnosis;
    consultation.findings = findings;
    consultation.treatmentPlan = treatmentPlan;
    consultation.soapNotes = soapNotes;
    if (allergyOverrideReason) {
      consultation.allergyOverrideReason = allergyOverrideReason;
    }
    await consultation.save();

    // 3. Update Patient's medicalHistory record
    await Patient.findByIdAndUpdate(consultation.patientId, {
      $addToSet: { medicalHistory: diagnosis }
    });

    // 4. Update linked Appointment status to completed
    if (consultation.appointmentId) {
      await Appointment.findByIdAndUpdate(consultation.appointmentId, {
        status: 'completed'
      });
    }

    return res.status(200).json({
      success: true,
      data: consultation,
      message: 'Consultation completed successfully. Records updated.'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
