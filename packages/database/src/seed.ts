/**
 * Database Seed Script
 * Populates the database with initial data for development
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Simple password hash for demo (in production, use bcrypt)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'scholarly_salt').digest('hex');
}

// Demo password for all users
const DEMO_PASSWORD = 'demo123';
const DEMO_PASSWORD_HASH = hashPassword(DEMO_PASSWORD);

async function main() {
  console.log('Starting database seed...');

  // Create default tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'scholarly-demo' },
    update: {},
    create: {
      name: 'Scholarly Demo',
      slug: 'scholarly-demo',
      settings: {
        timezone: 'Australia/Sydney',
        defaultJurisdiction: 'AU_NSW',
        features: {
          tutorBooking: true,
          contentMarketplace: true,
          curriculumCurator: true,
          homeschoolHub: true,
          microSchool: true,
          reliefMarketplace: true,
        },
      },
      status: 'active',
    },
  });

  console.log(`Created tenant: ${tenant.name}`);

  // Create demo users
  const teacherUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'teacher@scholarly.app' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'teacher@scholarly.app',
      passwordHash: DEMO_PASSWORD_HASH,
      displayName: 'Dr. James Wilson',
      firstName: 'James',
      lastName: 'Wilson',
      bio: 'High school teacher with 15 years of experience in Design & Technology. Passionate about fostering innovation and creativity in students.',
      roles: ['teacher', 'educator'],
      jurisdiction: 'AU_NSW',
      emailVerified: true,
      identityVerified: true,
      trustScore: 95,
      status: 'active',
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@scholarly.app' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@scholarly.app',
      passwordHash: DEMO_PASSWORD_HASH,
      displayName: 'Admin User',
      firstName: 'Admin',
      lastName: 'User',
      roles: ['platform_admin'],
      jurisdiction: 'AU_NSW',
      emailVerified: true,
      identityVerified: true,
      trustScore: 100,
      status: 'active',
    },
  });

  const tutorUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'tutor@scholarly.app' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'tutor@scholarly.app',
      passwordHash: DEMO_PASSWORD_HASH,
      displayName: 'Sarah Chen',
      firstName: 'Sarah',
      lastName: 'Chen',
      bio: 'Experienced mathematics tutor specializing in making complex concepts simple and engaging.',
      roles: ['tutor_professional', 'content_creator'],
      jurisdiction: 'AU_NSW',
      emailVerified: true,
      identityVerified: true,
      trustScore: 92,
      status: 'active',
    },
  });

  // Create tutor profile
  const tutorProfile = await prisma.tutorProfile.upsert({
    where: { userId: tutorUser.id },
    update: {},
    create: {
      userId: tutorUser.id,
      tutorType: 'professional',
      verificationStatus: 'verified',
      verifiedAt: new Date(),
      profileCompleteness: 95,
      yearLevelsTeaching: ['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12'],
      languages: ['English', 'Mandarin'],
      sessionTypes: ['online_video', 'in_person_tutor_location'],
      maxStudentsPerGroup: 4,
      teachingStyle: {
        approach: 'mixed',
        pacePreference: 'patient',
        usesVisuals: true,
        usesGames: true,
        assignsHomework: true,
        providesMaterials: true,
        keywords: ['patient', 'visual learning', 'step-by-step', 'real-world examples'],
      },
      metrics: {
        totalSessions: 234,
        totalHours: 312,
        uniqueStudents: 45,
        repeatBookingRate: 78,
        averageRating: 4.8,
        ratingCount: 89,
        responseTimeMinutes: 45,
        cancellationRate: 2,
        noShowRate: 0,
        averageStudentImprovement: 15,
        goalAchievementRate: 85,
      },
    },
  });

  // Create availability slots (extracted from JSON in enhanced schema)
  await prisma.tutorAvailabilitySlot.createMany({
    skipDuplicates: true,
    data: [
      { profileId: tutorProfile.id, dayOfWeek: 1, startTime: '15:00', endTime: '20:00', timezone: 'Australia/Sydney' },
      { profileId: tutorProfile.id, dayOfWeek: 2, startTime: '15:00', endTime: '20:00', timezone: 'Australia/Sydney' },
      { profileId: tutorProfile.id, dayOfWeek: 3, startTime: '15:00', endTime: '20:00', timezone: 'Australia/Sydney' },
      { profileId: tutorProfile.id, dayOfWeek: 4, startTime: '15:00', endTime: '20:00', timezone: 'Australia/Sydney' },
      { profileId: tutorProfile.id, dayOfWeek: 5, startTime: '14:00', endTime: '18:00', timezone: 'Australia/Sydney' },
      { profileId: tutorProfile.id, dayOfWeek: 6, startTime: '09:00', endTime: '15:00', timezone: 'Australia/Sydney' },
    ],
  });

  // Create pricing tiers (extracted from JSON in enhanced schema)
  await prisma.tutorPricingTier.createMany({
    skipDuplicates: true,
    data: [
      { profileId: tutorProfile.id, sessionType: 'online_1to1', duration: 60, baseRate: 65, currency: 'AUD' },
      { profileId: tutorProfile.id, sessionType: 'online_group', duration: 60, baseRate: 45, currency: 'AUD', groupDiscount: 10, maxGroupSize: 4 },
      { profileId: tutorProfile.id, sessionType: 'in_person_1to1', duration: 60, baseRate: 75, currency: 'AUD' },
    ],
  });

  // Create subjects first (reference table in enhanced schema)
  const mathSubject = await prisma.subject.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'MATH' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'MATH',
      name: 'Mathematics',
      description: 'Study of numbers, quantities, and shapes',
      learningArea: 'STEM',
    },
  });

  const physicsSubject = await prisma.subject.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'PHYS' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'PHYS',
      name: 'Physics',
      description: 'Study of matter, energy, and their interactions',
      learningArea: 'STEM',
    },
  });

  // Create tutor subjects (now with proper foreign key to Subject)
  await prisma.tutorSubject.createMany({
    skipDuplicates: true,
    data: [
      {
        profileId: tutorProfile.id,
        subjectId: mathSubject.id,
        yearLevels: ['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12'],
        confidenceLevel: 5,
        specializations: ['Algebra', 'Calculus', 'Statistics', 'Geometry'],
        examBoardsKnown: ['NSW HSC', 'VCE'],
      },
      {
        profileId: tutorProfile.id,
        subjectId: physicsSubject.id,
        yearLevels: ['Year 11', 'Year 12'],
        confidenceLevel: 4,
        specializations: ['Mechanics', 'Electricity'],
        examBoardsKnown: ['NSW HSC'],
      },
    ],
  });

  const parentUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'parent@scholarly.app' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'parent@scholarly.app',
      passwordHash: DEMO_PASSWORD_HASH,
      displayName: 'David Smith',
      firstName: 'David',
      lastName: 'Smith',
      roles: ['parent', 'homeschool_parent'],
      jurisdiction: 'AU_NSW',
      emailVerified: true,
      trustScore: 85,
      status: 'active',
    },
  });

  // Create parent profile
  await prisma.parentProfile.upsert({
    where: { userId: parentUser.id },
    update: {},
    create: {
      userId: parentUser.id,
      childIds: [],
      approvedTutorIds: [tutorUser.id],
      paymentMethodOnFile: true,
      monthlyBudget: 500,
      isHomeschoolParent: true,
      notificationPreferences: {
        channels: { email: true, sms: true, push: true, inApp: true },
        categories: {
          bookingConfirmations: true,
          sessionReminders: true,
          sessionFeedback: true,
          paymentReceipts: true,
          progressReports: true,
          newTutorMatches: true,
          communityUpdates: true,
          marketplaceDeals: true,
          complianceAlerts: true,
        },
        quietHours: { enabled: true, start: '22:00', end: '07:00', timezone: 'Australia/Sydney' },
        reminderLeadTime: 60,
      },
    },
  });

  const learnerUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'learner@scholarly.app' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'learner@scholarly.app',
      passwordHash: DEMO_PASSWORD_HASH,
      displayName: 'Emma Smith',
      firstName: 'Emma',
      lastName: 'Smith',
      roles: ['learner'],
      jurisdiction: 'AU_NSW',
      emailVerified: true,
      trustScore: 75,
      status: 'active',
    },
  });

  // Create learner profile (fields extracted from JSON in enhanced schema)
  await prisma.learnerProfile.upsert({
    where: { userId: learnerUser.id },
    update: {},
    create: {
      userId: learnerUser.id,
      dateOfBirth: new Date('2011-05-15'),
      yearLevel: 'Year 8',
      parentIds: [parentUser.id],
      // Learning preferences now individual columns instead of JSON
      preferredSessionLength: 60,
      preferredTimeOfDay: 'afternoon',
      preferredDays: [1, 3, 5],
      learningPace: 'moderate',
      attentionSpan: 'medium',
      bestMotivators: ['progress_tracking', 'challenges'],
      lisIntegrationEnabled: true,
    },
  });

  // Create creator profile for tutor
  await prisma.creatorProfile.upsert({
    where: { userId: tutorUser.id },
    update: {},
    create: {
      userId: tutorUser.id,
      displayName: 'Sarah Chen Education',
      bio: 'Creating engaging mathematics resources that make learning fun!',
      subjects: ['Mathematics', 'Physics'],
      yearLevels: ['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12'],
      totalContent: 15,
      totalSales: 234,
      totalDownloads: 1250,
      averageRating: 4.7,
      totalReviews: 45,
      totalEarnings: 2340,
      level: 'established',
      badges: ['top_rated', 'curriculum_aligned'],
      verificationStatus: 'verified',
      verifiedAt: new Date(),
    },
  });

  // Create sample curriculum standards (Australian Curriculum - Mathematics)
  const mathStandards = [
    {
      framework: 'ACARA',
      code: 'AC9M7N01',
      type: 'content_description',
      learningArea: 'Mathematics',
      subject: 'Mathematics',
      strand: 'Number',
      substrand: 'Number and place value',
      yearLevels: ['Year 7'],
      title: 'Compare, order and represent rational numbers',
      description: 'Compare, order and represent decimals and simple fractions on a number line',
      cognitiveVerbs: ['compare', 'order', 'represent'],
      skills: ['comparing', 'ordering', 'representing'],
      concepts: ['decimals', 'fractions', 'number line', 'rational numbers'],
      keywords: ['decimals', 'fractions', 'number line', 'compare', 'order'],
      generalCapabilities: ['numeracy', 'critical_creative_thinking'],
      source: 'ACARA v9.0',
      version: '9.0',
    },
    {
      framework: 'ACARA',
      code: 'AC9M7N02',
      type: 'content_description',
      learningArea: 'Mathematics',
      subject: 'Mathematics',
      strand: 'Number',
      substrand: 'Number and place value',
      yearLevels: ['Year 7'],
      title: 'Add and subtract integers',
      description: 'Add and subtract integers using models, number lines and strategies',
      cognitiveVerbs: ['add', 'subtract', 'use'],
      skills: ['addition', 'subtraction', 'modelling'],
      concepts: ['integers', 'negative numbers', 'number line'],
      keywords: ['integers', 'negative', 'positive', 'add', 'subtract'],
      generalCapabilities: ['numeracy'],
      source: 'ACARA v9.0',
      version: '9.0',
    },
    {
      framework: 'ACARA',
      code: 'AC9M8A01',
      type: 'content_description',
      learningArea: 'Mathematics',
      subject: 'Mathematics',
      strand: 'Algebra',
      substrand: 'Patterns and algebra',
      yearLevels: ['Year 8'],
      title: 'Create and evaluate algebraic expressions',
      description: 'Create, interpret and evaluate algebraic expressions including those involving exponents',
      cognitiveVerbs: ['create', 'interpret', 'evaluate'],
      skills: ['creating expressions', 'interpreting', 'evaluating'],
      concepts: ['algebraic expressions', 'exponents', 'variables'],
      keywords: ['algebra', 'expressions', 'exponents', 'variables', 'evaluate'],
      generalCapabilities: ['numeracy', 'critical_creative_thinking'],
      source: 'ACARA v9.0',
      version: '9.0',
    },
  ];

  for (const standard of mathStandards) {
    await prisma.curriculumStandard.upsert({
      where: { tenantId_framework_code: { tenantId: tenant.id, framework: standard.framework, code: standard.code } },
      update: {},
      create: {
        tenantId: tenant.id,
        ...standard,
      },
    });
  }

  console.log(`Created ${mathStandards.length} curriculum standards`);

  // Create sample content
  await prisma.content.upsert({
    where: { id: 'content_sample_1' },
    update: {},
    create: {
      id: 'content_sample_1',
      tenantId: tenant.id,
      creatorId: tutorUser.id,
      title: 'Mastering Fractions: A Visual Guide',
      description: 'A comprehensive worksheet pack designed to help Year 7-8 students understand fractions through visual representations and real-world examples.',
      type: 'worksheet',
      subjects: ['Mathematics'],
      yearLevels: ['Year 7', 'Year 8'],
      curriculumFrameworks: ['ACARA'],
      curriculumCodes: ['AC9M7N01'],
      generalCapabilities: ['numeracy'],
      format: 'pdf',
      pageCount: 24,
      pricing: {
        type: 'paid',
        price: 8.5,
        currency: 'AUD',
        tokenPrice: 850,
      },
      license: {
        type: 'all_rights_reserved',
        commercialUse: false,
        attribution: true,
        shareAlike: false,
      },
      qualityScore: 92,
      reviewCount: 23,
      averageRating: 4.7,
      downloadCount: 156,
      purchaseCount: 89,
      tags: ['fractions', 'visual learning', 'worksheets', 'year 7', 'year 8'],
      keywords: ['fractions', 'decimals', 'visual', 'number line', 'mathematics'],
      searchableText: 'Mastering Fractions Visual Guide Year 7 8 worksheets visual learning mathematics number line decimals',
      status: 'published',
      publishedAt: new Date('2024-06-15'),
    },
  });

  console.log('Created sample content');

  // Create homeschool family (simplified schema in enhanced version)
  const family = await prisma.homeschoolFamily.upsert({
    where: { id: 'family_demo_1' },
    update: {},
    create: {
      id: 'family_demo_1',
      tenantId: tenant.id,
      primaryContactUserId: parentUser.id,
      primaryContactName: 'David Smith',
      primaryContactEmail: 'parent@scholarly.app',
      primaryContactPhone: '+61 412 345 678',
      // educationalProfile split into separate fields
      educationalPhilosophy: 'Eclectic approach combining Charlotte Mason with project-based learning',
      curriculumApproach: 'eclectic',
      teachingCapabilities: [
        { subject: 'Mathematics', yearLevels: ['Year 7', 'Year 8'], confidence: 'advanced', willingToTeachCoop: true, willingToTutor: false },
        { subject: 'Science', yearLevels: ['Year 7', 'Year 8', 'Year 9'], confidence: 'intermediate', willingToTeachCoop: true, willingToTutor: false },
      ],
      coopPreferences: {
        interestedInCoops: true,
        maxCoopsToJoin: 2,
        willingToHost: true,
        willingToTeach: true,
        willingToOrganize: false,
        availableDays: ['wednesday', 'friday'],
        preferredTimes: ['morning'],
        preferredCoopSize: 'medium',
        ageRangeTolerance: 2,
        mustHave: ['outdoor activities'],
        dealBreakers: [],
      },
      compliance: {
        jurisdiction: 'AU_NSW',
        registrationStatus: 'registered',
        registrationNumber: 'HE123456',
        registrationExpiry: new Date('2026-12-31'),
        documents: [],
        reportingFrequency: 'annual',
        complianceScore: 95,
        complianceAlerts: [],
        suggestedActions: [],
      },
      aiProfile: {
        compatibilityVector: [],
        predictedChallenges: ['Maths beyond Year 10'],
        predictedStrengths: ['Self-directed learning', 'Project completion'],
        engagementScore: 85,
        engagementTrend: 'stable',
        recommendedCoops: [],
        recommendedResources: [],
        recommendedConnections: [],
        supportNeedsScore: 20,
        suggestedSupport: [],
        lastAnalyzed: new Date(),
      },
      status: 'active',
      // Create Address as nested relation
      location: {
        create: {
          tenantId: tenant.id,
          suburb: 'Parramatta',
          city: 'Sydney',
          state: 'NSW',
          postcode: '2150',
          country: 'Australia',
          latitude: -33.8151,
          longitude: 151.0011,
          type: 'primary',
        },
      },
    },
  });

  // Create homeschool child
  await prisma.homeschoolChild.upsert({
    where: { id: 'child_demo_1' },
    update: {},
    create: {
      id: 'child_demo_1',
      familyId: family.id,
      name: 'Emma Smith',
      dateOfBirth: new Date('2011-05-15'),
      currentYearLevel: 'Year 8',
      learningStyle: 'visual',
      interests: ['Science', 'Art', 'Music'],
      strengths: ['Creative thinking', 'Reading comprehension'],
      challengeAreas: ['Times tables', 'Fractions'],
      curriculumFramework: 'ACARA',
      subjectProgress: [
        {
          subject: 'Mathematics',
          currentLevel: 'Year 8',
          curriculumCodes: ['AC9M8A01', 'AC9M8N01'],
          completedCodes: ['AC9M7N01', 'AC9M7N02'],
          inProgressCodes: ['AC9M8A01'],
          lastUpdated: new Date(),
        },
      ],
      lisIntegrationEnabled: true,
    },
  });

  console.log('Created homeschool family and child');

  // ============================================================================
  // DESIGN & PITCH AI DATA
  // ============================================================================

  // Create Design Challenges
  const sustainabilityChallenge = await prisma.designChallenge.upsert({
    where: { id: 'challenge_sustainability_1' },
    update: {},
    create: {
      id: 'challenge_sustainability_1',
      tenantId: tenant.id,
      title: 'Sustainable Campus Life',
      description: `Design an innovative solution that promotes sustainability on your school or university campus.

Your challenge is to identify a specific environmental problem affecting students, staff, or the broader campus community, and design a practical solution that can be implemented within one semester.

Consider areas such as:
- Waste reduction and recycling
- Energy conservation
- Water usage
- Transportation
- Food systems
- Green spaces`,
      context: `With climate change becoming an increasingly urgent issue, educational institutions are looking for ways to reduce their environmental footprint. Students spend a significant portion of their time on campus, making it an ideal place to implement sustainable practices. Your solution should be practical, cost-effective, and engaging for the campus community.`,
      complexity: 'intermediate',
      estimatedDuration: '3-4 weeks',
      subject: 'Design & Technology',
      yearLevels: ['Year 9', 'Year 10', 'Year 11', 'Year 12'],
      curriculumCodes: ['ACTDEP049', 'ACTDEP050', 'ACTDEP051'],
      generalCapabilities: ['critical_creative_thinking', 'ethical_understanding', 'sustainability'],
      crossCurriculumPriorities: ['sustainability'],
      constraints: [
        { type: 'budget', description: 'Solution must be implementable with less than $500 initial investment' },
        { type: 'time', description: 'Must be deployable within one semester' },
        { type: 'scope', description: 'Must involve at least 100 students in participation' },
      ],
      resourceLinks: [
        { title: 'UN Sustainable Development Goals', url: 'https://sdgs.un.org/goals' },
        { title: 'Design Thinking Process', url: 'https://www.interaction-design.org/literature/topics/design-thinking' },
      ],
      rubric: {
        criteria: [
          { name: 'Problem Understanding', weight: 20, levels: ['Emerging', 'Developing', 'Proficient', 'Advanced'] },
          { name: 'Solution Creativity', weight: 25, levels: ['Emerging', 'Developing', 'Proficient', 'Advanced'] },
          { name: 'Feasibility', weight: 20, levels: ['Emerging', 'Developing', 'Proficient', 'Advanced'] },
          { name: 'User-Centered Design', weight: 20, levels: ['Emerging', 'Developing', 'Proficient', 'Advanced'] },
          { name: 'Pitch Quality', weight: 15, levels: ['Emerging', 'Developing', 'Proficient', 'Advanced'] },
        ],
      },
      status: 'published',
      publishedAt: new Date('2024-01-01'),
      createdBy: adminUser.id,
    },
  });

  const wellnessChallenge = await prisma.designChallenge.upsert({
    where: { id: 'challenge_wellness_1' },
    update: {},
    create: {
      id: 'challenge_wellness_1',
      tenantId: tenant.id,
      title: 'Student Wellness Innovation',
      description: `Design a solution that addresses mental health and wellness challenges faced by students in educational settings.

Your challenge is to deeply understand the wellness needs of students and create an innovative, accessible solution that helps improve their mental health and overall wellbeing.

Consider areas such as:
- Stress management
- Social connection
- Physical activity
- Sleep habits
- Digital wellbeing
- Academic pressure`,
      context: `Student mental health has become a critical concern in education. Many students struggle with stress, anxiety, and feelings of isolation. Traditional support systems often have long wait times or stigma barriers. Your solution should be approachable, reduce barriers to seeking help, and promote positive wellness habits.`,
      complexity: 'intermediate',
      estimatedDuration: '3-4 weeks',
      subject: 'Health & Physical Education',
      yearLevels: ['Year 9', 'Year 10', 'Year 11', 'Year 12'],
      curriculumCodes: ['ACPPS089', 'ACPPS090', 'ACPPS091'],
      generalCapabilities: ['critical_creative_thinking', 'personal_social_capability', 'ethical_understanding'],
      constraints: [
        { type: 'privacy', description: 'Must protect student privacy and data' },
        { type: 'accessibility', description: 'Must be accessible to students with various needs' },
        { type: 'cost', description: 'Should be free or low-cost for students' },
      ],
      resourceLinks: [
        { title: 'Beyond Blue - Youth Mental Health', url: 'https://www.beyondblue.org.au/who-does-it-affect/young-people' },
        { title: 'Headspace', url: 'https://headspace.org.au/' },
      ],
      rubric: {
        criteria: [
          { name: 'Empathy & Understanding', weight: 25, levels: ['Emerging', 'Developing', 'Proficient', 'Advanced'] },
          { name: 'Solution Impact', weight: 25, levels: ['Emerging', 'Developing', 'Proficient', 'Advanced'] },
          { name: 'Accessibility', weight: 20, levels: ['Emerging', 'Developing', 'Proficient', 'Advanced'] },
          { name: 'Innovation', weight: 15, levels: ['Emerging', 'Developing', 'Proficient', 'Advanced'] },
          { name: 'Pitch Quality', weight: 15, levels: ['Emerging', 'Developing', 'Proficient', 'Advanced'] },
        ],
      },
      status: 'published',
      publishedAt: new Date('2024-01-15'),
      createdBy: adminUser.id,
    },
  });

  console.log('Created design challenges');

  // Create a sample Design Journey for Emma (learner)
  const emmaJourney = await prisma.designJourney.upsert({
    where: { id: 'journey_emma_sustainability' },
    update: {},
    create: {
      id: 'journey_emma_sustainability',
      tenantId: tenant.id,
      challengeId: sustainabilityChallenge.id,
      userId: learnerUser.id,
      currentPhase: 'prototype',
      status: 'in_progress',
      problemStatement: 'Students at our school throw away an average of 200 single-use plastic bottles per day, contributing to landfill waste and environmental pollution.',
      hmwStatement: 'How might we make it easier and more rewarding for students to use reusable water bottles instead of buying single-use plastic bottles?',
      problemValidation: {
        isValid: true,
        score: 85,
        feedback: 'Strong problem statement with specific data. The scope is appropriate and addresses a real environmental issue.',
        suggestions: ['Consider interviewing canteen staff about purchasing patterns', 'Look into existing refill station usage'],
      },
      empathizeData: {
        interviews: [
          { id: 'int_1', name: 'Student A', role: 'Year 10 Student', insights: ['Forgets reusable bottle at home', 'Vending machines are more convenient', 'Would use refill if closer to classrooms'] },
          { id: 'int_2', name: 'Canteen Manager', role: 'Staff', insights: ['Sells 150+ bottles daily', 'Students prefer cold drinks', 'Has considered eco options but cost is barrier'] },
        ],
        observations: [
          { id: 'obs_1', location: 'Canteen', time: 'Lunch', notes: 'Long queue at vending machine, only 2 refill stations for 800 students' },
        ],
        empathyMaps: [
          { personaId: 'p1', says: ['I always forget my bottle'], thinks: ['Its too hard to be eco-friendly'], does: ['Buys from vending machine'], feels: ['Guilty but convenience wins'] },
        ],
      },
      defineData: {
        insights: [
          'Convenience is the primary barrier to sustainable behavior',
          'Students want to be eco-friendly but need easier options',
          'Gamification and social recognition could motivate change',
        ],
        personas: [
          { id: 'p1', name: 'Busy Ben', age: 15, description: 'Always rushing between classes, values convenience above all' },
        ],
      },
      ideateData: {
        ideas: [
          { id: 'idea_1', title: 'Refill Station Network', description: 'Install more refill stations with cold water', votes: 5, selected: true },
          { id: 'idea_2', title: 'Bottle Tracking App', description: 'App that tracks refills and rewards with points', votes: 8, selected: true },
          { id: 'idea_3', title: 'School Bottle Program', description: 'Free reusable bottle for all students', votes: 6, selected: false },
        ],
        selectedConcept: 'EcoSip - A gamified app that tracks water bottle refills via QR codes on new refill stations, awarding points redeemable for canteen credits',
      },
      prototypeData: {
        iterations: [
          {
            version: 1,
            description: 'Paper prototype of app screens',
            feedback: 'UI too complex, simplify main tracking screen',
            changes: ['Reduced to 3 main screens', 'Added one-tap tracking'],
          },
          {
            version: 2,
            description: 'Figma interactive prototype',
            feedback: 'Great progress! Consider adding social leaderboard',
            changes: ['Added class vs class competition feature'],
          },
        ],
        currentPrototype: {
          type: 'figma',
          url: 'https://figma.com/proto/ecosip-v2',
          screens: ['Home/Tracker', 'Leaderboard', 'Rewards', 'Profile'],
        },
      },
      iterateData: {},
      pitchData: {},
      phaseProgress: {
        empathize: 100,
        define: 100,
        ideate: 100,
        prototype: 75,
        iterate: 0,
        pitch: 0,
      },
      overallProgress: 62,
      aiInteractions: 24,
    },
  });

  console.log('Created sample design journey for Emma');

  // Create Design Artifacts for Emma's journey
  await prisma.designArtifact.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'artifact_emma_interview_1',
        tenantId: tenant.id,
        journeyId: emmaJourney.id,
        userId: learnerUser.id,
        type: 'interview',
        title: 'Interview with Year 10 Student',
        description: 'Understanding student habits around water bottle usage',
        phase: 'empathize',
        content: {
          interviewee: 'Anonymous Student A',
          role: 'Year 10 Student',
          duration: '15 minutes',
          keyQuotes: [
            'I always mean to bring my bottle but forget it',
            'The vending machine is right there when Im thirsty',
            'Id use a refill station if it was cold water',
          ],
          insights: ['Convenience is primary driver', 'Temperature matters', 'Habit formation is key'],
        },
        aiAnalysis: {
          keyThemes: ['convenience', 'habit', 'infrastructure'],
          sentimentScore: 0.6,
          suggestedFollowUps: ['Ask about incentives', 'Explore social factors'],
        },
        skillsTagged: ['User Research', 'Active Listening', 'Empathy'],
        qualityScore: 88,
        status: 'submitted',
        visibility: 'journey',
      },
      {
        id: 'artifact_emma_empathymap_1',
        tenantId: tenant.id,
        journeyId: emmaJourney.id,
        userId: learnerUser.id,
        type: 'empathy_map',
        title: 'Busy Student Empathy Map',
        description: 'Understanding the rushed student who defaults to convenience',
        phase: 'empathize',
        content: {
          personaName: 'Busy Ben',
          says: ['I dont have time', 'Its just easier to buy one', 'I care about the environment but...'],
          thinks: ['Another thing to remember', 'Being sustainable is hard', 'Maybe tomorrow Ill bring my bottle'],
          does: ['Rushes between classes', 'Buys from vending machine', 'Throws bottle in general waste'],
          feels: ['Rushed', 'Guilty', 'Frustrated with themselves'],
        },
        skillsTagged: ['Empathy', 'Persona Development', 'Synthesis'],
        qualityScore: 92,
        status: 'submitted',
        visibility: 'journey',
      },
      {
        id: 'artifact_emma_prototype_1',
        tenantId: tenant.id,
        journeyId: emmaJourney.id,
        userId: learnerUser.id,
        type: 'prototype',
        title: 'EcoSip App - Paper Prototype',
        description: 'Initial paper sketches of the gamified refill tracking app',
        phase: 'prototype',
        content: {
          prototypeType: 'paper',
          fidelity: 'low',
          screens: ['Home', 'Scan QR', 'Points Earned', 'Leaderboard'],
          testingNotes: 'Tested with 5 classmates, main feedback was to simplify the home screen',
        },
        thumbnailUrl: '/placeholder-prototype.jpg',
        version: 1,
        skillsTagged: ['Rapid Prototyping', 'UX Design', 'Iteration'],
        qualityScore: 78,
        status: 'submitted',
        visibility: 'journey',
      },
      {
        id: 'artifact_emma_prototype_2',
        tenantId: tenant.id,
        journeyId: emmaJourney.id,
        userId: learnerUser.id,
        type: 'prototype',
        title: 'EcoSip App - Digital Prototype v2',
        description: 'Interactive Figma prototype with simplified UX',
        phase: 'prototype',
        content: {
          prototypeType: 'figma',
          fidelity: 'high',
          url: 'https://figma.com/proto/ecosip-v2',
          screens: ['Home/Tracker', 'Leaderboard', 'Rewards', 'Profile'],
          interactions: ['Tap to scan', 'Pull to refresh leaderboard', 'Swipe for rewards'],
          testingNotes: 'Much better reception - students loved the leaderboard feature',
        },
        parentArtifactId: 'artifact_emma_prototype_1',
        version: 2,
        skillsTagged: ['Digital Prototyping', 'UI Design', 'User Testing', 'Iteration'],
        qualityScore: 91,
        status: 'submitted',
        visibility: 'journey',
      },
    ],
  });

  console.log('Created design artifacts');

  // Create a Showcase Portfolio for Emma (for her completed work so far)
  await prisma.showcasePortfolio.upsert({
    where: { id: 'showcase_emma_ecosip' },
    update: {},
    create: {
      id: 'showcase_emma_ecosip',
      tenantId: tenant.id,
      userId: learnerUser.id,
      journeyId: emmaJourney.id,
      title: 'EcoSip: Sustainable Campus Innovation',
      headline: 'My journey designing eco-friendly solutions for student water consumption',
      bio: 'Hi! Im Emma, a Year 8 student passionate about environmental sustainability. This portfolio documents my design thinking journey to reduce plastic waste at school.',
      customSlug: 'emma-ecosip-2024',
      visibility: 'public',
      theme: {
        primaryColor: '#22c55e',
        backgroundColor: '#f0fdf4',
        fontFamily: 'Inter',
      },
      layout: 'standard',
      executiveSummary: 'Through extensive user research and iterative prototyping, I designed EcoSip - a gamified app that encourages students to use reusable water bottles by tracking refills and awarding points redeemable for canteen credits.',
      growthNarrative: 'This project taught me the importance of truly understanding users before jumping to solutions. My initial ideas changed completely after conducting interviews, and I learned that convenience often trumps good intentions.',
      skillTags: [
        { skill: 'User Research', confidence: 85, evidence: ['Conducted 5 interviews', 'Created empathy maps'] },
        { skill: 'Rapid Prototyping', confidence: 90, evidence: ['Paper prototypes', 'Figma interactive prototype'] },
        { skill: 'Design Thinking', confidence: 88, evidence: ['Completed 4 of 6 phases', 'Validated problem statement'] },
        { skill: 'Sustainability Mindset', confidence: 92, evidence: ['Identified environmental problem', 'Designed behavior change solution'] },
      ],
      totalViews: 47,
      uniqueViews: 32,
      averageTimeOnPage: 124.5,
      status: 'published',
      publishedAt: new Date('2024-01-20'),
    },
  });

  console.log('Created showcase portfolio');

  // ============================================================================
  // LINGUAFLOW - FRENCH LANGUAGE LEARNING
  // ============================================================================

  // Create French language profile for Emma (the learner)
  const frenchProfile = await prisma.languageLearnerProfile.upsert({
    where: { id: 'linguaflow_emma_french' },
    update: {},
    create: {
      id: 'linguaflow_emma_french',
      tenantId: tenant.id,
      userId: learnerUser.id,
      targetLanguage: 'fra', // French (ISO 639-3)
      nativeLanguage: 'eng',
      additionalLanguages: [],
      overallLevel: 'A2',
      listeningLevel: 'A2',
      speakingLevel: 'A1',
      readingLevel: 'A2',
      writingLevel: 'A1',
      isHeritageSpeaker: false,
      curriculumFramework: 'ACARA',
      yearLevel: 'Year 8',
      ibProgramme: 'MYP',
      ibPhaseOrLevel: '3',
      ibCriteriaScores: {
        A: { score: 5, evidence: 'Listening comprehension test' },
        B: { score: 4, evidence: 'Oral presentation' },
        C: { score: 5, evidence: 'Reading assessment' },
        D: { score: 4, evidence: 'Written composition' },
      },
      currentLevel: 3,
      totalXp: 1250,
      currentStreak: 5,
      longestStreak: 12,
      totalLearningMinutes: 480,
      totalSpeakingMinutes: 45,
      lastActiveAt: new Date(),
      status: 'active',
      enrolledAt: new Date('2024-02-01'),
    },
  });

  console.log(`Created LinguaFlow French profile for Emma`);

  // Create vocabulary progress for Emma's French
  const frenchVocabProgress = await prisma.languageVocabularyProgress.upsert({
    where: { profileId: frenchProfile.id },
    update: {},
    create: {
      profileId: frenchProfile.id,
      totalWordsExposed: 245,
      totalWordsLearning: 78,
      totalWordsMastered: 156,
      averageRetentionRate: 0.82,
      dueForReview: 5,
      nextReviewAt: new Date(),
    },
  });

  // Create some French vocabulary items
  const frenchVocabulary = [
    { wordId: 'fr_bonjour', word: 'bonjour', translation: 'hello/good morning', cefrLevel: 'A1', partOfSpeech: 'interjection' },
    { wordId: 'fr_merci', word: 'merci', translation: 'thank you', cefrLevel: 'A1', partOfSpeech: 'interjection' },
    { wordId: 'fr_ecole', word: 'école', translation: 'school', cefrLevel: 'A1', partOfSpeech: 'noun' },
    { wordId: 'fr_maison', word: 'maison', translation: 'house', cefrLevel: 'A1', partOfSpeech: 'noun' },
    { wordId: 'fr_famille', word: 'famille', translation: 'family', cefrLevel: 'A1', partOfSpeech: 'noun' },
    { wordId: 'fr_manger', word: 'manger', translation: 'to eat', cefrLevel: 'A1', partOfSpeech: 'verb' },
    { wordId: 'fr_boire', word: 'boire', translation: 'to drink', cefrLevel: 'A1', partOfSpeech: 'verb' },
    { wordId: 'fr_parler', word: 'parler', translation: 'to speak', cefrLevel: 'A1', partOfSpeech: 'verb' },
    { wordId: 'fr_cependant', word: 'cependant', translation: 'however', cefrLevel: 'A2', partOfSpeech: 'adverb' },
    { wordId: 'fr_environ', word: 'environ', translation: 'about/approximately', cefrLevel: 'A2', partOfSpeech: 'adverb' },
  ];

  for (const vocab of frenchVocabulary) {
    await prisma.languageVocabularyItem.upsert({
      where: { progressId_wordId: { progressId: frenchVocabProgress.id, wordId: vocab.wordId } },
      update: {},
      create: {
        progressId: frenchVocabProgress.id,
        ...vocab,
        exampleSentence: vocab.cefrLevel === 'A1' ? `Je dis "${vocab.word}" souvent.` : null,
        masteryLevel: vocab.cefrLevel === 'A1' ? 'mastered' : 'learning',
        easeFactor: 2.5,
        interval: vocab.cefrLevel === 'A1' ? 21 : 3,
        repetitions: vocab.cefrLevel === 'A1' ? 5 : 2,
        nextReviewAt: new Date(Date.now() + (vocab.cefrLevel === 'A1' ? 21 : 3) * 24 * 60 * 60 * 1000),
        timesCorrect: vocab.cefrLevel === 'A1' ? 8 : 3,
        timesIncorrect: vocab.cefrLevel === 'A1' ? 1 : 2,
      },
    });
  }

  console.log(`Created ${frenchVocabulary.length} French vocabulary items`);

  // Create a sample French conversation
  await prisma.languageConversation.upsert({
    where: { id: 'conv_french_cafe' },
    update: {},
    create: {
      id: 'conv_french_cafe',
      profileId: frenchProfile.id,
      mode: 'roleplay',
      language: 'fra',
      cefrLevel: 'A2',
      aiRole: 'cafe_server',
      aiPersona: 'Marie',
      scenarioTitle: 'Ordering at a French Café',
      targetVocabulary: ['commander', 'café', 'croissant', 'addition'],
      targetStructures: ['Je voudrais...', 'Est-ce que...'],
      messages: [
        { role: 'assistant', content: 'Bonjour! Bienvenue au Café de Paris. Qu\'est-ce que vous désirez?', timestamp: new Date().toISOString() },
        { role: 'user', content: 'Bonjour! Je voudrais un café, s\'il vous plaît.', timestamp: new Date().toISOString() },
        { role: 'assistant', content: 'Très bien! Un café crème ou un café noir?', timestamp: new Date().toISOString() },
        { role: 'user', content: 'Un café crème, s\'il vous plaît.', timestamp: new Date().toISOString() },
        { role: 'assistant', content: 'Parfait! Et avec ça? Nous avons des croissants frais.', timestamp: new Date().toISOString() },
      ],
      fluencyScore: 0.75,
      accuracyScore: 0.82,
      overallScore: 0.78,
      vocabularyUsed: ['bonjour', 'café', 'crème'],
      xpEarned: 45,
      startedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    },
  });

  console.log('Created French conversation session');

  // ============================================================================
  // EARLY YEARS (LITTLE EXPLORERS) - FAMILY & CHILD
  // ============================================================================

  // Create Early Years Family (the parent account)
  const earlyYearsFamily = await prisma.earlyYearsFamily.upsert({
    where: { id: 'eyfamily_smith' },
    update: {},
    create: {
      id: 'eyfamily_smith',
      tenantId: tenant.id,
      primaryUserId: parentUser.id,
      familyName: 'Smith Family',
      primaryLanguage: 'en',
      homeLanguages: ['en'],
      timezone: 'Australia/Sydney',
      subscriptionTier: 'family',
      subscriptionStatus: 'active',
      subscriptionExpiresAt: new Date('2025-12-31'),
      totalLearningMinutes: 320,
      lastActiveAt: new Date(),
      dataProcessingConsent: true,
      dataProcessingConsentAt: new Date('2024-01-15'),
    },
  });

  console.log('Created Early Years family account');

  // Create Early Years Child (younger sibling - Lily, age 5)
  const earlyYearsChild = await prisma.earlyYearsChild.upsert({
    where: { id: 'eychild_lily' },
    update: {},
    create: {
      id: 'eychild_lily',
      tenantId: tenant.id,
      familyId: earlyYearsFamily.id,
      firstName: 'Lily',
      preferredName: 'Lily',
      dateOfBirth: new Date('2019-08-20'), // Age 5
      avatarId: 'bunny_pink',
      currentWorld: 'phonics_forest',
      currentMentor: 'ollie_owl',
      totalTreasures: 45,
      totalStars: 128,
      totalLearningMinutes: 320,
      totalSessions: 24,
      currentStreak: 3,
      longestStreak: 7,
      lastActiveAt: new Date(),
      status: 'active',
      enrolledAt: new Date('2024-06-01'),
    },
  });

  console.log('Created Early Years child (Lily, age 5)');

  // Create Picture Password for Lily
  await prisma.earlyYearsPicturePassword.upsert({
    where: { childId: earlyYearsChild.id },
    update: {},
    create: {
      childId: earlyYearsChild.id,
      imageSequenceHash: hashPassword('bunny-star-rainbow'), // Demo: bunny → star → rainbow
      sequenceLength: 3,
      failedAttempts: 0,
    },
  });

  console.log('Created picture password for Lily');

  // Create Phonics Progress for Lily
  await prisma.earlyYearsPhonicsProgress.upsert({
    where: { childId: earlyYearsChild.id },
    update: {},
    create: {
      childId: earlyYearsChild.id,
      currentPhase: 2,
      masteredGraphemes: ['s', 'a', 't', 'p', 'i', 'n', 'm', 'd'],
      introducedGraphemes: ['g', 'o', 'c', 'k'],
      strugglingGraphemes: ['ck'],
      blendingAccuracy: 0.75,
      segmentingAccuracy: 0.68,
      sightWordsMastered: ['the', 'and', 'is', 'it', 'in', 'at'],
      sightWordsIntroduced: ['to', 'he', 'she', 'we'],
      graphemeHistory: [
        { grapheme: 's', masteredAt: '2024-06-15', accuracy: 0.95 },
        { grapheme: 'a', masteredAt: '2024-06-18', accuracy: 0.92 },
        { grapheme: 't', masteredAt: '2024-06-22', accuracy: 0.90 },
        { grapheme: 'p', masteredAt: '2024-07-01', accuracy: 0.88 },
        { grapheme: 'i', masteredAt: '2024-07-10', accuracy: 0.91 },
        { grapheme: 'n', masteredAt: '2024-07-20', accuracy: 0.89 },
        { grapheme: 'm', masteredAt: '2024-08-01', accuracy: 0.87 },
        { grapheme: 'd', masteredAt: '2024-08-15', accuracy: 0.85 },
      ],
    },
  });

  console.log('Created phonics progress for Lily');

  // Create Numeracy Progress for Lily
  await prisma.earlyYearsNumeracyProgress.upsert({
    where: { childId: earlyYearsChild.id },
    update: {},
    create: {
      childId: earlyYearsChild.id,
      currentLevel: 'counting',
      reliableCountingRange: 15,
      highestNumberRecognised: 20,
      subitizingAccuracy: 0.85,
      additionAccuracy: 0.72,
      subtractionAccuracy: 0.0, // Not yet introduced
      numeralsRecognized: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
      operationsIntroduced: ['addition'],
      shapesKnown: ['circle', 'square', 'triangle', 'rectangle'],
      operationHistory: [
        { operation: 'counting', date: '2024-06-01', range: 5 },
        { operation: 'counting', date: '2024-07-15', range: 10 },
        { operation: 'counting', date: '2024-09-01', range: 15 },
        { operation: 'addition_intro', date: '2024-10-01', maxSum: 5 },
      ],
    },
  });

  console.log('Created numeracy progress for Lily');

  // Create a recent Early Years session
  const recentSession = await prisma.earlyYearsSession.upsert({
    where: { id: 'eysession_lily_recent' },
    update: {},
    create: {
      id: 'eysession_lily_recent',
      tenantId: tenant.id,
      childId: earlyYearsChild.id,
      familyId: earlyYearsFamily.id,
      sessionType: 'learning',
      world: 'phonics_forest',
      mentor: 'ollie_owl',
      maxDurationMinutes: 15,
      maxActivities: 10,
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      endedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 12 * 60 * 1000), // 12 min session
      durationMinutes: 12,
      totalActivities: 6,
      activitiesCompleted: 5,
      graphemesPracticed: ['g', 'o', 'c'],
      numbersPracticed: [11, 12, 13],
      treasuresEarned: 3,
      starsEarned: 8,
      averageFocusScore: 0.82,
      childMoodRating: 5, // Happy!
      parentNotes: 'Great session! Lily loved the owl character.',
    },
  });

  // Create activities for the session
  await prisma.earlyYearsActivity.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'eyact_1',
        sessionId: recentSession.id,
        activityType: 'phonics_recognition',
        targetContent: ['g'],
        difficulty: 1,
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 90 * 1000),
        durationSeconds: 90,
        score: 0.9,
        attempts: 1,
        hintsUsed: 0,
        errorsCommitted: 1,
        treasureAwarded: true,
      },
      {
        id: 'eyact_2',
        sessionId: recentSession.id,
        activityType: 'phonics_blending',
        targetContent: ['g', 'o', 't'],
        difficulty: 2,
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 2 * 60 * 1000),
        completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 4 * 60 * 1000),
        durationSeconds: 120,
        score: 0.8,
        attempts: 2,
        hintsUsed: 1,
        errorsCommitted: 2,
        treasureAwarded: true,
      },
      {
        id: 'eyact_3',
        sessionId: recentSession.id,
        activityType: 'number_counting',
        targetContent: ['11', '12', '13'],
        difficulty: 1,
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000),
        completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 7 * 60 * 1000),
        durationSeconds: 120,
        score: 1.0,
        attempts: 1,
        hintsUsed: 0,
        errorsCommitted: 0,
        treasureAwarded: true,
      },
    ],
  });

  console.log('Created Early Years session with activities');

  // ============================================================================
  // PARENT DASHBOARD DATA
  // ============================================================================

  // Update parent profile with Early Years child link
  await prisma.parentProfile.update({
    where: { userId: parentUser.id },
    data: {
      childIds: [learnerUser.id], // Emma
      notificationPreferences: {
        channels: { email: true, sms: true, push: true, inApp: true },
        categories: {
          bookingConfirmations: true,
          sessionReminders: true,
          sessionFeedback: true,
          paymentReceipts: true,
          progressReports: true,
          newTutorMatches: true,
          communityUpdates: true,
          marketplaceDeals: true,
          complianceAlerts: true,
          earlyYearsProgress: true, // New: Early Years notifications
          earlyYearsMilestones: true,
          linguaFlowProgress: true, // New: Language learning notifications
        },
        quietHours: { enabled: true, start: '20:00', end: '07:00', timezone: 'Australia/Sydney' },
        reminderLeadTime: 60,
      },
    },
  });

  console.log('Updated parent profile with child links and notification preferences');

  // ============================================================================
  // KYC / WWCC / KYB VERIFICATION DATA
  // ============================================================================

  // Create KYC verification for tutor (Sarah Chen)
  await prisma.identityVerification.upsert({
    where: { id: 'kyc_tutor_sarah' },
    update: {},
    create: {
      id: 'kyc_tutor_sarah',
      tenantId: tenant.id,
      userId: tutorUser.id,
      provider: 'stripe_identity',
      providerVerificationId: 'vs_demo_sarah_chen_verified',
      status: 'verified',
      verificationLevel: 'standard',
      documentType: 'drivers_license',
      documentCountry: 'AU',
      documentState: 'NSW',
      verifiedFirstName: 'Sarah',
      verifiedLastName: 'Chen',
      verifiedDateOfBirth: new Date('1992-03-15'),
      addressVerified: true,
      addressLine1: '123 Education Lane',
      addressCity: 'Sydney',
      addressState: 'NSW',
      addressPostalCode: '2000',
      addressCountry: 'AU',
      selfieMatch: true,
      selfieMatchScore: 0.98,
      livenessCheck: true,
      livenessCheckScore: 0.99,
      riskScore: 5,
      riskSignals: [],
      verifiedAt: new Date('2024-01-10'),
      expiresAt: new Date('2027-01-10'),
      metadata: {
        verificationMethod: 'document_scan',
        processingTime: 45,
      },
    },
  });

  console.log('Created KYC verification for tutor (Sarah Chen)');

  // Create WWCC verification for tutor (Sarah Chen)
  await prisma.wWCCVerification.upsert({
    where: { id: 'wwcc_tutor_sarah' },
    update: {},
    create: {
      id: 'wwcc_tutor_sarah',
      tenantId: tenant.id,
      userId: tutorUser.id,
      state: 'NSW',
      wwccNumber: 'WWC1234567E',
      status: 'verified',
      clearanceType: 'employee',
      verificationMethod: 'api',
      verifiedName: 'Sarah Chen',
      verifiedAt: new Date('2024-01-12'),
      expiresAt: new Date('2029-01-12'),
      lastCheckedAt: new Date(),
      checkFrequency: 90,
      isMonitored: true,
      monitoringActive: true,
      lastMonitoringCheck: new Date(),
      metadata: {
        applicationDate: '2023-12-01',
        processingTime: 14,
      },
    },
  });

  console.log('Created WWCC verification for tutor (Sarah Chen)');

  // Create KYC verification for teacher (James Wilson)
  await prisma.identityVerification.upsert({
    where: { id: 'kyc_teacher_james' },
    update: {},
    create: {
      id: 'kyc_teacher_james',
      tenantId: tenant.id,
      userId: teacherUser.id,
      provider: 'stripe_identity',
      providerVerificationId: 'vs_demo_james_wilson_verified',
      status: 'verified',
      verificationLevel: 'standard',
      documentType: 'passport',
      documentCountry: 'AU',
      verifiedFirstName: 'James',
      verifiedLastName: 'Wilson',
      verifiedDateOfBirth: new Date('1985-07-22'),
      addressVerified: true,
      addressLine1: '456 Teacher Street',
      addressCity: 'Sydney',
      addressState: 'NSW',
      addressPostalCode: '2010',
      addressCountry: 'AU',
      selfieMatch: true,
      selfieMatchScore: 0.97,
      livenessCheck: true,
      livenessCheckScore: 0.98,
      riskScore: 3,
      riskSignals: [],
      verifiedAt: new Date('2023-06-15'),
      expiresAt: new Date('2026-06-15'),
    },
  });

  console.log('Created KYC verification for teacher (James Wilson)');

  // Create WWCC verification for teacher (James Wilson)
  await prisma.wWCCVerification.upsert({
    where: { id: 'wwcc_teacher_james' },
    update: {},
    create: {
      id: 'wwcc_teacher_james',
      tenantId: tenant.id,
      userId: teacherUser.id,
      state: 'NSW',
      wwccNumber: 'WWC7654321E',
      status: 'verified',
      clearanceType: 'employee',
      verificationMethod: 'api',
      verifiedName: 'James Wilson',
      verifiedAt: new Date('2023-06-20'),
      expiresAt: new Date('2028-06-20'),
      lastCheckedAt: new Date(),
      checkFrequency: 90,
      isMonitored: true,
      monitoringActive: true,
      lastMonitoringCheck: new Date(),
    },
  });

  console.log('Created WWCC verification for teacher (James Wilson)');

  // Create parent KYC (for booking tutors)
  await prisma.identityVerification.upsert({
    where: { id: 'kyc_parent_david' },
    update: {},
    create: {
      id: 'kyc_parent_david',
      tenantId: tenant.id,
      userId: parentUser.id,
      provider: 'stripe_identity',
      providerVerificationId: 'vs_demo_david_smith_verified',
      status: 'verified',
      verificationLevel: 'basic',
      documentType: 'drivers_license',
      documentCountry: 'AU',
      documentState: 'NSW',
      verifiedFirstName: 'David',
      verifiedLastName: 'Smith',
      verifiedDateOfBirth: new Date('1982-11-08'),
      addressVerified: true,
      addressLine1: '789 Parent Avenue',
      addressCity: 'Parramatta',
      addressState: 'NSW',
      addressPostalCode: '2150',
      addressCountry: 'AU',
      selfieMatch: true,
      selfieMatchScore: 0.96,
      livenessCheck: true,
      livenessCheckScore: 0.97,
      riskScore: 8,
      riskSignals: [],
      verifiedAt: new Date('2024-02-01'),
      expiresAt: new Date('2027-02-01'),
    },
  });

  console.log('Created KYC verification for parent (David Smith)');

  // Create verification audit log entries
  await prisma.verificationAuditLog.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'audit_kyc_sarah_1',
        tenantId: tenant.id,
        verificationId: 'kyc_tutor_sarah',
        verificationType: 'identity',
        action: 'verification_completed',
        previousStatus: 'pending',
        newStatus: 'verified',
        performedBy: 'system',
        ipAddress: '10.0.0.1',
        userAgent: 'Stripe-Identity-Webhook/1.0',
        details: { provider: 'stripe_identity', documentType: 'drivers_license' },
        createdAt: new Date('2024-01-10'),
      },
      {
        id: 'audit_wwcc_sarah_1',
        tenantId: tenant.id,
        verificationId: 'wwcc_tutor_sarah',
        verificationType: 'wwcc',
        action: 'verification_completed',
        previousStatus: 'pending',
        newStatus: 'verified',
        performedBy: 'system',
        ipAddress: '10.0.0.1',
        userAgent: 'WWCC-API-Client/1.0',
        details: { state: 'NSW', clearanceType: 'employee' },
        createdAt: new Date('2024-01-12'),
      },
    ],
  });

  console.log('Created verification audit logs');

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📋 Demo Credentials (Password for all: demo123):');
  console.log('  👤 Admin:   admin@scholarly.app');
  console.log('  🏫 Teacher: teacher@scholarly.app (Dr. James Wilson)');
  console.log('  👨‍🏫 Tutor:   tutor@scholarly.app (Sarah Chen)');
  console.log('  👪 Parent:  parent@scholarly.app (David Smith)');
  console.log('  🎓 Learner: learner@scholarly.app (Emma Smith)');
  console.log('\n📚 Sample Data Created:');
  console.log('  • 2 Subjects (Mathematics, Physics)');
  console.log('  • 3 Curriculum Standards (ACARA Mathematics)');
  console.log('  • 1 Content Resource (Fractions worksheet)');
  console.log('  • 1 Homeschool Family with child and address');
  console.log('  • 1 Tutor Profile with availability slots and pricing tiers');
  console.log('  • 2 Design Challenges (Sustainability, Wellness)');
  console.log('  • 1 Active Design Journey (Emma - EcoSip project)');
  console.log('  • 4 Design Artifacts (interviews, empathy maps, prototypes)');
  console.log('  • 1 Showcase Portfolio (published)');
  console.log('\n🇫🇷 LinguaFlow French Demo:');
  console.log('  • Emma\'s French profile (CEFR A2, MYP Phase 3)');
  console.log('  • 10 French vocabulary items with SM-2 SRS data');
  console.log('  • 1 Café conversation roleplay session');
  console.log('\n👶 Early Years (Little Explorers) Demo:');
  console.log('  • Smith Family account (parent: David)');
  console.log('  • Lily (age 5) - child profile');
  console.log('  • Picture password: bunny → star → rainbow');
  console.log('  • Phonics Phase 2 (8 graphemes mastered)');
  console.log('  • Numeracy: counting to 15, addition introduced');
  console.log('  • 1 Recent learning session with activities');
  console.log('\n👨‍👩‍👧‍👦 Parent Portal:');
  console.log('  • Dashboard for Emma (Year 8) & Lily (Early Years)');
  console.log('  • Progress notifications enabled');
  console.log('\n🔐 KYC/WWCC Verification Demo:');
  console.log('  • Sarah Chen (Tutor): KYC verified + WWCC NSW verified');
  console.log('  • James Wilson (Teacher): KYC verified + WWCC NSW verified');
  console.log('  • David Smith (Parent): KYC verified');
  console.log('  • Verification audit trail records');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
