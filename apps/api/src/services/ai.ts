import { config } from '../config/env.js';

export interface AIHealthCheckResult {
  status: 'UP' | 'DOWN';
  timestamp?: string;
  error?: string;
}

export async function checkAIServiceHealth(): Promise<AIHealthCheckResult> {
  try {
    const url = `${config.aiServiceUrl}/api/v1/health`;
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    
    if (!response.ok) {
      return { status: 'DOWN', error: `HTTP status ${response.status}` };
    }
    
    const data = await response.json() as any;
    return {
      status: data.status === 'UP' ? 'UP' : 'DOWN',
      timestamp: data.timestamp
    };
  } catch (error) {
    return {
      status: 'DOWN',
      error: (error as Error).message
    };
  }
}

export async function runAgentOnAI(payload: Record<string, any>): Promise<any> {
  const url = `${config.aiServiceUrl}/api/v1/agent/run`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000)
  });
  
  if (!response.ok) {
    throw new Error(`AI service responded with status ${response.status}`);
  }
  
  return response.json();
}
