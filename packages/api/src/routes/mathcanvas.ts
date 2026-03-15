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

// POST /api/v1/mathcanvas/solve — Math Solver: extract equation from image via Claude vision
// Accepts a base64-encoded image, returns the mathematical expression as a math.js string.
// The frontend renders a file/camera input, encodes the image, and passes it here.
// Claude's vision capability parses handwritten or printed equations into evaluable expressions.
mathCanvasRouter.post('/solve', async (req: Request, res: Response) => {
  const requestId = (req as any).correlationId || 'unknown';

  const schema = z.object({
    imageBase64: z.string().min(1),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']).default('image/jpeg'),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid request', requestId });
    return;
  }

  const { imageBase64, mimeType } = parsed.data;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    res.status(503).json({ success: false, error: 'AI service not configured', requestId });
    return;
  }

  const systemPrompt = `You are MathCanvas Math Solver — an equation extraction engine for a secondary school mathematics platform.

Your ONLY job is to extract the mathematical expression from the image and return it in a structured JSON format.
You are not asked to solve, explain, or evaluate — only to transcribe.

CRITICAL RULES:
1. Return ONLY valid JSON. No markdown, no backticks, no explanation outside the JSON.
2. Use math.js compatible syntax: ^ for power, * for multiply, sqrt(), sin(), cos(), log(), exp().
3. If the image shows a FUNCTION (e.g. y = x² + 2x - 3), return just the right-hand side: "x^2 + 2*x - 3"
4. If the image shows an EQUATION to solve (e.g. 2x + 5 = 11), return it as-is: "2*x + 5 = 11"
5. If the image shows a SYSTEM or something too complex for a single expression, describe it in naturalLanguage only.
6. Confidence: "high" if clearly readable, "medium" if partially legible, "low" if guessing.

RESPONSE SCHEMA:
{
  "expression": "the extracted expression in math.js syntax, or null if not extractable",
  "naturalLanguage": "plain English description of what the image shows, e.g. 'quadratic y = x² + 2x - 3'",
  "suggestedMode": "graphing" | "cas" | "stats" | "geometry",
  "confidence": "high" | "medium" | "low",
  "notes": "optional: any ambiguities or assumptions made"
}`;

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
        max_tokens: 512,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: imageBase64 },
            },
            {
              type: 'text',
              text: 'Extract the mathematical expression from this image.',
            },
          ],
        }],
      }),
    });

    if (!anthropicRes.ok) {
      const errData = await anthropicRes.json().catch(() => ({}));
      logger.error(`MathCanvas Math Solver error: ${anthropicRes.status}`);
      res.status(502).json({
        success: false,
        error: 'AI vision failed',
        details: (errData as any)?.error?.message,
        requestId,
      });
      return;
    }

    const data = await anthropicRes.json() as any;
    const text = (data.content || []).map((b: { text?: string }) => b.text ?? '').join('');
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let result: unknown;
    try {
      result = JSON.parse(clean);
    } catch {
      logger.error('MathCanvas Math Solver: Claude returned invalid JSON');
      res.status(502).json({ success: false, error: 'AI returned invalid response', requestId });
      return;
    }

    res.json({ success: true, result, requestId });
  } catch (err) {
    logger.error(`MathCanvas Math Solver error: ${err}`);
    res.status(500).json({ success: false, error: 'Internal server error', requestId });
  }
});
