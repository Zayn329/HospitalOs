import { Router, Request, Response, NextFunction } from 'express';
import Appointment from '../models/Appointment.js';
import Consultation from '../models/Consultation.js';
import Patient from '../models/Patient.js';
import Bill from '../models/Bill.js';

const router = Router();

// GET /api/v1/analytics/dashboard - Operational Dashboard Metrics
router.get('/analytics/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const totalPatients = await Patient.countDocuments();
    const totalAppointments = await Appointment.countDocuments();
    const activeConsultations = await Consultation.countDocuments({ status: { $in: ['open', 'in_progress'] } });
    const completedConsultations = await Consultation.countDocuments({ status: 'completed' });

    const bills = await Bill.find();
    const totalRevenue = bills.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
    const paidRevenue = bills.filter(b => b.paymentStatus === 'paid' || (b as any).status === 'paid').reduce((acc, b) => acc + (b.totalAmount || 0), 0);

    return res.status(200).json({
      success: true,
      data: {
        totalPatients,
        totalAppointments,
        activeConsultations,
        completedConsultations,
        financials: {
          totalRevenue,
          paidRevenue,
          unpaidCount: bills.filter(b => b.paymentStatus === 'pending').length
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/analytics/patient-flow - Monitor Patient Flow & Queue Bottlenecks
router.get('/analytics/patient-flow', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const openConsultations = await Consultation.find({ status: 'open' });
    const inProgressConsultations = await Consultation.find({ status: 'in_progress' });
    const emergencyCount = await Consultation.countDocuments({ priority: 'emergency', status: { $in: ['open', 'in_progress'] } });

    const bottlenecks = [];
    if (openConsultations.length > 5) {
      bottlenecks.push({
        stage: 'waiting_room',
        level: 'warning',
        message: `${openConsultations.length} patients currently in waiting queue.`
      });
    }
    if (emergencyCount > 0) {
      bottlenecks.push({
        stage: 'emergency_triage',
        level: 'critical',
        message: `${emergencyCount} emergency priority patient(s) waiting for immediate physician.`
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        waitingQueueCount: openConsultations.length,
        inProgressCount: inProgressConsultations.length,
        emergencyPriorityCount: emergencyCount,
        bottlenecks
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/analytics/performance-report - Generate Summary Operational Performance Report
router.get('/analytics/performance-report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const totalAppointments = await Appointment.countDocuments();
    const completedAppointments = await Appointment.countDocuments({ status: 'completed' });
    const cancelledAppointments = await Appointment.countDocuments({ status: 'cancelled' });
    const totalConsultations = await Consultation.countDocuments();
    const totalBills = await Bill.countDocuments();

    return res.status(200).json({
      success: true,
      data: {
        reportGeneratedAt: new Date().toISOString(),
        summary: {
          appointments: {
            total: totalAppointments,
            completed: completedAppointments,
            cancelled: cancelledAppointments,
            completionRate: totalAppointments > 0 ? `${((completedAppointments / totalAppointments) * 100).toFixed(1)}%` : '0%'
          },
          consultations: {
            total: totalConsultations
          },
          billing: {
            totalBillsGenerated: totalBills
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
