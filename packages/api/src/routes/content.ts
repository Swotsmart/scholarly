/**
 * Content Marketplace Routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@scholarly/database';
import { ApiError } from '../middleware/error-handler';

export const contentRouter: Router = Router();

// Search content
contentRouter.get('/', async (req, res) => {
  const { tenantId } = req;
  const {
    type,
    subject,
    yearLevel,
    curriculumCode,
    priceType,
    minRating,
    search,
    sortBy = 'popular',
    page = '1',
    pageSize = '24',
  } = req.query;

  const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
  const take = parseInt(pageSize as string);

  const where: Record<string, unknown> = {
    tenantId,
    status: 'published',
  };

  if (type) where.type = type;
  if (subject) where.subjects = { has: subject as string };
  if (yearLevel) where.yearLevels = { has: yearLevel as string };
  if (curriculumCode) where.curriculumCodes = { has: curriculumCode as string };

  if (priceType === 'free') {
    where.pricing = { path: ['type'], equals: 'free' };
  } else if (priceType === 'paid') {
    where.pricing = { path: ['type'], equals: 'paid' };
  }

  if (minRating) {
    where.averageRating = { gte: parseFloat(minRating as string) };
  }

  if (search) {
    where.OR = [
      { title: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
      { tags: { has: (search as string).toLowerCase() } },
    ];
  }

  // Sorting
  const orderBy: Record<string, unknown>[] = [];
  switch (sortBy) {
    case 'newest':
      orderBy.push({ publishedAt: 'desc' });
      break;
    case 'rating':
      orderBy.push({ averageRating: 'desc' });
      break;
    case 'downloads':
      orderBy.push({ downloadCount: 'desc' });
      break;
    case 'popular':
    default:
      orderBy.push({ purchaseCount: 'desc' }, { downloadCount: 'desc' });
  }

  const [content, total] = await Promise.all([
    prisma.content.findMany({
      where,
      skip,
      take,
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        thumbnailUrl: true,
        subjects: true,
        yearLevels: true,
        curriculumCodes: true,
        pricing: true,
        averageRating: true,
        reviewCount: true,
        downloadCount: true,
        purchaseCount: true,
        publishedAt: true,
        creator: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy,
    }),
    prisma.content.count({ where }),
  ]);

  res.json({
    content,
    pagination: {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      total,
      totalPages: Math.ceil(total / parseInt(pageSize as string)),
    },
  });
});

// Get content by ID
contentRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { tenantId, user } = req;

  const content = await prisma.content.findFirst({
    where: { id, tenantId },
    include: {
      creator: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          creatorProfile: true,
        },
      },
      alignments: {
        include: {
          standard: {
            select: {
              id: true,
              code: true,
              title: true,
              subject: true,
              yearLevels: true,
            },
          },
        },
        orderBy: { alignmentScore: 'desc' },
      },
      reviews: {
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: {
            select: { displayName: true, avatarUrl: true },
          },
        },
      },
    },
  });

  if (!content) {
    throw ApiError.notFound('Content', id);
  }

  // Check if user has purchased
  const hasPurchased = user
    ? await prisma.contentPurchase.findFirst({
        where: {
          contentId: id,
          buyerId: user.id,
          status: 'completed',
        },
      })
    : null;

  res.json({
    content,
    hasPurchased: !!hasPurchased,
  });
});

// Create content
const createContentSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  type: z.string(),
  thumbnailUrl: z.string().url().optional(),
  previewUrl: z.string().url().optional(),
  subjects: z.array(z.string()).min(1),
  yearLevels: z.array(z.string()).min(1),
  curriculumFrameworks: z.array(z.string()).optional(),
  curriculumCodes: z.array(z.string()).optional(),
  generalCapabilities: z.array(z.string()).optional(),
  format: z.string(),
  fileSize: z.number().optional(),
  pageCount: z.number().optional(),
  duration: z.number().optional(),
  pricing: z.object({
    type: z.enum(['free', 'paid', 'freemium']),
    price: z.number().optional(),
    currency: z.string().optional(),
  }),
  license: z.object({
    type: z.string(),
    commercialUse: z.boolean(),
    attribution: z.boolean(),
    shareAlike: z.boolean(),
    customTerms: z.string().optional(),
  }),
  tags: z.array(z.string()).optional(),
});

contentRouter.post('/', async (req, res) => {
  const { tenantId, user } = req;
  const data = createContentSchema.parse(req.body);

  // Check if user is a creator
  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { userId: user!.id },
  });

  if (!creatorProfile) {
    throw ApiError.forbidden('You must be a registered creator to publish content');
  }

  const content = await prisma.content.create({
    data: {
      tenantId,
      creatorId: user!.id,
      title: data.title,
      description: data.description,
      type: data.type,
      format: data.format,
      thumbnailUrl: data.thumbnailUrl,
      previewUrl: data.previewUrl,
      subjects: data.subjects,
      yearLevels: data.yearLevels,
      curriculumFrameworks: data.curriculumFrameworks || [],
      curriculumCodes: data.curriculumCodes || [],
      generalCapabilities: data.generalCapabilities || [],
      fileSize: data.fileSize,
      pageCount: data.pageCount,
      duration: data.duration,
      pricing: data.pricing,
      license: data.license,
      tags: data.tags || [],
      keywords: [...(data.tags || []), ...data.subjects, ...data.yearLevels],
      searchableText: `${data.title} ${data.description} ${data.subjects.join(' ')} ${data.yearLevels.join(' ')} ${(data.tags || []).join(' ')}`,
      status: 'draft',
    },
  });

  res.status(201).json({ content });
});

// Publish content
contentRouter.post('/:id/publish', async (req, res) => {
  const { id } = req.params;
  const { tenantId, user } = req;

  const content = await prisma.content.findFirst({
    where: { id, tenantId },
  });

  if (!content) {
    throw ApiError.notFound('Content', id);
  }

  if (content.creatorId !== user?.id && !user?.roles.includes('platform_admin')) {
    throw ApiError.forbidden();
  }

  const updated = await prisma.content.update({
    where: { id },
    data: {
      status: 'published',
      publishedAt: new Date(),
    },
  });

  res.json({ content: updated });
});

// Purchase content
contentRouter.post('/:id/purchase', async (req, res) => {
  const { id } = req.params;
  const { tenantId, user } = req;

  const content = await prisma.content.findFirst({
    where: { id, tenantId, status: 'published' },
  });

  if (!content) {
    throw ApiError.notFound('Content', id);
  }

  // Check if already purchased
  const existingPurchase = await prisma.contentPurchase.findFirst({
    where: {
      contentId: id,
      buyerId: user!.id,
      status: 'completed',
    },
  });

  if (existingPurchase) {
    throw ApiError.conflict('You have already purchased this content');
  }

  const pricing = content.pricing as { type: string; price?: number; currency?: string };

  // For free content, create purchase immediately
  if (pricing.type === 'free') {
    const purchase = await prisma.contentPurchase.create({
      data: {
        tenantId,
        contentId: id,
        buyerId: user!.id,
        price: 0,
        currency: 'AUD',
        tokenAmount: 0,
        platformFee: 0,
        creatorEarnings: 0,
        tokenRewards: 0,
        status: 'completed',
      },
    });

    // Update content stats
    await prisma.content.update({
      where: { id },
      data: {
        downloadCount: { increment: 1 },
        purchaseCount: { increment: 1 },
      },
    });

    return res.json({ purchase, downloadUrl: content.previewUrl });
  }

  // For paid content, process payment
  const price = pricing.price || 0;
  const currency = pricing.currency || 'AUD';
  const platformFee = price * 0.3; // 30% platform fee
  const creatorEarnings = price - platformFee;
  const tokenRewards = Math.round(price * 0.01);

  const purchase = await prisma.contentPurchase.create({
    data: {
      tenantId,
      contentId: id,
      buyerId: user!.id,
      price,
      currency,
      tokenAmount: 0,
      platformFee,
      creatorEarnings,
      tokenRewards,
      status: 'completed',
    },
  });

  // Update content stats
  await prisma.content.update({
    where: { id },
    data: {
      downloadCount: { increment: 1 },
      purchaseCount: { increment: 1 },
    },
  });

  // Update creator earnings
  await prisma.creatorProfile.update({
    where: { userId: content.creatorId },
    data: {
      totalSales: { increment: 1 },
      totalEarnings: { increment: creatorEarnings },
    },
  });

  res.json({ purchase, downloadUrl: content.previewUrl });
});

// Review content
const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  title: z.string().max(100).optional(),
  comment: z.string().max(2000).optional(),
  yearLevelUsed: z.string().optional(),
});

contentRouter.post('/:id/reviews', async (req, res) => {
  const { id } = req.params;
  const { tenantId, user } = req;
  const data = reviewSchema.parse(req.body);

  const content = await prisma.content.findFirst({
    where: { id, tenantId },
  });

  if (!content) {
    throw ApiError.notFound('Content', id);
  }

  // Check if user has purchased (for verified review)
  const purchase = await prisma.contentPurchase.findFirst({
    where: {
      contentId: id,
      buyerId: user!.id,
      status: 'completed',
    },
  });

  const review = await prisma.contentReview.upsert({
    where: {
      contentId_reviewerId: {
        contentId: id,
        reviewerId: user!.id,
      },
    },
    update: {
      rating: data.rating,
      title: data.title,
      comment: data.comment,
      yearLevelUsed: data.yearLevelUsed,
      updatedAt: new Date(),
    },
    create: {
      content: { connect: { id } },
      reviewer: { connect: { id: user!.id } },
      rating: data.rating,
      title: data.title,
      comment: data.comment,
      yearLevelUsed: data.yearLevelUsed,
      verified: !!purchase,
    },
    include: {
      reviewer: {
        select: { displayName: true, avatarUrl: true },
      },
    },
  });

  // Update content rating
  const reviews = await prisma.contentReview.aggregate({
    where: { contentId: id },
    _avg: { rating: true },
    _count: true,
  });

  await prisma.content.update({
    where: { id },
    data: {
      averageRating: reviews._avg.rating || 0,
      reviewCount: reviews._count,
    },
  });

  res.json({ review });
});

// Get content reviews
contentRouter.get('/:id/reviews', async (req, res) => {
  const { id } = req.params;
  const { page = '1', pageSize = '10' } = req.query;

  const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
  const take = parseInt(pageSize as string);

  const [reviews, total] = await Promise.all([
    prisma.contentReview.findMany({
      where: { contentId: id },
      skip,
      take,
      include: {
        reviewer: {
          select: { displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.contentReview.count({ where: { contentId: id } }),
  ]);

  res.json({
    reviews,
    pagination: {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      total,
      totalPages: Math.ceil(total / parseInt(pageSize as string)),
    },
  });
});
