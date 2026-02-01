/**
 * Scholarly Hosting - Database Seed
 * 
 * Seeds the database with sample data for development and testing.
 * 
 * @module ScholarlyHosting/Prisma
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample school provider
  const school = await prisma.educationalProvider.create({
    data: {
      tenantId: 'tenant_seed_001',
      type: 'school',
      displayName: 'Brighton Grammar School',
      legalName: 'Brighton Grammar School Ltd',
      description: 'An independent school committed to academic excellence and personal growth, providing comprehensive education from Year 7 to Year 12.',
      tagline: 'Learning for Life',
      primaryDomain: 'brighton-grammar.scholar.ly',
      primaryContact: {
        name: 'Jane Smith',
        role: 'Admissions Director',
        email: 'admissions@brightongrammar.example.edu.au',
        phone: '+61 3 9555 1234',
        preferredContact: 'email'
      },
      features: {
        customDomains: true,
        multipleLocations: false,
        advancedAnalytics: true,
        agentApiAccess: true,
        structuredDataEnhanced: true,
        aiRecommendationsEnabled: true,
        onlineEnrollment: true,
        waitlistManagement: true,
        tourBooking: true,
        blogEnabled: true,
        eventsCalendar: true,
        resourceLibrary: true,
        webhooksEnabled: false,
        apiAccess: true,
        lisIntegration: false,
        whiteLabel: false,
        prioritySupport: true,
        customReporting: false
      },
      seoConfig: {
        defaultTitle: 'Brighton Grammar School',
        titleTemplate: '%s | Brighton Grammar School',
        defaultDescription: 'An independent school committed to academic excellence.',
        defaultKeywords: ['school', 'education', 'Brighton', 'VIC'],
        ogImage: null,
        ogType: 'website',
        twitterCard: 'summary_large_image',
        twitterSite: null,
        organizationSchema: {},
        robotsConfig: {
          allowIndexing: true,
          allowFollowing: true,
          disallowPaths: ['/admin', '/api'],
          crawlDelay: null
        },
        sitemapEnabled: true
      },
      agentConfig: {
        apiEnabled: true,
        apiKey: null,
        apiKeyPrefix: null,
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerHour: 1000,
          requestsPerDay: 10000,
          burstLimit: 10
        },
        capabilities: {
          searchProviders: true,
          searchOfferings: true,
          getProviderDetails: true,
          getOfferingDetails: true,
          checkAvailability: true,
          compareProviders: true,
          compareOfferings: true,
          getQualityProfile: true,
          getVerifiedOutcomes: true,
          getReviews: true,
          getComplianceStatus: false,
          checkEnrollmentEligibility: false,
          submitEnquiry: true,
          bookTour: true,
          reservePlace: false
        },
        discoverability: {
          showInSearch: true,
          showPricing: true,
          showAvailability: true,
          showOutcomes: true,
          showStaffInfo: true,
          targetAreas: [],
          targetYearLevels: [],
          targetNeedsTypes: []
        }
      },
      theme: {
        primaryColor: '#1e40af',
        secondaryColor: '#3b82f6',
        accentColor: '#60a5fa',
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        fontFamily: 'Inter, sans-serif',
        customCss: null
      },
      scholarlyTenantId: 'tenant_seed_001',
      status: 'active',
      locations: {
        create: {
          name: 'Main Campus',
          isPrimary: true,
          streetAddress: '100 Education Way',
          addressLocality: 'Brighton',
          addressRegion: 'VIC',
          postalCode: '3186',
          addressCountry: 'AU',
          latitude: -37.9075,
          longitude: 144.9876,
          phone: '+61 3 9555 1234',
          email: 'info@brightongrammar.example.edu.au',
          timezone: 'Australia/Melbourne'
        }
      },
      domains: {
        create: {
          domain: 'brighton-grammar.scholar.ly',
          type: 'subdomain',
          status: 'verified',
          sslStatus: 'active',
          sslExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          verifiedAt: new Date()
        }
      },
      qualityProfile: {
        create: {
          overallScore: 87,
          scoreBreakdown: {
            registration: 100,
            accreditation: 85,
            outcomes: 92,
            reviews: 88,
            staffQualifications: 90,
            compliance: 100,
            engagement: 75
          },
          registrationStatus: 'registered',
          registrationDetails: {
            registrationNumber: 'REG123456',
            registrationBody: 'VRQA',
            registeredAt: '2010-01-15',
            sector: 'independent',
            schoolType: 'Secondary'
          },
          verificationLevel: 'outcomes_verified',
          complianceStatus: 'compliant',
          confidenceLevel: 0.85,
          dataCompleteness: 0.9,
          aggregateRating: {
            average: 4.6,
            count: 234,
            distribution: { star1: 5, star2: 8, star3: 25, star4: 76, star5: 120 },
            recommendationRate: 92,
            responseRate: 85
          },
          staffQualifications: {
            totalStaff: 85,
            teachingStaff: 65,
            qualifiedTeachers: 63,
            advancedDegrees: 28,
            averageExperienceYears: 12,
            studentTeacherRatio: 12,
            specialistStaff: [
              { area: 'Learning Support', count: 5 },
              { area: 'Gifted Education', count: 2 }
            ],
            lastUpdated: new Date(),
            verifiedByScholarly: true
          },
          accreditations: {
            create: [
              {
                body: 'IB World School',
                type: 'DP',
                level: 'Diploma Programme',
                issuedAt: new Date('2015-06-01'),
                expiresAt: new Date('2025-06-01'),
                status: 'active',
                verifiedByScholarly: true,
                verifiedAt: new Date()
              }
            ]
          },
          verifiedOutcomes: {
            create: [
              {
                type: 'academic_achievement',
                metric: 'NAPLAN Reading Year 9',
                value: 612,
                unit: 'score',
                comparisonBasis: 'state average',
                comparisonValue: 580,
                percentile: 85,
                year: 2024,
                cohortSize: 150,
                verifiedAt: new Date(),
                verifiedBy: 'naplan',
                dataSource: 'MySchool',
                confidenceLevel: 0.95,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
              }
            ]
          },
          complianceRecords: {
            create: [
              {
                type: 'Child Safety',
                status: 'compliant',
                issuedBy: 'Department of Education',
                issuedAt: new Date('2024-01-15'),
                expiresAt: new Date('2025-01-15')
              }
            ]
          }
        }
      }
    }
  });

  console.log(`✅ Created school provider: ${school.displayName}`);

  // Create sample tutor provider
  const tutor = await prisma.educationalProvider.create({
    data: {
      tenantId: 'tenant_seed_002',
      type: 'solo_tutor',
      displayName: "Sarah's Maths Tutoring",
      description: 'Experienced maths tutor specialising in VCE preparation. Helping students build confidence and achieve their academic goals.',
      tagline: 'Making Maths Make Sense',
      primaryDomain: 'sarah-maths.scholar.ly',
      primaryContact: {
        name: 'Sarah Chen',
        role: 'Tutor',
        email: 'sarah@sarahmaths.example.com',
        phone: '+61 4 1234 5678',
        preferredContact: 'email'
      },
      features: {
        customDomains: true,
        agentApiAccess: true,
        tourBooking: false
      },
      seoConfig: {},
      agentConfig: {
        apiEnabled: true,
        rateLimit: { requestsPerMinute: 30, requestsPerHour: 500, requestsPerDay: 5000, burstLimit: 5 },
        capabilities: {
          searchProviders: true,
          getProviderDetails: true,
          submitEnquiry: true
        },
        discoverability: { showInSearch: true, showPricing: true }
      },
      theme: {
        primaryColor: '#7c3aed',
        secondaryColor: '#8b5cf6',
        accentColor: '#a78bfa',
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        fontFamily: 'Inter, sans-serif'
      },
      scholarlyTenantId: 'tenant_seed_002',
      status: 'active',
      locations: {
        create: {
          name: 'Home Studio',
          isPrimary: true,
          streetAddress: '42 Learning Lane',
          addressLocality: 'Brunswick',
          addressRegion: 'VIC',
          postalCode: '3056',
          addressCountry: 'AU',
          timezone: 'Australia/Melbourne'
        }
      },
      domains: {
        create: {
          domain: 'sarah-maths.scholar.ly',
          type: 'subdomain',
          status: 'verified',
          sslStatus: 'active',
          verifiedAt: new Date()
        }
      },
      qualityProfile: {
        create: {
          overallScore: 82,
          scoreBreakdown: {
            registration: 0,
            accreditation: 0,
            outcomes: 85,
            reviews: 95,
            staffQualifications: 80,
            compliance: 100,
            engagement: 70
          },
          registrationStatus: 'exempt',
          verificationLevel: 'identity_verified',
          complianceStatus: 'compliant',
          confidenceLevel: 0.75,
          dataCompleteness: 0.7,
          aggregateRating: {
            average: 4.9,
            count: 47,
            distribution: { star1: 0, star2: 0, star3: 2, star4: 5, star5: 40 },
            recommendationRate: 98,
            responseRate: 100
          },
          verifiedOutcomes: {
            create: [
              {
                type: 'progress_growth',
                metric: 'Students improved 1+ grade',
                value: 94,
                unit: '%',
                comparisonBasis: 'platform average',
                comparisonValue: 75,
                percentile: 90,
                year: 2024,
                cohortSize: 32,
                verifiedAt: new Date(),
                verifiedBy: 'scholarly',
                dataSource: 'Student surveys',
                confidenceLevel: 0.7,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
              }
            ]
          }
        }
      }
    }
  });

  console.log(`✅ Created tutor provider: ${tutor.displayName}`);

  // Create sample offering for school
  await prisma.educationalOffering.create({
    data: {
      providerId: school.id,
      type: 'school_program',
      name: 'Year 7-12 Secondary Program',
      description: 'Comprehensive secondary education with VCE and IB pathways.',
      shortDescription: 'Secondary education Years 7-12 with VCE/IB options.',
      subjectAreas: ['Mathematics', 'English', 'Science', 'Humanities', 'Languages', 'Arts'],
      yearLevels: ['year_7', 'year_8', 'year_9', 'year_10', 'year_11', 'year_12'],
      learningOutcomes: ['Critical thinking', 'Effective communication', 'Global citizenship'],
      prerequisites: [],
      deliveryModes: ['in_person'],
      duration: { type: 'fixed', value: 6, unit: 'years' },
      availability: { status: 'limited', spotsTotal: 150, spotsAvailable: 23, waitlistSize: 15 },
      pricing: { type: 'fixed', amount: 28500, currency: 'AUD', includesGst: false },
      qualitySignals: { providerQualityScore: 87, reviewCount: 234, averageRating: 4.6 },
      naturalLanguageSummary: 'Brighton Grammar offers a comprehensive secondary education program for students in Years 7-12.',
      parentFriendlySummary: 'Our secondary program guides students from Year 7 through to Year 12.',
      agentContext: 'Independent school, strong academic outcomes, IB World School',
      categories: ['Secondary Education'],
      tags: ['VCE', 'IB', 'Brighton'],
      status: 'published',
      publishedAt: new Date()
    }
  });

  console.log('✅ Created school offering');

  // Create sample offering for tutor
  await prisma.educationalOffering.create({
    data: {
      providerId: tutor.id,
      type: 'tutoring_package',
      name: 'VCE Maths Methods Preparation',
      description: 'Intensive tutoring program for VCE Mathematical Methods, covering all topics with exam preparation.',
      shortDescription: 'VCE Maths Methods tutoring with exam prep.',
      subjectAreas: ['Mathematics'],
      yearLevels: ['year_11', 'year_12'],
      learningOutcomes: ['Master calculus fundamentals', 'Exam technique', 'Problem-solving skills'],
      prerequisites: ['Year 10 Maths'],
      deliveryModes: ['in_person', 'online_live'],
      duration: { type: 'ongoing', sessionsPerWeek: 1 },
      availability: { status: 'limited', spotsAvailable: 3 },
      pricing: { type: 'hourly', amount: 85, currency: 'AUD', includesGst: true },
      qualitySignals: { providerQualityScore: 82, reviewCount: 47, averageRating: 4.9 },
      naturalLanguageSummary: 'One-on-one VCE Maths Methods tutoring with an experienced teacher.',
      parentFriendlySummary: 'Expert maths tutoring to help your child succeed in VCE.',
      agentContext: 'Solo tutor, 8 years experience, 94% students improved',
      categories: ['Tutoring', 'VCE'],
      tags: ['Maths', 'VCE', 'Methods'],
      status: 'published',
      publishedAt: new Date()
    }
  });

  console.log('✅ Created tutor offering');

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
