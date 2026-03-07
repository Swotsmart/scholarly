import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@scholarly/database';
import jwt from 'jsonwebtoken';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  organization: z.string().max(200).optional(),
  roleInterest: z.enum(['learner', 'teacher', 'parent', 'tutor', 'admin', 'homeschool', 'developer']),
  referralSource: z.string().max(100).optional(),
  // Browser metadata
  timezone: z.string().max(100).optional(),
  screenResolution: z.string().max(20).optional(),
  browserLanguage: z.string().max(20).optional(),
  referrerUrl: z.string().max(2000).optional(),
  utmSource: z.string().max(200).optional(),
  utmMedium: z.string().max(200).optional(),
  utmCampaign: z.string().max(200).optional(),
  formCompletionMs: z.number().int().optional(),
});

router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || null;
    const userAgent = req.headers['user-agent'] || null;

    const flaggedAsBot = (data.formCompletionMs != null && data.formCompletionMs < 3000)
      || data.screenResolution === '0x0'
      || !userAgent;

    const registration = await prisma.demoRegistration.create({
      data: {
        name: data.name,
        email: data.email,
        organization: data.organization,
        roleInterest: data.roleInterest,
        referralSource: data.referralSource,
        ipAddress,
        userAgent,
        referrerUrl: data.referrerUrl,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        timezone: data.timezone,
        screenResolution: data.screenResolution,
        browserLanguage: data.browserLanguage,
        formCompletionMs: data.formCompletionMs,
        flaggedAsBot: flaggedAsBot ?? false,
      },
    });

    const token = jwt.sign(
      {
        sub: registration.id,
        email: data.email,
        role: data.roleInterest,
        isDemo: true,
      },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: registration.id,
        firstName: data.name.split(' ')[0] || data.name,
        lastName: data.name.split(' ').slice(1).join(' ') || '',
        email: data.email,
        role: data.roleInterest,
        roles: [data.roleInterest],
        isDemo: true,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Demo registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.get('/session', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(
      authHeader.slice(7),
      process.env.JWT_SECRET || 'dev-secret'
    ) as { sub: string; email: string; role: string; isDemo: boolean };

    if (!decoded.isDemo) {
      return res.status(403).json({ error: 'Not a demo session' });
    }

    const registration = await prisma.demoRegistration.findUnique({
      where: { id: decoded.sub },
    });

    if (!registration) {
      return res.status(404).json({ error: 'Demo session not found' });
    }

    res.json({
      user: {
        id: registration.id,
        firstName: registration.name.split(' ')[0] || registration.name,
        lastName: registration.name.split(' ').slice(1).join(' ') || '',
        email: registration.email,
        role: registration.roleInterest,
        roles: [registration.roleInterest],
        isDemo: true,
      },
    });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;
