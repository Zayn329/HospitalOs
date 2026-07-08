import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Consultation from '../models/Consultation.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import Doctor from '../models/Doctor.js';
import { config } from '../config/env.js';

const router = Router();

// Zod Validation Schemas
const evaluateSchema = z.object({
  symptoms: z.string().min(1, "Symptoms text is required")
});

const confirmSchema = z.object({
  consultationId: z.string().min(1, "Consultation ID is required"),
  priority: z.enum(['emergency', 'urgent', 'routine']),
  triageNotes: z.string().optional(),
  isOverride: z.boolean(),
  overrideReason: z.string().optional(),
  suggestedPriority: z.enum(['emergency', 'urgent', 'routine']).optional()
});

// POST /triage/evaluate - Evaluate symptoms using AI Triage advisor
router.post('/triage/evaluate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const valResult = evaluateSchema.safeParse(req.body);
    if (!valResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: valResult.error.errors[0].message }
      });
    }

    const { symptoms } = req.body;

    // Contact FastAPI AI service for symptom evaluation
    try {
      const url = `${config.aiServiceUrl}/api/v1/agent/reception/triage/evaluate`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms }),
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
      console.error("AI triage evaluation request failed, using fallback:", aiError);
    }

    // Local rule-based fallback
    const symptomsLower = symptoms.toLowerCase();
    
    if (symptoms.trim().length < 12 || symptomsLower === "feels sick" || symptomsLower === "sick") {
      return res.status(200).json({
        success: true,
        data: {
          priority: 'routine',
          explanation: 'The provided symptom description is too brief or non-specific to make an accurate priority assessment.',
          suggestedQuestions: [
            "What specific symptoms are you experiencing?",
            "How long have you been experiencing this?",
            "Do you have a fever, chest pain, or shortness of breath?"
          ],
          insufficientInfo: true
        }
      });
    }

    const emergencyKeywords = ["chest pain", "shortness of breath", "breathing", "unconscious", "stroke", "bleeding", "crushing", "heart", "severe pain"];
    const urgentKeywords = ["fever", "vomiting", "abdominal pain", "fracture", "dizzy", "infection", "headache", "asthma"];
    
    const isEmergency = emergencyKeywords.some(k => symptomsLower.includes(k));
    const isUrgent = urgentKeywords.some(k => symptomsLower.includes(k));

    let priority = 'routine';
    let explanation = 'Symptoms are mild and suitable for standard outpatient care schedule.';
    let questions = ["How long has this been occurring?", "Have you taken any over-the-counter medication?"];

    if (isEmergency) {
      priority = 'emergency';
      explanation = 'Symptoms indicate high risk of cardiorespiratory distress or acute critical conditions requiring immediate attention.';
      questions = ["When did the symptoms start?", "Do you feel dizzy or lightheaded?", "Is there radiating pain to the arm or jaw?"];
    } else if (isUrgent) {
      priority = 'urgent';
      explanation = 'Symptoms are concerning and require prompt evaluation, but do not appear immediately life-threatening.';
      questions = ["What is your body temperature?", "Are you able to keep fluids down?", "How severe is the pain on a 1-10 scale?"];
    }

    return res.status(200).json({
      success: true,
      data: {
        priority,
        explanation,
        suggestedQuestions: questions,
        insufficientInfo: false
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /triage/confirm - Confirm triage priority for a consultation
router.post('/triage/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const valResult = confirmSchema.safeParse(req.body);
    if (!valResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: valResult.error.errors[0].message }
      });
    }

    const { consultationId, priority, triageNotes, isOverride, overrideReason, suggestedPriority } = req.body;

    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return res.status(404).json({
        success: false,
        error: { code: 'CONSULTATION_NOT_FOUND', message: 'Triage failed. consultation record not found.' }
      });
    }

    // Save triage updates
    consultation.priority = priority;
    consultation.triageNotes = triageNotes || '';
    consultation.triageAIEvaluated = true;
    await consultation.save();

    // Alert medical staff if emergency priority
    let alertNotification = null;
    if (priority === 'emergency') {
      alertNotification = new Notification({
        recipientId: consultation.doctorId.toString(),
        type: 'EMERGENCY_ALERT',
        title: 'CRITICAL: Emergency Patient Checked In',
        message: `Emergency triage alert. A patient with critical symptoms has checked in.`,
        status: 'unread'
      });
      await alertNotification.save();
    }

    // Log administrative override if triggered
    if (isOverride) {
      const log = new AuditLog({
        action: 'OVERRIDE_TRIAGE_PRIORITY',
        details: `Triage priority overridden to ${priority}. Reason: ${overrideReason || 'Not provided'}`,
        metadata: {
          consultationId,
          suggestedPriority,
          confirmedPriority: priority,
          overrideReason
        }
      });
      await log.save();
    }

    return res.status(200).json({
      success: true,
      data: {
        consultation,
        notification: alertNotification
      },
      message: 'Triage priority confirmed successfully.'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
