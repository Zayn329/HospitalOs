import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Bill from '../models/Bill.js';
import Consultation from '../models/Consultation.js';
import Doctor from '../models/Doctor.js';
import Prescription from '../models/Prescription.js';
import LabReport from '../models/LabReport.js';
import AuditLog from '../models/AuditLog.js';
import { config } from '../config/env.js';

const router = Router();

// Zod Schemas
const generateBillSchema = z.object({
  consultationId: z.string().min(1, "Consultation ID is required")
});

const processPaymentSchema = z.object({
  paymentAmount: z.number().positive("Payment amount must be positive")
});

const verifyInsuranceSchema = z.object({
  insuranceProvider: z.string().min(1, "Insurance provider is required"),
  policyNumber: z.string().min(1, "Policy number is required")
});

// GET /bills - List all bills
router.get('/bills', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await Bill.find()
      .populate('patientId', 'firstName lastName hospitalId')
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
});

// GET /bills/patient/:patientId - List bills for patient
router.get('/bills/patient/:patientId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    const list = await Bill.find({ patientId })
      .populate('consultationId', 'diagnosis status')
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
});

// POST /bills - Generate a bill
router.post('/bills', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const valResult = generateBillSchema.safeParse(req.body);
    if (!valResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: valResult.error.errors[0].message }
      });
    }

    const { consultationId } = req.body;

    // Check if bill already exists
    const existingBill = await Bill.findOne({ consultationId });
    if (existingBill) {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE_BILL', message: 'A bill has already been generated for this consultation.' }
      });
    }

    // Check consultation
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
        error: { code: 'CONSULTATION_NOT_COMPLETED', message: 'Cannot generate a bill for an uncompleted consultation.' }
      });
    }

    // Determine charges
    let consultationFee = 150; // default fee
    if (consultation.doctorId) {
      const doctor = await Doctor.findOne({ userId: consultation.doctorId });
      if (doctor && doctor.consultationFee) {
        consultationFee = doctor.consultationFee;
      }
    }

    let medicationFee = 0;
    const prescription = await Prescription.findOne({ consultationId });
    if (prescription && prescription.medications) {
      medicationFee = prescription.medications.length * 25; // $25 per medication
    }

    let laboratoryFee = 0;
    const labReports = await LabReport.find({ consultationId });
    if (labReports) {
      laboratoryFee = labReports.length * 50; // $50 per lab report
    }

    const totalAmount = consultationFee + medicationFee + laboratoryFee;

    const newBill = new Bill({
      patientId: consultation.patientId,
      consultationId: consultation._id,
      totalAmount,
      paymentStatus: 'pending',
      insuranceStatus: 'not_required'
    });

    await newBill.save();

    // Audit Log
    const log = new AuditLog({
      action: 'GENERATE_BILL',
      details: `Generated bill for patient: ${consultation.patientId}. Total: $${totalAmount}`,
      resource: 'Bill',
      resourceId: newBill._id,
      metadata: {
        consultationId,
        totalAmount,
        consultationFee,
        medicationFee,
        laboratoryFee
      }
    });
    await log.save();

    return res.status(201).json({
      success: true,
      data: newBill,
      message: 'Bill generated successfully.'
    });
  } catch (error) {
    next(error);
  }
});

// POST /bills/:id/pay - Process payment
router.post('/bills/:id/pay', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const valResult = processPaymentSchema.safeParse(req.body);
    if (!valResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: valResult.error.errors[0].message }
      });
    }

    const { paymentAmount } = req.body;

    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({
        success: false,
        error: { code: 'BILL_NOT_FOUND', message: 'Bill record not found.' }
      });
    }

    if (bill.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE_PAYMENT', message: 'This bill has already been paid.' }
      });
    }

    if (paymentAmount !== bill.totalAmount) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: `Payment amount must exactly match the bill total ($${bill.totalAmount}).` }
      });
    }

    bill.paymentStatus = 'paid';
    await bill.save();

    // Audit Log
    const log = new AuditLog({
      action: 'PROCESS_PAYMENT',
      details: `Processed payment of $${paymentAmount} for bill ID: ${bill._id}`,
      resource: 'Bill',
      resourceId: bill._id,
      metadata: {
        paymentAmount,
        billId: bill._id
      }
    });
    await log.save();

    // Generate receipt
    const receipt = {
      receiptNumber: `REC-${Date.now().toString().slice(-8)}`,
      billId: bill._id,
      totalAmount: bill.totalAmount,
      paymentStatus: bill.paymentStatus,
      paidAt: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      data: {
        bill,
        receipt
      },
      message: 'Payment processed successfully. Receipt generated.'
    });
  } catch (error) {
    next(error);
  }
});

// POST /bills/:id/explain - Explain billing charges via AI Billing Agent
router.post('/bills/:id/explain', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({
        success: false,
        error: { code: 'BILL_NOT_FOUND', message: 'Bill record not found.' }
      });
    }

    const consultation = await Consultation.findById(bill.consultationId);
    let consultationFee = 150;
    if (consultation && consultation.doctorId) {
      const doctor = await Doctor.findOne({ userId: consultation.doctorId });
      if (doctor && doctor.consultationFee) {
        consultationFee = doctor.consultationFee;
      }
    }

    const prescription = await Prescription.findOne({ consultationId: bill.consultationId });
    const medications = prescription?.medications || [];

    try {
      const url = `${config.aiServiceUrl}/api/v1/agent/billing/explain`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosis: consultation?.diagnosis || 'General Checkup',
          treatment_plan: consultation?.treatmentPlan || 'Routine clinical monitoring',
          medications,
          consultation_fee: consultationFee,
          total_amount: bill.totalAmount
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
      console.error("AI Billing Scribe explanation failed, using fallback:", aiError);
    }

    // Fallback explanation local
    const fallbackExp = `### Bill Breakdown (Local Fallback)\n\n* Consultation fee: $${consultationFee}.00\n* Medications: ${medications.length} items prescribed ($${medications.length * 25}.00)\n* Total: $${bill.totalAmount}.00`;
    return res.status(200).json({
      success: true,
      data: { explanation: fallbackExp }
    });
  } catch (error) {
    next(error);
  }
});

// POST /bills/:id/verify-insurance - Verify insurance claim via AI Billing Agent
router.post('/bills/:id/verify-insurance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const valResult = verifyInsuranceSchema.safeParse(req.body);
    if (!valResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: valResult.error.errors[0].message }
      });
    }

    const { insuranceProvider, policyNumber } = req.body;

    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({
        success: false,
        error: { code: 'BILL_NOT_FOUND', message: 'Bill record not found.' }
      });
    }

    const consultation = await Consultation.findById(bill.consultationId);
    const prescription = await Prescription.findOne({ consultationId: bill.consultationId });
    const medications = prescription?.medications || [];

    let isCovered = false;
    let explanation = "";
    let approvedAmount = 0;

    try {
      const url = `${config.aiServiceUrl}/api/v1/agent/billing/verify-insurance`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insurance_provider: insuranceProvider,
          policy_number: policyNumber,
          diagnosis: consultation?.diagnosis || 'General evaluation',
          treatment_plan: consultation?.treatmentPlan || 'Routine clinical monitoring',
          medications,
          total_amount: bill.totalAmount
        }),
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const result = await response.json();
        isCovered = result.is_covered;
        explanation = result.explanation;
        approvedAmount = result.approved_amount;
      }
    } catch (aiError) {
      console.error("AI Insurance Verification failed, using fallback:", aiError);
      isCovered = !insuranceProvider.toLowerCase().startsWith("uncovered");
      approvedAmount = isCovered ? bill.totalAmount * 0.8 : 0.0;
      explanation = isCovered 
        ? `Claim approved under 80% co-insurance coverage (Local Fallback)`
        : `Provider denied coverage (Local Fallback)`;
    }

    bill.insuranceStatus = isCovered ? 'approved' : 'rejected';
    await bill.save();

    // Audit Log
    const log = new AuditLog({
      action: 'INSURANCE_CLAIM_SUBMITTED',
      details: `Submitted insurance claim for Bill ID: ${bill._id}. Status: ${bill.insuranceStatus}`,
      resource: 'Bill',
      resourceId: bill._id,
      metadata: {
        insuranceProvider,
        policyNumber,
        isCovered,
        approvedAmount,
        explanation
      }
    });
    await log.save();

    return res.status(200).json({
      success: true,
      data: {
        bill,
        isCovered,
        approvedAmount,
        explanation
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
