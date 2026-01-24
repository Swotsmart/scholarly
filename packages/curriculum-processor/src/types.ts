/**
 * MRAC (Machine Readable Australian Curriculum) Types
 * Based on ACARA's JSON-LD vocabulary structure
 */

export interface MRACGraph {
  '@graph': MRACNode[];
}

export interface MRACNode {
  '@id': string;
  '@type'?: string | string[];
  'http://purl.org/dc/terms/title'?: LangValue[];
  'http://purl.org/dc/terms/description'?: LangValue[];
  'http://purl.org/ASN/schema/core/statementNotation'?: LangValue[];
  'http://purl.org/ASN/schema/core/statementLabel'?: LangValue[];
  'http://purl.org/gem/qualifiers/hasChild'?: IdRef[];
  'http://purl.org/ASN/schema/core/isPartOf'?: IdRef[];
  'http://purl.org/ASN/schema/core/educationLevel'?: IdRef[];
  'http://purl.org/ASN/schema/core/broadAlignment'?: IdRef[];
  'http://purl.org/ASN/schema/core/skillEmbodied'?: IdRef[];
  'http://www.w3.org/2004/02/skos/core#prefLabel'?: LangValue[];
  'http://www.w3.org/2004/02/skos/core#broader'?: IdRef[];
  'http://www.w3.org/2004/02/skos/core#narrower'?: IdRef[];
  'http://purl.org/dc/terms/modified'?: TypedValue[];
  'http://purl.org/dc/terms/created'?: TypedValue[];
}

export interface LangValue {
  '@language': string;
  '@value': string;
}

export interface IdRef {
  '@id': string;
}

export interface TypedValue {
  '@type': string;
  '@value': string;
}

// Parsed curriculum types
export interface ParsedCurriculumStandard {
  id: string;
  framework: string;
  code: string;
  type: CurriculumElementType;
  learningArea: string;
  subject: string;
  strand?: string;
  substrand?: string;
  yearLevels: string[];
  title: string;
  description: string;
  generalCapabilities: string[];
  crossCurriculumPriorities: string[];
  parentId?: string;
  childIds: string[];
  sequenceNumber: number;
}

export type CurriculumElementType =
  | 'LearningArea'
  | 'Subject'
  | 'Strand'
  | 'Substrand'
  | 'ContentDescription'
  | 'Achievement Standard'
  | 'Elaboration'
  | 'GeneralCapability'
  | 'CrossCurriculumPriority';

export interface CurriculumFramework {
  id: string;
  name: string;
  version: string;
  jurisdiction: string;
  publishedDate: Date;
  learningAreas: string[];
  generalCapabilities: string[];
  crossCurriculumPriorities: string[];
}

// Year level mappings
export const YEAR_LEVEL_MAPPINGS: Record<string, string> = {
  'http://vocabulary.curriculum.edu.au/framework/foundationto10/levelDescription/foundation': 'Foundation',
  'http://vocabulary.curriculum.edu.au/framework/foundationto10/levelDescription/year1': 'Year 1',
  'http://vocabulary.curriculum.edu.au/framework/foundationto10/levelDescription/year2': 'Year 2',
  'http://vocabulary.curriculum.edu.au/framework/foundationto10/levelDescription/year3': 'Year 3',
  'http://vocabulary.curriculum.edu.au/framework/foundationto10/levelDescription/year4': 'Year 4',
  'http://vocabulary.curriculum.edu.au/framework/foundationto10/levelDescription/year5': 'Year 5',
  'http://vocabulary.curriculum.edu.au/framework/foundationto10/levelDescription/year6': 'Year 6',
  'http://vocabulary.curriculum.edu.au/framework/foundationto10/levelDescription/year7': 'Year 7',
  'http://vocabulary.curriculum.edu.au/framework/foundationto10/levelDescription/year8': 'Year 8',
  'http://vocabulary.curriculum.edu.au/framework/foundationto10/levelDescription/year9': 'Year 9',
  'http://vocabulary.curriculum.edu.au/framework/foundationto10/levelDescription/year10': 'Year 10',
  'http://vocabulary.curriculum.edu.au/framework/foundationto10/levelDescription/years1and2': 'Year 1-2',
  'http://vocabulary.curriculum.edu.au/framework/foundationto10/levelDescription/years3and4': 'Year 3-4',
  'http://vocabulary.curriculum.edu.au/framework/foundationto10/levelDescription/years5and6': 'Year 5-6',
  'http://vocabulary.curriculum.edu.au/framework/foundationto10/levelDescription/years7and8': 'Year 7-8',
  'http://vocabulary.curriculum.edu.au/framework/foundationto10/levelDescription/years9and10': 'Year 9-10',
};

// Learning area code mappings
export const LEARNING_AREA_CODES: Record<string, string> = {
  'ENG': 'English',
  'MAT': 'Mathematics',
  'SCI': 'Science',
  'HASS': 'Humanities and Social Sciences',
  'ART': 'The Arts',
  'TEC': 'Technologies',
  'HPE': 'Health and Physical Education',
  'LAN': 'Languages',
};

// General capability code mappings
export const GENERAL_CAPABILITY_CODES: Record<string, string> = {
  'L': 'Literacy',
  'N': 'Numeracy',
  'DL': 'Digital Literacy',
  'CCT': 'Critical and Creative Thinking',
  'PSC': 'Personal and Social Capability',
  'EU': 'Ethical Understanding',
  'IU': 'Intercultural Understanding',
};

// Cross-curriculum priority codes
export const CROSS_CURRICULUM_CODES: Record<string, string> = {
  'A_TSI': 'Aboriginal and Torres Strait Islander Histories and Cultures',
  'AA': 'Asia and Australia\'s Engagement with Asia',
  'S': 'Sustainability',
};
