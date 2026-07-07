import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Patient from '../models/Patient.js';

const router = Router();

// Zod Schema for validation based on contracts/patient.yaml
const patientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  gender: z.string().min(1, "Gender is required"),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date of birth format"
  }),
  phone: z.string().min(5, "Phone number must be at least 5 digits"),
  email: z.string().email("Invalid email format").optional().or(z.literal('')),
  address: z.string().optional(),
  bloodGroup: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  emergencyContact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    relationship: z.string().optional()
  }).optional(),
  medicalHistory: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive']).optional()
});

// Middleware for validation
const validatePatientPayload = (req: Request, res: Response, next: NextFunction) => {
  const result = patientSchema.safeParse(req.body);
  if (!result.success) {
    const errorDetails = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Required information is missing or invalid.',
        details: errorDetails
      }
    });
  }
  next();
};

// POST /patients - Register patient
router.post('/patients', validatePatientPayload, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = req.body;
    
    // Prevent duplicate registrations
    const existingPatient = await Patient.findOne({ phone: phone.trim() });
    if (existingPatient) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_PATIENT',
          message: `A patient with the phone number '${phone}' already exists.`,
          existingPatient: {
            hospitalId: existingPatient.hospitalId,
            firstName: existingPatient.firstName,
            lastName: existingPatient.lastName,
            phone: existingPatient.phone
          }
        }
      });
    }

    const patientData = {
      ...req.body,
      dateOfBirth: new Date(req.body.dateOfBirth),
      phone: req.body.phone.trim()
    };

    const newPatient = new Patient(patientData);
    await newPatient.save();

    return res.status(201).json({
      success: true,
      data: newPatient,
      message: 'Patient registered successfully.'
    });
  } catch (error) {
    next(error);
  }
});

// GET /patients - Retrieve all patients
router.get('/patients', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patients = await Patient.find({}).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      data: patients,
      message: 'Patients retrieved successfully.'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
