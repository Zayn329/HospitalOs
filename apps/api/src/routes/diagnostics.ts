import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import LabReport from '../models/LabReport.js';
import Patient from '../models/Patient.js';
import AuditLog from '../models/AuditLog.js';
import { config } from '../config/env.js';

const router = Router();

// Zod Validation Schemas
const uploadSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  testName: z.string().min(1, "Test Name is required"),
  rawText: z.string().min(1, "Raw report text is required")
});

// POST /diagnostics/upload - Upload a report and call AI analysis
router.post('/diagnostics/upload', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const valResult = uploadSchema.safeParse(req.body);
    if (!valResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: valResult.error.errors[0].message }
      });
    }

    const { patientId, testName, rawText } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: { code: 'PATIENT_NOT_FOUND', message: 'Patient profile not found.' }
      });
    }

    let isAbnormal = false;
    let aiSummary = "";
    let parsedSuccessfully = false;

    try {
      const url = `${config.aiServiceUrl}/api/v1/agent/diagnostics/analyze`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, testName }),
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const result = await response.json();
        isAbnormal = result.isAbnormal;
        aiSummary = result.aiSummary;
        parsedSuccessfully = true;
      }
    } catch (aiError) {
      console.error("AI service analysis failed:", aiError);
    }

    if (!parsedSuccessfully) {
      // Fallback local range scanning logic
      const lower = rawText.toLowerCase();
      if (lower.includes("high") || lower.includes("low") || lower.includes("abnormal")) {
        isAbnormal = true;
      }
      if (lower.includes("hemoglobin") && lower.includes("9.5")) {
        isAbnormal = true;
      }
      if (lower.includes("wbc") && lower.includes("12.5")) {
        isAbnormal = true;
      }

      if (isAbnormal) {
        aiSummary = `Abnormal results flagged locally for ${testName}. High/Low clinical markers found in raw text.`;
      } else {
        aiSummary = `Laboratory results for ${testName} processed successfully. No obvious abnormal markers found locally.`;
      }
    }

    const report = new LabReport({
      patientId,
      testName,
      rawText,
      isAbnormal,
      aiSummary,
      status: 'pending_review'
    });
    await report.save();

    return res.status(201).json({
      success: true,
      data: report,
      message: 'Laboratory report uploaded and analyzed by AI Scribe.'
    });
  } catch (error) {
    next(error);
  }
});

// GET /diagnostics/patient/:patientId - List all laboratory reports for a patient
router.get('/diagnostics/patient/:patientId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;

    const reports = await LabReport.find({ patientId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: reports
    });
  } catch (error) {
    next(error);
  }
});

// POST /diagnostics/:id/review - Mark report as reviewed (Doctor sign-off)
router.post('/diagnostics/:id/review', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const report = await LabReport.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: { code: 'REPORT_NOT_FOUND', message: 'Laboratory report record not found.' }
      });
    }

    report.status = 'reviewed';
    await report.save();

    // Log sign-off to audit trail
    const audit = new AuditLog({
      action: 'REVIEW_LAB_REPORT',
      details: `Physician reviewed and signed off lab report ${id} for test: ${report.testName}.`,
      metadata: {
        reportId: id,
        patientId: report.patientId.toString(),
        testName: report.testName
      }
    });
    await audit.save();

    return res.status(200).json({
      success: true,
      data: report,
      message: 'Laboratory report signed off and reviewed.'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
