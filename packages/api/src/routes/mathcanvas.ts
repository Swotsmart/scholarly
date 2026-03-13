/**
 * MathCanvas Routes
 * Proxies Claude API calls for MathCanvas visualization generation.
 * The frontend cannot call Anthropic directly (no CORS + API key exposure).
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../lib/logger';

export const mathCanvasRouter: Router = Router();
mathCanvasRouter.use(authMiddleware);

const generateSchema = z.object({
  systemPrompt: z.string().min(1),
  userPrompt: z.string().min(1),
  maxTokens: z.number().int().min(256).max(8192).optional().default(4096),
});

// POST /api/v1/mathcanvas/generate — proxy Claude call for visualization
mathCanvasRouter.post('/generate', async (req: Request, res: Response) => {
  const requestId = (req as any).correlationId || 'unknown';

  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: 'Invalid request',
      details: parsed.error.issues,
      requestId,
    });
    return;
  }

  const { systemPrompt, userPrompt, maxTokens } = parsed.data;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    res.status(503).json({
      success: false,
      error: 'AI service not configured',
      requestId,
    });
    return;
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errData = await anthropicRes.json().catch(() => ({}));
      logger.error(`MathCanvas Claude API error: ${anthropicRes.status}`);
      res.status(502).json({
        success: false,
        error: 'AI generation failed',
        details: (errData as any)?.error?.message,
        requestId,
      });
      return;
    }

    const data = await anthropicRes.json() as any;
    const text = (data.content || [])
      .map((b: { text?: string }) => b.text ?? '')
      .join('');

    // Parse the JSON from Claude's response
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let result: unknown;
    try {
      result = JSON.parse(clean);
    } catch {
      logger.error('MathCanvas: Claude returned invalid JSON');
      res.status(502).json({
        success: false,
        error: 'AI returned invalid response',
        requestId,
      });
      return;
    }

    res.json({ success: true, result, requestId });
  } catch (err) {
    logger.error(`MathCanvas generation error: ${err}`);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      requestId,
    });
  }
});
