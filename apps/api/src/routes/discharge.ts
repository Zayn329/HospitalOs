import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Discharge from '../models/Discharge.js';
import Consultation from '../models/Consultation.js';
import Prescription from '../models/Prescription.js';
import Patient from '../models/Patient.js';
import AuditLog from '../models/AuditLog.js';
import { config } from '../config/env.js';

const router = Router();

// Zod Schemas
const createDischargeSchema = z.object({
  consultationId: z.string().min(1, "Consultation ID is required"),
  dischargeInstructions: z.string().min(1, "Discharge instructions are required"),
  followUpRecommendations: z.string().min(1, "Follow-up recommendations are required"),
  medications: z.array(z.string()).optional()
});

const draftDischargeSchema = z.object({
  consultationId: z.string().min(1, "Consultation ID is required")
});

// GET /discharges - List all discharges
router.get('/discharges', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await Discharge.find()
      .populate('patientId', 'firstName lastName hospitalId')
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
});

// POST /discharges - Create final approved discharge
router.post('/discharges', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const bodyResult = createDischargeSchema.safeParse(req.body);
    
    // Construct manual check for missing fields for detailed error payload
    const missingFields: string[] = [];
    if (!req.body.consultationId) missingFields.push('consultationId');
    if (!req.body.dischargeInstructions) missingFields.push('dischargeInstructions');
    if (!req.body.followUpRecommendations) missingFields.push('followUpRecommendations');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INCOMPLETE_DISCHARGE',
          message: `Discharge prevented due to missing required fields: ${missingFields.join(', ')}`,
          missingFields
        }
      });
    }

    if (!bodyResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: bodyResult.error.errors[0].message }
      });
    }

    const { consultationId, dischargeInstructions, followUpRecommendations, medications } = req.body;

    // Check duplication
    const existing = await Discharge.findOne({ consultationId });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE_DISCHARGE', message: 'A discharge has already been approved for this consultation.' }
      });
    }

    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return res.status(404).json({
        success: false,
        error: { code: 'CONSULTATION_NOT_FOUND', message: 'Consultation record not found.' }
      });
    }

    if (consultation.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: { code: 'CONSULTATION_NOT_COMPLETED', message: 'Cannot discharge patient if consultation is not completed.' }
      });
    }

    const newDischarge = new Discharge({
      patientId: consultation.patientId,
      consultationId: consultation._id,
      dischargeInstructions,
      medications: medications || [],
      followUpRecommendations,
      status: 'completed'
    });

    await newDischarge.save();

    // Update Patient Status
    await Patient.findByIdAndUpdate(consultation.patientId, {
      status: 'discharged'
    });

    // Audit Log
    const log = new AuditLog({
      actorId: 'discharge_staff_demo',
      action: 'APPROVE_DISCHARGE',
      details: `Approved patient discharge for patient ID: ${consultation.patientId}`,
      resource: 'Discharge',
      resourceId: newDischarge._id,
      metadata: {
        consultationId,
        patientId: consultation.patientId
      }
    });
    await log.save();

    return res.status(201).json({
      success: true,
      data: newDischarge,
      message: 'Patient discharged successfully.'
    });
  } catch (error) {
    next(error);
  }
});

// POST /discharges/draft - Generate AI draft instructions
router.post('/discharges/draft', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const valResult = draftDischargeSchema.safeParse(req.body);
    if (!valResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: valResult.error.errors[0].message }
      });
    }

    const { consultationId } = req.body;

    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return res.status(404).json({
        success: false,
        error: { code: 'CONSULTATION_NOT_FOUND', message: 'Consultation record not found.' }
      });
    }

    if (consultation.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: { code: 'CONSULTATION_NOT_COMPLETED', message: 'Consultation must be completed to draft discharge care.' }
      });
    }

    const prescription = await Prescription.findOne({ consultationId });
    const medications = prescription?.medications || [];

    let dischargeInstructions = "";
    let followUpRecommendations = "";

    try {
      const url = `${config.aiServiceUrl}/api/v1/agent/patient-care/discharge-instructions`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosis: consultation.diagnosis || 'General evaluation',
          treatment_plan: consultation.treatmentPlan || 'Routine clinical monitoring',
          medications
        }),
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const result = await response.json();
        dischargeInstructions = result.discharge_instructions;
        followUpRecommendations = result.follow_up_recommendations;
      }
    } catch (aiError) {
      console.error("AI Patient Care Agent draft failed, using fallback:", aiError);
      
      // Fallback local logic
      dischargeInstructions = (
        `1. Activity: Rest as tolerated. Resume normal activities gradually.\n` +
        `2. Diet: Drink plenty of fluids and maintain a balanced diet.\n` +
        `3. Medications: Take all prescribed medications (${medications.join(', ') || 'None'}) exactly as directed.\n` +
        `4. Warning Signs: Seek immediate medical care if you experience high fever, worsening pain, shortness of breath, or severe swelling.`
      );
      followUpRecommendations = `Please follow up with your doctor or clinical team in 1 week for re-evaluation.`;
    }

    return res.status(200).json({
      success: true,
      data: {
        consultationId,
        patientId: consultation.patientId,
        dischargeInstructions,
        medications,
        followUpRecommendations
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
