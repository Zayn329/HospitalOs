import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Consultation from '../models/Consultation.js';
import AuditLog from '../models/AuditLog.js';
import { config } from '../config/env.js';

const router = Router();

// Zod Validation Schemas
const editSchema = z.object({
  diagnosis: z.string().min(1, "Diagnosis is a mandatory field and cannot be empty."),
  findings: z.string().min(1, "Findings are a mandatory field and cannot be empty."),
  treatmentPlan: z.string().min(1, "Treatment Plan is a mandatory field and cannot be empty."),
  soapNotes: z.object({
    subjective: z.string(),
    objective: z.string(),
    assessment: z.string(),
    plan: z.string()
  })
});

const enhanceSchema = z.object({
  findings: z.string().min(1, "Findings are required for AI enhancement."),
  treatment: z.string().min(1, "Treatment plan is required for AI enhancement.")
});

// GET /consultations/:id/history - Retrieve notes edit revision history
router.get('/consultations/:id/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const logs = await AuditLog.find({
      action: 'UPDATE_CONSULTATION_NOTES',
      'metadata.consultationId': id
    }).sort({ timestamp: -1 });

    return res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    next(error);
  }
});

// POST /consultations/:id/edit - Update completed notes and save version to audit log
router.post('/consultations/:id/edit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const valResult = editSchema.safeParse(req.body);
    if (!valResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: valResult.error.errors[0].message }
      });
    }

    const { id } = req.params;
    const { diagnosis, findings, treatmentPlan, soapNotes } = req.body;

    const consultation = await Consultation.findById(id);
    if (!consultation) {
      return res.status(404).json({
        success: false,
        error: { code: 'CONSULTATION_NOT_FOUND', message: 'Consultation record not found.' }
      });
    }

    // Check if anything actually changed (idempotency check)
    const hasChanges = 
      consultation.diagnosis !== diagnosis ||
      consultation.findings !== findings ||
      consultation.treatmentPlan !== treatmentPlan ||
      consultation.soapNotes?.subjective !== soapNotes.subjective ||
      consultation.soapNotes?.objective !== soapNotes.objective ||
      consultation.soapNotes?.assessment !== soapNotes.assessment ||
      consultation.soapNotes?.plan !== soapNotes.plan;

    if (hasChanges) {
      // Archive previous version in AuditLog
      const log = new AuditLog({
        action: 'UPDATE_CONSULTATION_NOTES',
        details: `Edited clinical documentation for consultation ${id}.`,
        metadata: {
          consultationId: id,
          previousState: {
            diagnosis: consultation.diagnosis || '',
            findings: consultation.findings || '',
            treatmentPlan: consultation.treatmentPlan || '',
            soapNotes: consultation.soapNotes || { subjective: '', objective: '', assessment: '', plan: '' }
          },
          newState: {
            diagnosis,
            findings,
            treatmentPlan,
            soapNotes
          }
        }
      });
      await log.save();

      // Save new clinical notes
      consultation.diagnosis = diagnosis;
      consultation.findings = findings;
      consultation.treatmentPlan = treatmentPlan;
      consultation.soapNotes = soapNotes;
      await consultation.save();
    }

    return res.status(200).json({
      success: true,
      data: consultation,
      message: 'Consultation notes updated successfully.'
    });
  } catch (error) {
    next(error);
  }
});

// POST /consultations/:id/enhance - Enhance draft notes using AI Medical Scribe
router.post('/consultations/:id/enhance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const valResult = enhanceSchema.safeParse(req.body);
    if (!valResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: valResult.error.errors[0].message }
      });
    }

    const { id } = req.params;
    const { findings, treatment } = req.body;

    const consultation = await Consultation.findById(id);
    if (!consultation) {
      return res.status(404).json({
        success: false,
        error: { code: 'CONSULTATION_NOT_FOUND', message: 'Consultation record not found.' }
      });
    }

    // Call FastAPI Agent to enhance notes
    try {
      const url = `${config.aiServiceUrl}/api/v1/agent/consultation/enhance`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: consultation.symptoms || ['General assessment'],
          findings,
          treatment
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
      console.error("AI notes enhancement failed, using fallback:", aiError);
    }

    // Fallback notes enhancement
    return res.status(200).json({
      success: true,
      data: {
        subjective: `Patient reports presenting symptoms of: ${(consultation.symptoms || []).join(', ') || 'General assessment'}.`,
        objective: `Polished Evaluation: Physical examination demonstrates ${findings}.`,
        assessment: `Enhanced Assessment: Findings correlate with documented clinical status.`,
        plan: `Recommended Action: Proceed with follow-up: ${treatment}.`
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
