import { Router, Request, Response } from 'express';
import { getDbConnectionStatus } from '../config/db.js';
import { checkAIServiceHealth } from '../services/ai.js';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  const isMongoConnected = getDbConnectionStatus();
  const aiHealth = await checkAIServiceHealth();

  const isOverallUp = isMongoConnected && aiHealth.status === 'UP';

  const healthResponse = {
    status: isOverallUp ? 'UP' : 'DOWN',
    timestamp: new Date().toISOString(),
    details: {
      api: 'UP',
      mongodb: isMongoConnected ? 'UP' : 'DOWN',
      aiService: aiHealth.status,
      aiServiceError: aiHealth.error || null
    }
  };

  return res.status(isOverallUp ? 200 : 503).json(healthResponse);
});

export default router;
