import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import User from '../models/User.js';
import { hashPassword, verifyPassword, generateToken } from '../utils/auth.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Validation Schemas
const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum([
    'patient',
    'receptionist',
    'doctor',
    'laboratory_staff',
    'pharmacist',
    'billing_staff',
    'administrator',
    'system_administrator'
  ])
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required")
});

// Helper: Map role to dashboard path
function getDashboardPath(role: string): string {
  switch (role) {
    case 'receptionist':
      return '/dashboard/receptionist';
    case 'doctor':
      return '/dashboard/doctor';
    case 'administrator':
    case 'system_administrator':
      return '/dashboard/admin';
    default:
      return '/dashboard/general';
  }
}

// POST /auth/register
router.post('/auth/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message }
      });
    }

    const { firstName, lastName, email, password, role } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: { code: 'USER_EXISTS', message: 'An account with this email already exists.' }
      });
    }

    const passwordHash = hashPassword(password);
    const newUser = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      passwordHash,
      role
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        userId: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /auth/login
router.post('/auth/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message }
      });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Return generic 401 Unauthorized for security (do not disclose if email exists)
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
      });
    }

    const isPasswordValid = verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
      });
    }

    // Generate JWT
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        dashboard: getDashboardPath(user.role),
        user: {
          userId: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /admin/debug-restricted (to verify unauthorized role block)
router.get(
  '/admin/debug-restricted',
  authenticateToken,
  requireRole(['administrator', 'system_administrator']),
  async (req: Request, res: Response) => {
    return res.status(200).json({
      success: true,
      message: 'Admin restricted data accessed successfully.'
    });
  }
);

export default router;
