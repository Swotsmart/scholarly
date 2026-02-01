/**
 * Hosting Structured Data Service
 *
 * Generates Schema.org compliant JSON-LD structured data for educational entities.
 * This enables AI agents and search engines to understand and discover Scholarly providers.
 *
 * @module ScholarlyHosting/Services
 * @version 1.0.0
 */

import { log } from '../lib/logger';
import { Result, success, failure } from './base.service';

import {
  HostingEducationalProvider,
  HostingEducationalOffering,
  HostingPostalAddress,
  HostingAggregateRating,
  HostingYearLevel,
  HostingDeliveryMode,
} from './hosting-types';

// ============================================================================
// JSON-LD TYPES
// ============================================================================

export interface HostingJsonLdDocument {
  '@context': string;
  '@type': string | string[];
  [key: string]: unknown;
}

export interface HostingPostalAddressJsonLd {
  '@type': 'PostalAddress';
  streetAddress?: string;
  addressLocality: string;
  addressRegion: string;
  postalCode: string;
  addressCountry: string;
}

export interface HostingAggregateRatingJsonLd {
  '@type': 'AggregateRating';
  ratingValue: number;
  reviewCount: number;
  bestRating?: number;
  worstRating?: number;
}

export interface HostingPropertyValueJsonLd {
  '@type': 'PropertyValue';
  name: string;
  value: string | number;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class HostingStructuredDataService {
  private readonly schemaContext = 'https://schema.org';

  /**
   * Generate EducationalOrganization JSON-LD from provider.
   */
  generateOrganization(
    provider: HostingEducationalProvider
  ): Result<HostingJsonLdDocument> {
    try {
      const schemaType = this.getOrganizationType(provider.type);

      const jsonLd: HostingJsonLdDocument = {
        '@context': this.schemaContext,
        '@type': schemaType,
        name: provider.displayName,
        url: `https://${provider.primaryDomain}`,
        description: provider.description,
      };

      if (provider.logoUrl) jsonLd.logo = provider.logoUrl;
      if (provider.legalName) jsonLd.legalName = provider.legalName;

      // Primary location
      if (provider.locations.length > 0) {
        const loc =
          provider.locations.find((l) => l.isPrimary) ?? provider.locations[0];
        jsonLd.address = this.buildPostalAddress(loc.address);

        if (loc.coordinates) {
          jsonLd.geo = {
            '@type': 'GeoCoordinates',
            latitude: loc.coordinates.latitude,
            longitude: loc.coordinates.longitude,
          };
        }
        if (loc.phone) jsonLd.telephone = loc.phone;
        if (loc.email) jsonLd.email = loc.email;
      }

      // Accreditations
      const activeAccreds = provider.qualityProfile.accreditations.filter(
        (a) => a.status === 'active'
      );
      if (activeAccreds.length > 0) {
        jsonLd.hasCredential = activeAccreds.map((a) => ({
          '@type': 'EducationalOccupationalCredential',
          name: `${a.body} - ${a.type}`,
          credentialCategory: a.type,
          recognizedBy: { '@type': 'Organization', name: a.body },
        }));
      }

      // Rating
      if (provider.qualityProfile.aggregateRating) {
        jsonLd.aggregateRating = this.buildAggregateRating(
          provider.qualityProfile.aggregateRating
        );
      }

      // Trust signals
      jsonLd.additionalProperty = this.buildProviderTrustProperties(provider);

      return success(jsonLd);
    } catch (error) {
      log.error('Failed to generate Organization JSON-LD', error as Error, {
        providerId: provider.id,
      });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Generate Course JSON-LD from educational offering.
   */
  generateCourse(
    offering: HostingEducationalOffering,
    provider: HostingEducationalProvider
  ): Result<HostingJsonLdDocument> {
    try {
      const jsonLd: HostingJsonLdDocument = {
        '@context': this.schemaContext,
        '@type': 'Course',
        name: offering.name,
        description: offering.description,
        provider: {
          '@type': 'EducationalOrganization',
          name: provider.displayName,
          url: `https://${provider.primaryDomain}`,
        },
      };

      if (offering.yearLevels.length > 0) {
        jsonLd.educationalLevel = this.formatYearLevels(offering.yearLevels);
      }
      if (offering.subjectAreas.length > 0)
        jsonLd.about = offering.subjectAreas;
      if (offering.learningOutcomes.length > 0)
        jsonLd.teaches = offering.learningOutcomes;
      if (offering.prerequisites.length > 0)
        jsonLd.coursePrerequisites = offering.prerequisites;
      if (offering.deliveryModes.length > 0) {
        jsonLd.courseMode = this.mapDeliveryMode(offering.deliveryModes[0]);
      }

      if (
        offering.pricing.type !== 'enquire' &&
        offering.pricing.amount !== null
      ) {
        jsonLd.offers = {
          '@type': 'Offer',
          price: offering.pricing.amount,
          priceCurrency: offering.pricing.currency,
          availability: this.mapAvailability(offering.availability.status),
        };
      }

      jsonLd.additionalProperty = [
        {
          '@type': 'PropertyValue',
          name: 'scholarlyProviderQualityScore',
          value: offering.qualitySignals.providerQualityScore,
        },
      ];

      return success(jsonLd);
    } catch (error) {
      log.error('Failed to generate Course JSON-LD', error as Error, {
        offeringId: offering.id,
      });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Generate WebPage JSON-LD.
   */
  generateWebPage(
    url: string,
    title: string,
    description: string,
    siteName: string,
    siteUrl: string
  ): Result<HostingJsonLdDocument> {
    try {
      return success({
        '@context': this.schemaContext,
        '@type': 'WebPage',
        name: title,
        description,
        url,
        isPartOf: { '@type': 'WebSite', name: siteName, url: siteUrl },
      });
    } catch (error) {
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Generate BreadcrumbList JSON-LD.
   */
  generateBreadcrumbs(
    items: { name: string; url: string }[]
  ): Result<HostingJsonLdDocument> {
    try {
      return success({
        '@context': this.schemaContext,
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      });
    } catch (error) {
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Generate FAQPage JSON-LD.
   */
  generateFAQPage(
    faqs: { question: string; answer: string }[]
  ): Result<HostingJsonLdDocument> {
    try {
      return success({
        '@context': this.schemaContext,
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      });
    } catch (error) {
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Generate Event JSON-LD for open days, info sessions, etc.
   */
  generateEvent(
    name: string,
    description: string,
    startDate: Date,
    endDate: Date,
    location: HostingPostalAddress | { name: string; url: string },
    organizer: { name: string; url: string }
  ): Result<HostingJsonLdDocument> {
    try {
      const isOnline = 'url' in location;

      return success({
        '@context': this.schemaContext,
        '@type': 'EducationEvent',
        name,
        description,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        eventAttendanceMode: isOnline
          ? 'https://schema.org/OnlineEventAttendanceMode'
          : 'https://schema.org/OfflineEventAttendanceMode',
        location: isOnline
          ? {
              '@type': 'VirtualLocation',
              name: (location as { name: string; url: string }).name,
              url: (location as { name: string; url: string }).url,
            }
          : {
              '@type': 'Place',
              address: this.buildPostalAddress(location as HostingPostalAddress),
            },
        organizer: {
          '@type': 'EducationalOrganization',
          name: organizer.name,
          url: organizer.url,
        },
      });
    } catch (error) {
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Generate Review JSON-LD.
   */
  generateReview(
    reviewBody: string,
    rating: number,
    authorName: string,
    datePublished: Date,
    itemReviewed: { name: string; type: string }
  ): Result<HostingJsonLdDocument> {
    try {
      return success({
        '@context': this.schemaContext,
        '@type': 'Review',
        reviewBody,
        reviewRating: {
          '@type': 'Rating',
          ratingValue: rating,
          bestRating: 5,
          worstRating: 1,
        },
        author: {
          '@type': 'Person',
          name: authorName,
        },
        datePublished: datePublished.toISOString(),
        itemReviewed: {
          '@type': itemReviewed.type,
          name: itemReviewed.name,
        },
      });
    } catch (error) {
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Convert JSON-LD to embeddable script tag.
   */
  toScriptTag(documents: HostingJsonLdDocument[]): string {
    if (documents.length === 0) return '';
    const content = documents.length === 1 ? documents[0] : documents;
    return `<script type="application/ld+json">\n${JSON.stringify(content, null, 2)}\n</script>`;
  }

  /**
   * Validate JSON-LD document structure.
   */
  validate(document: HostingJsonLdDocument): Result<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!document['@context']) {
      errors.push('Missing @context');
    }

    if (!document['@type']) {
      errors.push('Missing @type');
    }

    // Type-specific validation
    if (document['@type'] === 'Course' && !document.name) {
      errors.push('Course requires name property');
    }

    if (
      (document['@type'] === 'School' ||
        document['@type'] === 'EducationalOrganization') &&
      !document.name
    ) {
      errors.push('Organization requires name property');
    }

    return success({
      valid: errors.length === 0,
      errors,
    });
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private getOrganizationType(providerType: string): string {
    return providerType === 'school' ? 'School' : 'EducationalOrganization';
  }

  private buildPostalAddress(
    address: HostingPostalAddress
  ): HostingPostalAddressJsonLd {
    return {
      '@type': 'PostalAddress',
      streetAddress: address.streetAddress,
      addressLocality: address.addressLocality,
      addressRegion: address.addressRegion,
      postalCode: address.postalCode,
      addressCountry: address.addressCountry,
    };
  }

  private buildAggregateRating(
    rating: HostingAggregateRating
  ): HostingAggregateRatingJsonLd {
    return {
      '@type': 'AggregateRating',
      ratingValue: rating.average,
      reviewCount: rating.count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  private buildProviderTrustProperties(
    provider: HostingEducationalProvider
  ): HostingPropertyValueJsonLd[] {
    const props: HostingPropertyValueJsonLd[] = [
      {
        '@type': 'PropertyValue',
        name: 'scholarlyQualityScore',
        value: provider.qualityProfile.overallScore,
      },
      {
        '@type': 'PropertyValue',
        name: 'scholarlyVerificationLevel',
        value: provider.qualityProfile.verificationLevel,
      },
      {
        '@type': 'PropertyValue',
        name: 'scholarlyMemberSince',
        value: provider.qualityProfile.memberSince.toISOString(),
      },
    ];

    if (provider.qualityProfile.registrationStatus !== 'unregistered') {
      props.push({
        '@type': 'PropertyValue',
        name: 'registrationStatus',
        value: provider.qualityProfile.registrationStatus,
      });
    }

    if (provider.qualityProfile.staffQualifications?.studentTeacherRatio) {
      props.push({
        '@type': 'PropertyValue',
        name: 'studentTeacherRatio',
        value: `${provider.qualityProfile.staffQualifications.studentTeacherRatio}:1`,
      });
    }

    // Top outcomes
    const topOutcomes = provider.qualityProfile.verifiedOutcomes
      .filter((o) => o.percentile && o.percentile >= 75)
      .slice(0, 3);

    topOutcomes.forEach((o) => {
      props.push({
        '@type': 'PropertyValue',
        name: `outcome_${o.type}`,
        value: `${o.percentile}th percentile`,
      });
    });

    return props;
  }

  private formatYearLevels(levels: HostingYearLevel[]): string {
    if (levels.length === 0) return '';
    if (levels.length === 1) return this.formatYearLevel(levels[0]);
    return `${this.formatYearLevel(levels[0])} - ${this.formatYearLevel(levels[levels.length - 1])}`;
  }

  private formatYearLevel(level: HostingYearLevel): string {
    const map: Record<string, string> = {
      early_years: 'Early Years (0-5)',
      foundation: 'Foundation/Prep',
      year_1: 'Year 1',
      year_2: 'Year 2',
      year_3: 'Year 3',
      year_4: 'Year 4',
      year_5: 'Year 5',
      year_6: 'Year 6',
      year_7: 'Year 7',
      year_8: 'Year 8',
      year_9: 'Year 9',
      year_10: 'Year 10',
      year_11: 'Year 11',
      year_12: 'Year 12',
      adult: 'Adult Education',
    };
    return map[level] ?? level;
  }

  private mapDeliveryMode(mode: HostingDeliveryMode): string {
    const map: Record<string, string> = {
      in_person: 'OnSite',
      online_live: 'Online',
      online_self_paced: 'Online',
      hybrid: 'Mixed',
      home_visit: 'OnSite',
    };
    return map[mode] ?? mode;
  }

  private mapAvailability(status: string): string {
    const map: Record<string, string> = {
      available: 'https://schema.org/InStock',
      limited: 'https://schema.org/LimitedAvailability',
      waitlist: 'https://schema.org/PreOrder',
      full: 'https://schema.org/SoldOut',
      not_available: 'https://schema.org/OutOfStock',
    };
    return map[status] ?? 'https://schema.org/InStock';
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let serviceInstance: HostingStructuredDataService | null = null;

export function initializeHostingStructuredDataService(): HostingStructuredDataService {
  serviceInstance = new HostingStructuredDataService();
  return serviceInstance;
}

export function getHostingStructuredDataService(): HostingStructuredDataService {
  if (!serviceInstance) {
    throw new Error('HostingStructuredDataService not initialized');
  }
  return serviceInstance;
}
