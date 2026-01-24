/**
 * Geographic & Compliance Types
 * Each jurisdiction has different safeguarding and educational compliance requirements
 */

export enum Jurisdiction {
  // Australia - State-based education regulations
  AU_NSW = 'AU_NSW',
  AU_VIC = 'AU_VIC',
  AU_QLD = 'AU_QLD',
  AU_WA = 'AU_WA',
  AU_SA = 'AU_SA',
  AU_TAS = 'AU_TAS',
  AU_ACT = 'AU_ACT',
  AU_NT = 'AU_NT',

  // United Kingdom
  UK_ENGLAND = 'UK_ENGLAND',
  UK_SCOTLAND = 'UK_SCOTLAND',
  UK_WALES = 'UK_WALES',
  UK_NI = 'UK_NI',

  // Canada - Province-based
  CA_ON = 'CA_ON',
  CA_BC = 'CA_BC',
  CA_AB = 'CA_AB',
  CA_QC = 'CA_QC',

  // China
  CN = 'CN',
}

export type SafeguardingCheckType = 'WWCC' | 'DBS' | 'VSC' | 'PVG' | 'CPIC' | 'NATIONAL';

export interface SafeguardingCheck {
  id: string;
  type: SafeguardingCheckType;
  jurisdiction: Jurisdiction;
  checkNumber: string;
  verifiedAt: Date;
  expiresAt?: Date;
  status: 'valid' | 'pending' | 'expired' | 'revoked';
  verificationMethod: 'manual' | 'api' | 'document';
  documentUrl?: string;
}

export interface JurisdictionRequirements {
  jurisdiction: Jurisdiction;
  countryName: string;
  regionName: string;
  safeguardingCheckRequired: boolean;
  safeguardingCheckType: SafeguardingCheckType;
  parentalConsentAge: number;
  mandatoryReporting: boolean;
  curriculumFramework: string;
  homeschoolRegistrationRequired: boolean;
  microSchoolMinStudents?: number;
  microSchoolMaxStudents?: number;
  timezone: string;
  currency: 'AUD' | 'GBP' | 'CAD' | 'CNY';
}

export const JURISDICTION_REQUIREMENTS: Record<Jurisdiction, JurisdictionRequirements> = {
  [Jurisdiction.AU_NSW]: {
    jurisdiction: Jurisdiction.AU_NSW,
    countryName: 'Australia',
    regionName: 'New South Wales',
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'WWCC',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'ACARA',
    homeschoolRegistrationRequired: true,
    timezone: 'Australia/Sydney',
    currency: 'AUD',
  },
  [Jurisdiction.AU_VIC]: {
    jurisdiction: Jurisdiction.AU_VIC,
    countryName: 'Australia',
    regionName: 'Victoria',
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'WWCC',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'ACARA',
    homeschoolRegistrationRequired: true,
    timezone: 'Australia/Melbourne',
    currency: 'AUD',
  },
  [Jurisdiction.AU_QLD]: {
    jurisdiction: Jurisdiction.AU_QLD,
    countryName: 'Australia',
    regionName: 'Queensland',
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'WWCC',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'ACARA',
    homeschoolRegistrationRequired: true,
    timezone: 'Australia/Brisbane',
    currency: 'AUD',
  },
  [Jurisdiction.AU_WA]: {
    jurisdiction: Jurisdiction.AU_WA,
    countryName: 'Australia',
    regionName: 'Western Australia',
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'WWCC',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'ACARA',
    homeschoolRegistrationRequired: true,
    timezone: 'Australia/Perth',
    currency: 'AUD',
  },
  [Jurisdiction.AU_SA]: {
    jurisdiction: Jurisdiction.AU_SA,
    countryName: 'Australia',
    regionName: 'South Australia',
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'WWCC',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'ACARA',
    homeschoolRegistrationRequired: true,
    timezone: 'Australia/Adelaide',
    currency: 'AUD',
  },
  [Jurisdiction.AU_TAS]: {
    jurisdiction: Jurisdiction.AU_TAS,
    countryName: 'Australia',
    regionName: 'Tasmania',
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'WWCC',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'ACARA',
    homeschoolRegistrationRequired: true,
    timezone: 'Australia/Hobart',
    currency: 'AUD',
  },
  [Jurisdiction.AU_ACT]: {
    jurisdiction: Jurisdiction.AU_ACT,
    countryName: 'Australia',
    regionName: 'Australian Capital Territory',
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'WWCC',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'ACARA',
    homeschoolRegistrationRequired: true,
    timezone: 'Australia/Sydney',
    currency: 'AUD',
  },
  [Jurisdiction.AU_NT]: {
    jurisdiction: Jurisdiction.AU_NT,
    countryName: 'Australia',
    regionName: 'Northern Territory',
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'WWCC',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'ACARA',
    homeschoolRegistrationRequired: true,
    timezone: 'Australia/Darwin',
    currency: 'AUD',
  },
  [Jurisdiction.UK_ENGLAND]: {
    jurisdiction: Jurisdiction.UK_ENGLAND,
    countryName: 'United Kingdom',
    regionName: 'England',
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'DBS',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'National Curriculum',
    homeschoolRegistrationRequired: false,
    timezone: 'Europe/London',
    currency: 'GBP',
  },
  [Jurisdiction.UK_SCOTLAND]: {
    jurisdiction: Jurisdiction.UK_SCOTLAND,
    countryName: 'United Kingdom',
    regionName: 'Scotland',
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'PVG',
    parentalConsentAge: 16,
    mandatoryReporting: true,
    curriculumFramework: 'Curriculum for Excellence',
    homeschoolRegistrationRequired: false,
    timezone: 'Europe/London',
    currency: 'GBP',
  },
  [Jurisdiction.UK_WALES]: {
    jurisdiction: Jurisdiction.UK_WALES,
    countryName: 'United Kingdom',
    regionName: 'Wales',
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'DBS',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'Curriculum for Wales',
    homeschoolRegistrationRequired: true,
    timezone: 'Europe/London',
    currency: 'GBP',
  },
  [Jurisdiction.UK_NI]: {
    jurisdiction: Jurisdiction.UK_NI,
    countryName: 'United Kingdom',
    regionName: 'Northern Ireland',
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'DBS',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'Northern Ireland Curriculum',
    homeschoolRegistrationRequired: false,
    timezone: 'Europe/London',
    currency: 'GBP',
  },
  [Jurisdiction.CA_ON]: {
    jurisdiction: Jurisdiction.CA_ON,
    countryName: 'Canada',
    regionName: 'Ontario',
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'VSC',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'Ontario Curriculum',
    homeschoolRegistrationRequired: true,
    timezone: 'America/Toronto',
    currency: 'CAD',
  },
  [Jurisdiction.CA_BC]: {
    jurisdiction: Jurisdiction.CA_BC,
    countryName: 'Canada',
    regionName: 'British Columbia',
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'CPIC',
    parentalConsentAge: 19,
    mandatoryReporting: true,
    curriculumFramework: 'BC Curriculum',
    homeschoolRegistrationRequired: true,
    timezone: 'America/Vancouver',
    currency: 'CAD',
  },
  [Jurisdiction.CA_AB]: {
    jurisdiction: Jurisdiction.CA_AB,
    countryName: 'Canada',
    regionName: 'Alberta',
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'CPIC',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'Alberta Programs of Study',
    homeschoolRegistrationRequired: true,
    timezone: 'America/Edmonton',
    currency: 'CAD',
  },
  [Jurisdiction.CA_QC]: {
    jurisdiction: Jurisdiction.CA_QC,
    countryName: 'Canada',
    regionName: 'Quebec',
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'CPIC',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'Quebec Education Program',
    homeschoolRegistrationRequired: true,
    timezone: 'America/Montreal',
    currency: 'CAD',
  },
  [Jurisdiction.CN]: {
    jurisdiction: Jurisdiction.CN,
    countryName: 'China',
    regionName: 'Mainland China',
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'NATIONAL',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'National Curriculum Standards',
    homeschoolRegistrationRequired: false,
    timezone: 'Asia/Shanghai',
    currency: 'CNY',
  },
};

export function getJurisdictionRequirements(jurisdiction: Jurisdiction): JurisdictionRequirements {
  return JURISDICTION_REQUIREMENTS[jurisdiction];
}

export function isAustralianJurisdiction(jurisdiction: Jurisdiction): boolean {
  return jurisdiction.startsWith('AU_');
}

export function isUKJurisdiction(jurisdiction: Jurisdiction): boolean {
  return jurisdiction.startsWith('UK_');
}

export function isCanadianJurisdiction(jurisdiction: Jurisdiction): boolean {
  return jurisdiction.startsWith('CA_');
}
