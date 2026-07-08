import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import patientRouter from './routes/patient.js';
import authRouter from './routes/auth.js';
import appointmentRouter from './routes/appointment.js';
import checkinRouter from './routes/checkin.js';
import triageRouter from './routes/triage.js';
import consultationRouter from './routes/consultation.js';
import documentationRouter from './routes/documentation.js';
import diagnosticsRouter from './routes/diagnostics.js';
import billingRouter from './routes/billing.js';
import dischargeRouter from './routes/discharge.js';

const app = express();

// Enable CORS with HTTP middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Routes
app.use('/api/v1', healthRouter);
app.use('/api/v1', patientRouter);
app.use('/api/v1', authRouter);
app.use('/api/v1', appointmentRouter);
app.use('/api/v1', checkinRouter);
app.use('/api/v1', triageRouter);
app.use('/api/v1', consultationRouter);
app.use('/api/v1', documentationRouter);
app.use('/api/v1', diagnosticsRouter);
app.use('/api/v1', billingRouter);
app.use('/api/v1', dischargeRouter);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred.'
    }
  });
});

export { app };
export default app;
