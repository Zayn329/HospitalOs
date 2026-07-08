import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Patient from '../models/Patient.js';
import AuditLog from '../models/AuditLog.js';
import { config } from '../config/env.js';

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
  status: z.enum(['active', 'inactive']).optional(),
  overrideDuplicate: z.boolean().optional()
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
    const { phone, overrideDuplicate } = req.body;
    
    // 1. If override flag is set, skip duplicate checks and save immediately
    if (overrideDuplicate === true) {
      const patientData = {
        ...req.body,
        dateOfBirth: new Date(req.body.dateOfBirth),
        phone: req.body.phone.trim()
      };

      const newPatient = new Patient(patientData);
      await newPatient.save();

      // Record override in the audit log
      const audit = new AuditLog({
        actorId: 'receptionist_demo',
        action: 'OVERRIDE_DUPLICATE_REGISTRATION',
        resource: 'Patient',
        resourceId: newPatient._id.toString(),
        metadata: {
          firstName: newPatient.firstName,
          lastName: newPatient.lastName,
          phone: newPatient.phone,
          overriddenAt: new Date()
        }
      });
      await audit.save();

      return res.status(201).json({
        success: true,
        data: newPatient,
        message: 'Patient registered successfully (override logged).'
      });
    }

    // 2. Query potential candidates from MongoDB
    const searchDob = new Date(req.body.dateOfBirth);
    const candidates = await Patient.find({
      $or: [
        { phone: phone.trim() },
        { dateOfBirth: searchDob },
        { firstName: { $regex: new RegExp('^' + req.body.firstName + '$', 'i') } },
        { lastName: { $regex: new RegExp('^' + req.body.lastName + '$', 'i') } }
      ]
    });

    // 3. Perform duplicate validation checks
    if (candidates.length > 0) {
      try {
        const url = `${config.aiServiceUrl}/api/v1/agent/reception/patient/duplicate-check`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newPatient: {
              firstName: req.body.firstName,
              lastName: req.body.lastName,
              phone: phone.trim(),
              dateOfBirth: req.body.dateOfBirth,
              gender: req.body.gender,
              address: req.body.address || ''
            },
            existingPatients: candidates.map(c => ({
              hospitalId: c.hospitalId,
              firstName: c.firstName,
              lastName: c.lastName,
              phone: c.phone,
              dateOfBirth: c.dateOfBirth.toISOString().split('T')[0],
              gender: c.gender,
              address: c.address || ''
            }))
          }),
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
          const checkResult = await response.json();
          if (checkResult.isPotentialDuplicate && checkResult.matches.length > 0) {
            // Check for exact phone duplicate first
            const exactPhoneMatch = checkResult.matches.find((m: any) => m.phone === phone.trim());
            if (exactPhoneMatch) {
              return res.status(409).json({
                success: false,
                error: {
                  code: 'DUPLICATE_PATIENT',
                  message: `A patient with the phone number '${phone}' already exists.`,
                  existingPatient: exactPhoneMatch
                }
              });
            }

            return res.status(409).json({
              success: false,
              error: {
                code: 'POTENTIAL_DUPLICATE',
                message: 'Potential duplicate patients detected.',
                matches: checkResult.matches
              }
            });
          }
        }
      } catch (aiError) {
        console.error("AI duplicate check failed, using fallback:", aiError);
        // Fallback rule-based matching
        const matches = [];
        for (const cand of candidates) {
          const nameMatch = cand.firstName.toLowerCase() === req.body.firstName.toLowerCase() && cand.lastName.toLowerCase() === req.body.lastName.toLowerCase();
          const dobMatch = cand.dateOfBirth.toISOString().split('T')[0] === req.body.dateOfBirth.split('T')[0];
          const phoneMatch = cand.phone === phone.trim();
          
          if (phoneMatch) {
            return res.status(409).json({
              success: false,
              error: {
                code: 'DUPLICATE_PATIENT',
                message: `A patient with the phone number '${phone}' already exists.`,
                existingPatient: {
                  hospitalId: cand.hospitalId,
                  firstName: cand.firstName,
                  lastName: cand.lastName,
                  phone: cand.phone
                }
              }
            });
          }
          
          if (nameMatch || (cand.firstName.toLowerCase() === req.body.firstName.toLowerCase() && dobMatch)) {
            matches.push({
              hospitalId: cand.hospitalId,
              firstName: cand.firstName,
              lastName: cand.lastName,
              phone: cand.phone,
              dateOfBirth: cand.dateOfBirth.toISOString().split('T')[0],
              confidence: nameMatch && dobMatch ? 0.95 : 0.8,
              reasons: [nameMatch ? "Exact name match." : "Matching first name and date of birth."]
            });
          }
        }

        if (matches.length > 0) {
          return res.status(409).json({
            success: false,
            error: {
              code: 'POTENTIAL_DUPLICATE',
              message: 'Potential duplicate patients detected.',
              matches
            }
          });
        }
      }
    }

    // 4. Save new patient normally if no duplicate is found
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
