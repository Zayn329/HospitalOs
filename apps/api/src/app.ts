import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import patientRouter from './routes/patient.js';
import authRouter from './routes/auth.js';

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
