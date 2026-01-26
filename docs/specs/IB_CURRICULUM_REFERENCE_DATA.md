# IB Curriculum Reference Data for Scholarly

## ⚠️ IMPORTANT DISCLAIMER

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ATTRIBUTION NOTICE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  This document contains REFERENCE DATA compiled from publicly available     │
│  sources about the International Baccalaureate (IB) curriculum.             │
│                                                                             │
│  THIS IS NOT THE OFFICIAL IB CURRICULUM.                                    │
│                                                                             │
│  Sources include:                                                           │
│  • IB Subject Briefs (publicly available PDFs from ibo.org)                │
│  • IB Programme Brochures (publicly available from ibo.org)                │
│  • Published school curriculum guides from IB World Schools                 │
│  • Wikipedia and educational reference materials                            │
│                                                                             │
│  LIMITATIONS:                                                               │
│  • Does NOT include detailed strand descriptors for assessment criteria    │
│  • Does NOT include full syllabus content or learning objectives           │
│  • Does NOT include official assessment materials or mark schemes          │
│  • Does NOT replace the official IB curriculum documentation               │
│                                                                             │
│  FOR OFFICIAL IB CURRICULUM:                                                │
│  Schools must access the IB Programme Resource Centre (PRC) at             │
│  https://resources.ibo.org with their IB World School credentials.         │
│                                                                             │
│  "International Baccalaureate", "IB", "MYP", "PYP", "DP" and "CP" are      │
│  registered trademarks of the International Baccalaureate Organization.    │
│                                                                             │
│  Last Updated: January 2026                                                 │
│  Curated by: Scholarly Platform                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Purpose of This Reference Data

This seed data enables Scholarly to:

1. **Provide structural awareness** of IB programmes for planning and reporting
2. **Support dual-track schools** mapping between ACARA and IB frameworks
3. **Enable IB-style pedagogy** (ATL skills, Learner Profile, Global Contexts)
4. **Facilitate unit planning** with IB conceptual frameworks

Schools with full IB authorization should enhance this data with their official curriculum access.

---

## IB Learner Profile

*Source: IB Programme Brochures (publicly available)*

The IB Learner Profile describes the attributes IB learners strive to develop.

```typescript
export const IBLearnerProfile = {
  
  INQUIRERS: {
    code: 'LP_INQ',
    name: 'Inquirers',
    description: 'We nurture our curiosity, developing skills for inquiry and research. We know how to learn independently and with others. We learn with enthusiasm and sustain our love of learning throughout life.',
    source: 'IB Learner Profile (ibo.org)'
  },
  
  KNOWLEDGEABLE: {
    code: 'LP_KNO', 
    name: 'Knowledgeable',
    description: 'We develop and use conceptual understanding, exploring knowledge across a range of disciplines. We engage with issues and ideas that have local and global significance.',
    source: 'IB Learner Profile (ibo.org)'
  },
  
  THINKERS: {
    code: 'LP_THI',
    name: 'Thinkers',
    description: 'We use critical and creative thinking skills to analyse and take responsible action on complex problems. We exercise initiative in making reasoned, ethical decisions.',
    source: 'IB Learner Profile (ibo.org)'
  },
  
  COMMUNICATORS: {
    code: 'LP_COM',
    name: 'Communicators',
    description: 'We express ourselves confidently and creatively in more than one language and in many ways. We collaborate effectively, listening carefully to the perspectives of other individuals and groups.',
    source: 'IB Learner Profile (ibo.org)'
  },
  
  PRINCIPLED: {
    code: 'LP_PRI',
    name: 'Principled',
    description: 'We act with integrity and honesty, with a strong sense of fairness and justice, and with respect for the dignity and rights of people everywhere. We take responsibility for our actions and their consequences.',
    source: 'IB Learner Profile (ibo.org)'
  },
  
  OPEN_MINDED: {
    code: 'LP_OPE',
    name: 'Open-minded',
    description: 'We critically appreciate our own cultures and personal histories, as well as the values and traditions of others. We seek and evaluate a range of points of view, and we are willing to grow from the experience.',
    source: 'IB Learner Profile (ibo.org)'
  },
  
  CARING: {
    code: 'LP_CAR',
    name: 'Caring',
    description: 'We show empathy, compassion and respect. We have a commitment to service, and we act to make a positive difference in the lives of others and in the world around us.',
    source: 'IB Learner Profile (ibo.org)'
  },
  
  RISK_TAKERS: {
    code: 'LP_RIS',
    name: 'Risk-takers',
    description: 'We approach uncertainty with forethought and determination; we work independently and cooperatively to explore new ideas and innovative strategies. We are resourceful and resilient in the face of challenges and change.',
    source: 'IB Learner Profile (ibo.org)'
  },
  
  BALANCED: {
    code: 'LP_BAL',
    name: 'Balanced',
    description: 'We understand the importance of balancing different aspects of our lives—intellectual, physical, and emotional—to achieve well-being for ourselves and others. We recognize our interdependence with other people and with the world in which we live.',
    source: 'IB Learner Profile (ibo.org)'
  },
  
  REFLECTIVE: {
    code: 'LP_REF',
    name: 'Reflective',
    description: 'We thoughtfully consider the world and our own ideas and experience. We work to understand our strengths and weaknesses in order to support our learning and personal development.',
    source: 'IB Learner Profile (ibo.org)'
  }
  
} as const;
```

---

## Approaches to Learning (ATL) Skills

*Source: MYP Subject Briefs, IB Programme Brochures (publicly available)*

ATL skills are developed across all IB programmes.

```typescript
export const ATLSkillsFramework = {
  
  _attribution: {
    source: 'IB MYP Subject Briefs and Programme Documentation',
    note: 'Framework structure from publicly available IB materials',
    officialReference: 'Full ATL skill descriptors available in IB Programme Resource Centre'
  },
  
  THINKING_SKILLS: {
    code: 'ATL_THI',
    name: 'Thinking Skills',
    categories: {
      criticalThinking: {
        name: 'Critical Thinking',
        skills: [
          'Analysing and evaluating issues and ideas',
          'Recognising unstated assumptions and bias',
          'Interpreting data',
          'Evaluating evidence and arguments',
          'Recognising and evaluating propositions',
          'Drawing reasonable conclusions and generalisations',
          'Testing generalisations and conclusions',
          'Revising understanding based on new information'
        ]
      },
      creativeThinking: {
        name: 'Creative Thinking',
        skills: [
          'Generating novel ideas and considering new perspectives',
          'Using brainstorming and visual diagrams to generate new ideas',
          'Considering multiple alternatives',
          'Creating original works and ideas',
          'Making unexpected or unusual connections between objects and ideas',
          'Designing improvements to existing products, processes, solutions'
        ]
      },
      transferSkills: {
        name: 'Transfer Skills',
        skills: [
          'Applying skills and knowledge in unfamiliar situations',
          'Making connections between subjects and disciplines',
          'Combining knowledge, understanding and skills to create products or solutions',
          'Transferring current knowledge to new situations'
        ]
      }
    }
  },
  
  COMMUNICATION_SKILLS: {
    code: 'ATL_COM',
    name: 'Communication Skills',
    categories: {
      exchangingInformation: {
        name: 'Exchanging Information',
        skills: [
          'Giving and receiving meaningful feedback',
          'Using intercultural understanding to interpret communication',
          'Using a variety of speaking techniques to communicate',
          'Using appropriate forms of writing for different purposes and audiences',
          'Negotiating ideas and knowledge with peers and teachers',
          'Reading critically and for comprehension',
          'Making inferences and drawing conclusions'
        ]
      },
      literacySkills: {
        name: 'Literacy Skills',
        skills: [
          'Reading critically and for comprehension',
          'Reading a variety of sources for information',
          'Writing for different purposes',
          'Using a variety of organizers for academic writing',
          'Taking effective notes in class',
          'Making effective summary notes for studying',
          'Using a variety of media to communicate ideas'
        ]
      },
      ictSkills: {
        name: 'Information and Communication Technology (ICT) Skills',
        skills: [
          'Using technology systems responsibly',
          'Using technology to gather, investigate, organise information',
          'Using technology to create, communicate information and ideas',
          'Understanding and using technology systems',
          'Collecting, organising, verifying and evaluating data'
        ]
      }
    }
  },
  
  SOCIAL_SKILLS: {
    code: 'ATL_SOC',
    name: 'Social Skills',
    categories: {
      collaboration: {
        name: 'Collaboration',
        skills: [
          'Delegating and sharing responsibility for decision-making',
          'Helping others to succeed',
          'Taking responsibility for own actions',
          'Managing and resolving conflict, and working collaboratively',
          'Building consensus',
          'Making fair and equitable decisions',
          'Listening actively to other perspectives and ideas',
          'Giving and receiving meaningful feedback',
          'Advocating for own and others rights and needs'
        ]
      }
    }
  },
  
  SELF_MANAGEMENT_SKILLS: {
    code: 'ATL_SLF',
    name: 'Self-Management Skills',
    categories: {
      organisationSkills: {
        name: 'Organisation Skills',
        skills: [
          'Planning short- and long-term assignments',
          'Meeting deadlines',
          'Creating plans to prepare for summative assessments',
          'Keeping and using a weekly planner for assignments',
          'Setting goals that are challenging and realistic',
          'Planning strategies and taking action to achieve goals',
          'Bringing necessary equipment and supplies to class',
          'Keeping an organised and logical system of information files'
        ]
      },
      affectiveSkills: {
        name: 'Affective Skills',
        skills: [
          'Mindfulness: Practising being aware of body-mind connections',
          'Perseverance: Demonstrating persistence and perseverance',
          'Emotional management: Practising strategies to overcome setbacks',
          'Self-motivation: Practising positive thinking',
          'Resilience: Practising bouncing back after adversity'
        ]
      },
      reflectionSkills: {
        name: 'Reflection Skills',
        skills: [
          'Developing new skills, techniques and strategies for effective learning',
          'Identifying strengths and weaknesses of personal learning strategies',
          'Demonstrating flexibility in the selection and use of learning strategies',
          'Keeping a journal to record reflections',
          'Considering content: What did I learn today?',
          'Considering ATL skills development: What skills did I develop?'
        ]
      }
    }
  },
  
  RESEARCH_SKILLS: {
    code: 'ATL_RES',
    name: 'Research Skills',
    categories: {
      informationLiteracy: {
        name: 'Information Literacy',
        skills: [
          'Collecting, recording and verifying data',
          'Accessing information to be informed and inform others',
          'Making connections between various sources of information',
          'Evaluating and selecting information sources and digital tools',
          'Understanding and implementing intellectual property rights',
          'Creating references and citations',
          'Identifying primary and secondary sources',
          'Organising and depicting information logically'
        ]
      },
      mediaLiteracy: {
        name: 'Media Literacy',
        skills: [
          'Interacting with media to use and create ideas and information',
          'Locating, organising, analysing, evaluating, synthesising and ethically using information',
          'Comparing, contrasting and drawing conclusions',
          'Seeking a range of perspectives from multiple and varied sources',
          'Communicating information and ideas effectively to multiple audiences',
          'Making informed choices about personal viewing experiences',
          'Understanding the impact of media representations and modes of presentation'
        ]
      }
    }
  }
  
} as const;
```

---

## MYP Programme Reference Data

### MYP Subject Groups

*Source: MYP Subject Briefs (publicly available PDFs from ibo.org)*

```typescript
export const MYPSubjectGroups = {
  
  _attribution: {
    source: 'IB MYP Subject Briefs',
    url: 'https://www.ibo.org/programmes/middle-years-programme/curriculum/',
    note: 'Criterion names from public subject briefs. Full strand descriptors require IB PRC access.',
    lastVerified: '2026-01'
  },
  
  LANGUAGE_AND_LITERATURE: {
    code: 'MYP_LL',
    name: 'Language and Literature',
    description: 'MYP language and literature is academically rigorous. It encourages students to develop an appreciation of the nature of language and literature, of the many influences on language and literature, and of its power and beauty.',
    criteria: {
      A: { name: 'Analysing', maxScore: 8 },
      B: { name: 'Organizing', maxScore: 8 },
      C: { name: 'Producing text', maxScore: 8 },
      D: { name: 'Using language', maxScore: 8 }
    },
    objectivesSummary: [
      'Analyse the content, context, language, structure, technique and style of text(s)',
      'Organise opinions and ideas in a coherent and logical manner',
      'Produce texts that demonstrate thought, imagination and sensitivity',
      'Use appropriate and varied vocabulary, sentence structures and forms of expression'
    ],
    note: 'Full objectives and strand descriptors available in IB Programme Resource Centre'
  },
  
  LANGUAGE_ACQUISITION: {
    code: 'MYP_LA',
    name: 'Language Acquisition',
    description: 'The ability to communicate in a variety of modes in more than one language is essential to the concept of an international education that promotes multilingualism and intercultural understanding.',
    phases: [1, 2, 3, 4, 5, 6],
    phaseDescriptions: {
      1: 'Emergent (Beginner)',
      2: 'Emergent (Elementary)',
      3: 'Capable (Intermediate)',
      4: 'Capable (Upper Intermediate)',
      5: 'Proficient (Advanced)',
      6: 'Proficient (Near-native/Native)'
    },
    criteria: {
      A: { name: 'Comprehending spoken and visual text', maxScore: 8 },
      B: { name: 'Comprehending written and visual text', maxScore: 8 },
      C: { name: 'Communicating', maxScore: 8 },
      D: { name: 'Using language', maxScore: 8 }
    },
    note: 'Criteria descriptors vary by phase. Full phase descriptors require IB PRC access.'
  },
  
  INDIVIDUALS_AND_SOCIETIES: {
    code: 'MYP_IS',
    name: 'Individuals and Societies',
    description: 'MYP individuals and societies encourages learners to respect and understand the world around them and equips them with the necessary skills to inquire into historical, contemporary, geographical, political, social, economic, religious, technological and cultural factors.',
    subjects: ['History', 'Geography', 'Economics', 'Business Studies', 'Philosophy', 'Psychology'],
    criteria: {
      A: { name: 'Knowing and understanding', maxScore: 8 },
      B: { name: 'Investigating', maxScore: 8 },
      C: { name: 'Communicating', maxScore: 8 },
      D: { name: 'Thinking critically', maxScore: 8 }
    }
  },
  
  SCIENCES: {
    code: 'MYP_SC',
    name: 'Sciences',
    description: 'The MYP sciences framework aims to guide students to independently and collaboratively investigate issues through research, observation and experimentation.',
    subjects: ['Biology', 'Chemistry', 'Physics', 'Integrated Sciences', 'Environmental Systems'],
    criteria: {
      A: { name: 'Knowing and understanding', maxScore: 8 },
      B: { name: 'Inquiring and designing', maxScore: 8 },
      C: { name: 'Processing and evaluating', maxScore: 8 },
      D: { name: 'Reflecting on the impacts of science', maxScore: 8 }
    }
  },
  
  MATHEMATICS: {
    code: 'MYP_MA',
    name: 'Mathematics',
    description: 'The study of mathematics is a fundamental part of a balanced education. It promotes a powerful universal language, analytical reasoning and problem-solving skills.',
    branches: ['Number', 'Algebra', 'Geometry and Trigonometry', 'Statistics and Probability'],
    criteria: {
      A: { name: 'Knowing and understanding', maxScore: 8 },
      B: { name: 'Investigating patterns', maxScore: 8 },
      C: { name: 'Communicating', maxScore: 8 },
      D: { name: 'Applying mathematics in real-life contexts', maxScore: 8 }
    }
  },
  
  ARTS: {
    code: 'MYP_AR',
    name: 'Arts',
    description: 'MYP arts challenges students to consider authentic real-life issues and develop their critical-thinking and reflective skills.',
    subjects: ['Visual Arts', 'Music', 'Drama', 'Dance', 'Media Arts'],
    criteria: {
      A: { name: 'Knowing and understanding', maxScore: 8 },
      B: { name: 'Developing skills', maxScore: 8 },
      C: { name: 'Thinking creatively', maxScore: 8 },
      D: { name: 'Responding', maxScore: 8 }
    }
  },
  
  DESIGN: {
    code: 'MYP_DE',
    name: 'Design',
    description: 'MYP design challenges students to apply practical and creative-thinking skills to solve design problems.',
    subjects: ['Digital Design', 'Product Design'],
    criteria: {
      A: { name: 'Inquiring and analysing', maxScore: 8 },
      B: { name: 'Developing ideas', maxScore: 8 },
      C: { name: 'Creating the solution', maxScore: 8 },
      D: { name: 'Evaluating', maxScore: 8 }
    }
  },
  
  PHYSICAL_AND_HEALTH_EDUCATION: {
    code: 'MYP_PHE',
    name: 'Physical and Health Education',
    description: 'MYP physical and health education aims to empower students to understand and appreciate the value of being physically active and develop the motivation for making healthy life choices.',
    criteria: {
      A: { name: 'Knowing and understanding', maxScore: 8 },
      B: { name: 'Planning for performance', maxScore: 8 },
      C: { name: 'Applying and performing', maxScore: 8 },
      D: { name: 'Reflecting and improving performance', maxScore: 8 }
    }
  }
  
} as const;
```

### MYP Global Contexts

*Source: MYP Subject Briefs and Programme Documentation (publicly available)*

```typescript
export const MYPGlobalContexts = {
  
  _attribution: {
    source: 'IB MYP Programme Documentation and Subject Briefs',
    note: 'Global contexts frame MYP teaching and learning',
    lastVerified: '2026-01'
  },
  
  IDENTITIES_AND_RELATIONSHIPS: {
    code: 'GC_IR',
    name: 'Identities and relationships',
    description: 'Students will explore identity; beliefs and values; personal, physical, mental, social and spiritual health; human relationships including families, friends, communities and cultures; what it means to be human.',
    explorations: [
      'Who am I? Who are we?',
      'Competition and cooperation',
      'Teams, affiliation and leadership',
      'Character, self-identity, self-esteem',
      'Status and roles; role models',
      'Attitudes, motivations, independence; happiness',
      'Physical, psychological and social development; transitions',
      'Health, well-being and lifestyle choices',
      'Human nature and human dignity; moral reasoning and ethical judgement'
    ]
  },
  
  ORIENTATION_IN_SPACE_AND_TIME: {
    code: 'GC_OST',
    name: 'Orientation in space and time',
    description: 'Students will explore personal histories; homes and journeys; turning points in humankind; discoveries; explorations and migrations of humankind; the relationships between, and the interconnectedness of, individuals and civilizations, from personal, local and global perspectives.',
    explorations: [
      'Civilizations and social histories, heritage; pilgrimage, migration, displacement and exchange',
      'Eras, epochs, turning points',
      'Scale, duration, frequency, variability',
      'Peoples, boundaries, exchange',
      'Natural and human landscapes and resources',
      'Evolution, constraints and adaptation'
    ]
  },
  
  PERSONAL_AND_CULTURAL_EXPRESSION: {
    code: 'GC_PCE',
    name: 'Personal and cultural expression',
    description: 'Students will explore the ways in which we discover and express ideas, feelings, nature, culture, beliefs and values; the ways in which we reflect on, extend and enjoy our creativity; our appreciation of the aesthetic.',
    explorations: [
      'Artistry, craft, creation, beauty',
      'Products, systems, institutions',
      'Social constructions of reality; philosophies and ways of life',
      'Critical literacy, languages, linguistics',
      'Culture, cultural identity, subcultures; culturally conditioned responses',
      'Belief, values, ritual, spirituality',
      'The ways we discover and express ideas, feelings, nature, culture, beliefs and values'
    ]
  },
  
  SCIENTIFIC_AND_TECHNICAL_INNOVATION: {
    code: 'GC_STI',
    name: 'Scientific and technical innovation',
    description: 'Students will explore the natural world and its laws; the interaction between people and the natural world; how humans use their understanding of scientific principles; the impact of scientific and technological advances on communities and environments.',
    explorations: [
      'Systems, models, methods; products, processes and solutions',
      'Adaptation, ingenuity and progress',
      'Opportunity, risk, consequences and responsibility',
      'Modernization, industrialization and engineering',
      'Digital life, virtual environments and the information age',
      'The impact of scientific and technological advances on communities and environments'
    ]
  },
  
  GLOBALISATION_AND_SUSTAINABILITY: {
    code: 'GC_GS',
    name: 'Globalisation and sustainability',
    description: 'Students will explore the interconnectedness of human-made systems and communities; the relationship between local and global processes; how local experiences mediate the global; opportunities and tensions provided by world-interconnectedness.',
    explorations: [
      'Markets, commodities, commercialization',
      'Impact of humans on the environment; commonality, diversity and interconnection',
      'Consumption, conservation, natural resources and public goods',
      'Population, settlement, urbanization',
      'Human impact on the environment'
    ]
  },
  
  FAIRNESS_AND_DEVELOPMENT: {
    code: 'GC_FD',
    name: 'Fairness and development',
    description: 'Students will explore rights and responsibilities; the relationship between communities; sharing finite resources with other people and with other living things; access to equal opportunities; peace and conflict resolution.',
    explorations: [
      'Democracy, politics, government, civil society',
      'Inequality, difference, inclusion',
      'Human capabilities and development; social entrepreneurs',
      'Authority, security, freedom, power',
      'Imagining a hopeful future'
    ]
  }
  
} as const;
```

### MYP Key Concepts

*Source: MYP Programme Documentation (publicly available)*

```typescript
export const MYPKeyConcepts = [
  { code: 'KC_AES', name: 'Aesthetics', description: 'Deals with the characteristics, creation, meaning and perception of beauty and taste' },
  { code: 'KC_CHG', name: 'Change', description: 'A conversion, transformation or movement from one form, state or value to another' },
  { code: 'KC_COM', name: 'Communication', description: 'The exchange or transfer of signals, facts, ideas and symbols' },
  { code: 'KC_CMY', name: 'Communities', description: 'Groups that exist in proximity defined by space, time or relationship' },
  { code: 'KC_CON', name: 'Connections', description: 'The links, bonds and relationships among people, objects, organisms or ideas' },
  { code: 'KC_CRT', name: 'Creativity', description: 'The process of generating novel ideas and considering existing ideas from new perspectives' },
  { code: 'KC_CLT', name: 'Culture', description: 'A range of learned and shared beliefs, values, interests, attitudes, products, ways of knowing and patterns of behaviour' },
  { code: 'KC_DEV', name: 'Development', description: 'The act or process of growth, progress or evolution, sometimes through iterative improvements' },
  { code: 'KC_FRM', name: 'Form', description: 'The shape and underlying structure of an entity or piece of work' },
  { code: 'KC_GIC', name: 'Global interactions', description: 'The connections among individuals and communities, as well as their relationships with environments' },
  { code: 'KC_IDN', name: 'Identity', description: 'The state or fact of being the same; the characteristics determining who or what a person or thing is' },
  { code: 'KC_LOG', name: 'Logic', description: 'A method of reasoning and a system of principles used to build arguments and reach conclusions' },
  { code: 'KC_PER', name: 'Perspective', description: 'The position from which we observe situations, objects, facts, ideas and opinions' },
  { code: 'KC_REL', name: 'Relationships', description: 'The connections and associations between properties, objects, people and ideas' },
  { code: 'KC_SYS', name: 'Systems', description: 'Sets of interacting or interdependent components' },
  { code: 'KC_TPS', name: 'Time, place and space', description: 'The absolute or relative position of people, objects and ideas' }
] as const;
```

### MYP Grade Boundaries

*Source: IB MYP eAssessment documentation, school curriculum guides*

```typescript
export const MYPGradeBoundaries = {
  
  _attribution: {
    source: 'IB MYP documentation and published school guides',
    note: 'These are standard boundaries; actual boundaries may vary by examination session'
  },
  
  // Criterion total (0-32) to MYP Grade (1-7)
  criterionToGrade: {
    1: { min: 1, max: 5, descriptor: 'Very limited achievement' },
    2: { min: 6, max: 9, descriptor: 'Limited achievement' },
    3: { min: 10, max: 14, descriptor: 'Adequate achievement' },
    4: { min: 15, max: 18, descriptor: 'Satisfactory achievement' },
    5: { min: 19, max: 23, descriptor: 'Substantial achievement' },
    6: { min: 24, max: 27, descriptor: 'High level of achievement' },
    7: { min: 28, max: 32, descriptor: 'Excellent achievement' }
  },
  
  // Achievement level bands within each criterion (0-8)
  criterionLevelBands: {
    0: 'Does not reach a standard described by any of the descriptors',
    '1-2': 'Limited achievement',
    '3-4': 'Adequate achievement',
    '5-6': 'Substantial achievement',
    '7-8': 'Excellent achievement'
  }
  
} as const;
```

---

## PYP Programme Reference Data

### PYP Transdisciplinary Themes

*Source: IB PYP Programme Brochures (publicly available)*

```typescript
export const PYPTransdisciplinaryThemes = {
  
  _attribution: {
    source: 'IB PYP Programme Brochures and Documentation',
    note: 'PYP is transdisciplinary, organizing learning around these six themes',
    lastVerified: '2026-01'
  },
  
  WHO_WE_ARE: {
    code: 'TDT_WWA',
    name: 'Who we are',
    description: 'An inquiry into the nature of the self; beliefs and values; personal, physical, mental, social and spiritual health; human relationships including families, friends, communities, and cultures; rights and responsibilities; what it means to be human.'
  },
  
  WHERE_WE_ARE_IN_PLACE_AND_TIME: {
    code: 'TDT_WPA',
    name: 'Where we are in place and time',
    description: 'An inquiry into orientation in place and time; personal histories; homes and journeys; the discoveries, explorations and migrations of humankind; the relationships between and the interconnectedness of individuals and civilizations, from local and global perspectives.'
  },
  
  HOW_WE_EXPRESS_OURSELVES: {
    code: 'TDT_HEO',
    name: 'How we express ourselves',
    description: 'An inquiry into the ways in which we discover and express ideas, feelings, nature, culture, beliefs and values; the ways in which we reflect on, extend and enjoy our creativity; our appreciation of the aesthetic.'
  },
  
  HOW_THE_WORLD_WORKS: {
    code: 'TDT_HWW',
    name: 'How the world works',
    description: 'An inquiry into the natural world and its laws; the interaction between the natural world (physical and biological) and human societies; how humans use their understanding of scientific principles; the impact of scientific and technological advances on society and on the environment.'
  },
  
  HOW_WE_ORGANISE_OURSELVES: {
    code: 'TDT_HWO',
    name: 'How we organise ourselves',
    description: 'An inquiry into the interconnectedness of human-made systems and communities; the structure and function of organizations; societal decision-making; economic activities and their impact on humankind and the environment.'
  },
  
  SHARING_THE_PLANET: {
    code: 'TDT_STP',
    name: 'Sharing the planet',
    description: 'An inquiry into rights and responsibilities in the struggle to share finite resources with other people and with other living things; communities and the relationships within and between them; access to equal opportunities; peace and conflict resolution.'
  }
  
} as const;
```

### PYP Key Concepts

*Source: IB PYP Programme Documentation (publicly available)*

```typescript
export const PYPKeyConcepts = [
  { code: 'KC_FRM', name: 'Form', question: 'What is it like?', description: 'The understanding that everything has a form with recognizable features that can be observed, identified, described and categorized.' },
  { code: 'KC_FUN', name: 'Function', question: 'How does it work?', description: 'The understanding that everything has a purpose, a role or a way of behaving that can be investigated.' },
  { code: 'KC_CAU', name: 'Causation', question: 'Why is it like it is?', description: 'The understanding that things do not just happen, that there are causal relationships at work, and that actions have consequences.' },
  { code: 'KC_CHG', name: 'Change', question: 'How is it changing?', description: 'The understanding that change is the process of movement from one state to another. It is universal and inevitable.' },
  { code: 'KC_CON', name: 'Connection', question: 'How is it connected to other things?', description: 'The understanding that we live in a world of interacting systems in which the actions of any individual element affect others.' },
  { code: 'KC_PER', name: 'Perspective', question: 'What are the points of view?', description: 'The understanding that knowledge is moderated by perspectives; different perspectives lead to different interpretations, understandings and findings.' },
  { code: 'KC_RES', name: 'Responsibility', question: 'What is our responsibility?', description: 'The understanding that people make choices based on their understandings, and the actions they take as a result do make a difference.' },
  { code: 'KC_REF', name: 'Reflection', question: 'How do we know?', description: 'The understanding that there are different ways of knowing, and it is important to reflect on our conclusions, to consider our methods of reasoning.' }
] as const;
```

---

## DP Programme Reference Data

### DP Subject Groups

*Source: IB DP Subject Briefs (publicly available PDFs from ibo.org)*

```typescript
export const DPSubjectGroups = {
  
  _attribution: {
    source: 'IB DP Subject Briefs and Course Selection Guidance',
    url: 'https://www.ibo.org/programmes/diploma-programme/curriculum/',
    note: 'Subject list compiled from public sources. Full syllabi require IB PRC access.',
    lastVerified: '2026-01'
  },
  
  GROUP_1: {
    code: 'DP_G1',
    name: 'Studies in Language and Literature',
    description: 'Courses in studies in language and literature are offered in over 55 languages at HL and SL, and the courses are organized into two categories: language A: literature and language A: language and literature.',
    courses: [
      { code: 'DP_LIT', name: 'Language A: Literature', levels: ['SL', 'HL'] },
      { code: 'DP_LAL', name: 'Language A: Language and Literature', levels: ['SL', 'HL'] }
    ],
    note: 'Languages offered vary by school availability'
  },
  
  GROUP_2: {
    code: 'DP_G2',
    name: 'Language Acquisition',
    description: 'Group 2 consists of two modern language courses—language ab initio and language B—and a classical languages course that can be studied at SL only.',
    courses: [
      { code: 'DP_LAB', name: 'Language B', levels: ['SL', 'HL'], description: 'For students with previous experience' },
      { code: 'DP_ABI', name: 'Language ab initio', levels: ['SL'], description: 'For beginners with no prior experience' },
      { code: 'DP_CLA', name: 'Classical Languages', levels: ['SL', 'HL'], description: 'Latin or Classical Greek' }
    ],
    prescribedThemes: ['Identities', 'Experiences', 'Human ingenuity', 'Social organisation', 'Sharing the planet']
  },
  
  GROUP_3: {
    code: 'DP_G3',
    name: 'Individuals and Societies',
    description: 'Subjects in this group are concerned with the study of people in society, examining human experience and behaviour, and the ways in which humans interact with their environment.',
    courses: [
      { code: 'DP_BM', name: 'Business Management', levels: ['SL', 'HL'] },
      { code: 'DP_ECO', name: 'Economics', levels: ['SL', 'HL'] },
      { code: 'DP_GEO', name: 'Geography', levels: ['SL', 'HL'] },
      { code: 'DP_GP', name: 'Global Politics', levels: ['SL', 'HL'] },
      { code: 'DP_HIS', name: 'History', levels: ['SL', 'HL'] },
      { code: 'DP_PHI', name: 'Philosophy', levels: ['SL', 'HL'] },
      { code: 'DP_PSY', name: 'Psychology', levels: ['SL', 'HL'] },
      { code: 'DP_SA', name: 'Social and Cultural Anthropology', levels: ['SL', 'HL'] },
      { code: 'DP_WR', name: 'World Religions', levels: ['SL'] }
    ]
  },
  
  GROUP_4: {
    code: 'DP_G4',
    name: 'Sciences',
    description: 'All group 4 subjects have a common structure, with core material for SL and HL and additional higher level (AHL) material for HL students.',
    courses: [
      { code: 'DP_BIO', name: 'Biology', levels: ['SL', 'HL'] },
      { code: 'DP_CHE', name: 'Chemistry', levels: ['SL', 'HL'] },
      { code: 'DP_PHY', name: 'Physics', levels: ['SL', 'HL'] },
      { code: 'DP_CS', name: 'Computer Science', levels: ['SL', 'HL'] },
      { code: 'DP_DT', name: 'Design Technology', levels: ['SL', 'HL'] },
      { code: 'DP_ESS', name: 'Environmental Systems and Societies', levels: ['SL'], note: 'Interdisciplinary (Groups 3 & 4)' },
      { code: 'DP_SEHS', name: 'Sports, Exercise and Health Science', levels: ['SL', 'HL'] }
    ]
  },
  
  GROUP_5: {
    code: 'DP_G5',
    name: 'Mathematics',
    description: 'Two courses are available in DP mathematics, each available at SL and HL.',
    courses: [
      { code: 'DP_MAA', name: 'Mathematics: Analysis and Approaches', levels: ['SL', 'HL'], focus: 'Algebraic methods, calculus, mathematical argument and proof' },
      { code: 'DP_MAI', name: 'Mathematics: Applications and Interpretation', levels: ['SL', 'HL'], focus: 'Real-world applications, modelling, statistics, technology' }
    ]
  },
  
  GROUP_6: {
    code: 'DP_G6',
    name: 'The Arts',
    description: 'The arts subjects aim to give students opportunities to engage with the arts from around the world.',
    courses: [
      { code: 'DP_DAN', name: 'Dance', levels: ['SL', 'HL'] },
      { code: 'DP_FLM', name: 'Film', levels: ['SL', 'HL'] },
      { code: 'DP_MUS', name: 'Music', levels: ['SL', 'HL'] },
      { code: 'DP_THE', name: 'Theatre', levels: ['SL', 'HL'] },
      { code: 'DP_VA', name: 'Visual Arts', levels: ['SL', 'HL'] }
    ],
    note: 'Students may substitute a Group 6 subject with an additional subject from Groups 1-4'
  }
  
} as const;
```

### DP Core Components

*Source: IB DP Programme Documentation (publicly available)*

```typescript
export const DPCoreComponents = {
  
  _attribution: {
    source: 'IB DP Programme Brochures and Documentation',
    note: 'Overview of DP core requirements from public sources',
    lastVerified: '2026-01'
  },
  
  THEORY_OF_KNOWLEDGE: {
    code: 'DP_TOK',
    name: 'Theory of Knowledge',
    hours: 100,
    description: 'TOK is a course about critical thinking and inquiry into the process of knowing. It plays a special role in the DP by providing an opportunity for students to reflect on the nature of knowledge.',
    assessmentComponents: {
      exhibition: {
        name: 'TOK Exhibition',
        weight: '33%',
        description: 'Students create an exhibition of three objects with accompanying commentary exploring how TOK manifests in the world around us.'
      },
      essay: {
        name: 'TOK Essay',
        weight: '67%',
        wordLimit: 1600,
        description: 'Students write an essay in response to one of six prescribed titles released by the IB.'
      }
    },
    grading: 'A-E',
    corePoints: 'Combined with Extended Essay for up to 3 bonus points'
  },
  
  EXTENDED_ESSAY: {
    code: 'DP_EE',
    name: 'Extended Essay',
    hours: 40,
    wordLimit: 4000,
    description: 'The extended essay is an in-depth study of a focused topic. It is intended to promote high-level research and writing skills, intellectual discovery and creativity.',
    requirements: [
      'Students choose a subject from their DP subjects (or approved alternatives)',
      'Students develop a research question',
      'Students are supported by a supervisor (approximately 3-5 hours of supervision)',
      'Students complete the Reflections on Planning and Progress Form (RPPF)'
    ],
    assessmentCriteria: {
      A: { name: 'Focus and method', maxMarks: 6 },
      B: { name: 'Knowledge and understanding', maxMarks: 6 },
      C: { name: 'Critical thinking', maxMarks: 12 },
      D: { name: 'Presentation', maxMarks: 4 },
      E: { name: 'Engagement', maxMarks: 6 }
    },
    totalMarks: 34,
    grading: 'A-E',
    corePoints: 'Combined with TOK for up to 3 bonus points'
  },
  
  CREATIVITY_ACTIVITY_SERVICE: {
    code: 'DP_CAS',
    name: 'Creativity, Activity, Service',
    duration: '18 months minimum',
    description: 'CAS enables students to enhance their personal and interpersonal development by learning through experience. It involves students in a range of activities alongside their academic studies.',
    strands: {
      creativity: {
        name: 'Creativity',
        description: 'Arts and other experiences that involve creative thinking'
      },
      activity: {
        name: 'Activity',
        description: 'Physical exertion contributing to a healthy lifestyle'
      },
      service: {
        name: 'Service',
        description: 'An unpaid and voluntary exchange that has a learning benefit for the student'
      }
    },
    learningOutcomes: [
      'Identify own strengths and develop areas for growth',
      'Demonstrate that challenges have been undertaken, developing new skills in the process',
      'Demonstrate how to initiate and plan a CAS experience',
      'Show commitment to and perseverance in CAS experiences',
      'Demonstrate the skills and recognise the benefits of working collaboratively',
      'Demonstrate engagement with issues of global significance',
      'Recognise and consider the ethics of choices and actions'
    ],
    requirements: [
      'A CAS project of at least one month duration',
      'Regular activity over 18 months',
      'Demonstration of all 7 learning outcomes',
      'Maintained CAS portfolio with reflections',
      'Three formal interviews with CAS coordinator'
    ],
    grading: 'Pass/Fail (required for Diploma)'
  }
  
} as const;
```

### DP Language B Themes

*Source: IB DP Language B Subject Brief (publicly available)*

```typescript
export const DPLanguageBThemes = {
  
  _attribution: {
    source: 'IB DP Language B Subject Brief',
    note: 'Prescribed themes for Language B courses',
    lastVerified: '2026-01'
  },
  
  themes: [
    {
      code: 'LB_IDE',
      name: 'Identities',
      description: 'Explores the nature of the self and what it means to be human',
      topics: ['Lifestyles', 'Health and well-being', 'Beliefs and values', 'Subcultures', 'Language and identity']
    },
    {
      code: 'LB_EXP',
      name: 'Experiences',
      description: 'Explores events, experiences and journeys that shape our lives',
      topics: ['Leisure activities', 'Holidays and travel', 'Life stories', 'Rites of passage', 'Customs and traditions', 'Migration']
    },
    {
      code: 'LB_HUM',
      name: 'Human ingenuity',
      description: 'Explores the ways humans have created, innovated and expressed themselves',
      topics: ['Entertainment', 'Artistic expressions', 'Communication and media', 'Technology', 'Scientific innovation']
    },
    {
      code: 'LB_SOC',
      name: 'Social organisation',
      description: 'Explores the ways communities are organised and function',
      topics: ['Social relationships', 'Community', 'Social engagement', 'Education', 'The working world', 'Law and order']
    },
    {
      code: 'LB_SHA',
      name: 'Sharing the planet',
      description: 'Explores challenges and opportunities facing the world',
      topics: ['The environment', 'Human rights', 'Peace and conflict', 'Equality', 'Globalisation', 'Ethics', 'Urban and rural environment']
    }
  ]
  
} as const;
```

---

## IB Command Terms

*Source: IB Subject Guides and Assessment Documentation (publicly available excerpts)*

```typescript
export const IBCommandTerms = {
  
  _attribution: {
    source: 'IB Subject Briefs and Assessment Documentation',
    note: 'Command terms are used consistently across IB assessments',
    lastVerified: '2026-01'
  },
  
  // Assessment Objective 1: Knowledge and Understanding
  AO1_KNOWLEDGE: [
    { term: 'Define', description: 'Give the precise meaning of a word, phrase, concept or physical quantity' },
    { term: 'Draw', description: 'Represent by means of a labelled, accurate diagram or graph' },
    { term: 'Identify', description: 'Provide an answer from a number of possibilities; recognise and state briefly a distinguishing fact or feature' },
    { term: 'Label', description: 'Add title, labels or brief explanation(s) to a diagram or graph' },
    { term: 'List', description: 'Give a sequence of brief answers with no explanation' },
    { term: 'Measure', description: 'Obtain a value for a quantity' },
    { term: 'State', description: 'Give a specific name, value or other brief answer without explanation or calculation' }
  ],
  
  // Assessment Objective 2: Application and Analysis
  AO2_APPLICATION: [
    { term: 'Annotate', description: 'Add brief notes to a diagram or graph' },
    { term: 'Apply', description: 'Use knowledge and understanding in response to a given situation or real circumstances' },
    { term: 'Calculate', description: 'Obtain a numerical answer showing the relevant stages in the working' },
    { term: 'Describe', description: 'Give a detailed account or picture of a situation, event, pattern or process' },
    { term: 'Distinguish', description: 'Make clear the differences between two or more concepts or items' },
    { term: 'Estimate', description: 'Obtain an approximate value for an unknown quantity' },
    { term: 'Explain', description: 'Give a detailed account including reasons or causes' },
    { term: 'Outline', description: 'Give a brief account or summary' },
    { term: 'Summarize', description: 'Abstract a general theme or major point(s)' }
  ],
  
  // Assessment Objective 3: Synthesis and Evaluation
  AO3_SYNTHESIS: [
    { term: 'Analyse', description: 'Break down in order to bring out the essential elements or structure; identify parts and relationships' },
    { term: 'Comment', description: 'Give a judgment based on a given statement or result of a calculation' },
    { term: 'Compare', description: 'Give an account of the similarities and differences between two (or more) items or situations' },
    { term: 'Compare and contrast', description: 'Give an account of similarities and differences between two (or more) items or situations, referring to both (all) of them throughout' },
    { term: 'Construct', description: 'Display information in a diagrammatic or logical form' },
    { term: 'Contrast', description: 'Give an account of the differences between two (or more) items or situations, referring to both (all) of them throughout' },
    { term: 'Deduce', description: 'Reach a conclusion from the information given' },
    { term: 'Derive', description: 'Manipulate a mathematical relationship to give a new equation or relationship' },
    { term: 'Design', description: 'Produce a plan, simulation or model' },
    { term: 'Determine', description: 'Obtain the only possible answer' },
    { term: 'Discuss', description: 'Offer a considered and balanced review that includes a range of arguments, factors or hypotheses' },
    { term: 'Evaluate', description: 'Make an appraisal by weighing up the strengths and limitations' },
    { term: 'Examine', description: 'Consider an argument or concept in a way that uncovers the assumptions and interrelationships of the issue' },
    { term: 'Justify', description: 'Give valid reasons or evidence to support an answer or conclusion' },
    { term: 'Predict', description: 'Give an expected result of an upcoming action or event' },
    { term: 'Sketch', description: 'Represent by means of a diagram or graph (labelled as appropriate). The sketch should give a general idea of the required shape or relationship' },
    { term: 'Suggest', description: 'Propose a solution, hypothesis or other possible answer' },
    { term: 'To what extent', description: 'Consider the merits or otherwise of an argument or concept. Opinions and conclusions should be presented clearly and supported with evidence' }
  ]
  
} as const;
```

---

## Integration Notes for Scholarly

### Using This Reference Data

```typescript
// Example: Creating an MYP unit with reference data
const createMYPUnit = (data: MYPUnitInput) => {
  // Validate against reference data
  if (!MYPSubjectGroups[data.subjectGroup]) {
    throw new Error(`Invalid subject group: ${data.subjectGroup}`);
  }
  
  if (!MYPGlobalContexts[data.globalContext]) {
    throw new Error(`Invalid global context: ${data.globalContext}`);
  }
  
  // Use reference data for criterion names
  const criteria = MYPSubjectGroups[data.subjectGroup].criteria;
  
  return {
    ...data,
    criteriaNames: criteria,
    // Note: Detailed strand descriptors require school's official curriculum access
    _referenceDataNote: 'Criterion names from IB MYP Subject Briefs. Full strand descriptors should be added from official IB curriculum documentation.'
  };
};
```

### Enhancing with Official Curriculum

IB World Schools should enhance this reference data with:

1. **Detailed strand descriptors** for each criterion at each achievement level
2. **Subject-specific content** from official subject guides
3. **Assessment exemplars** and mark schemes
4. **Phase-specific objectives** for Language Acquisition
5. **Syllabus content** for DP subjects

### ACARA-IB Mapping

This reference data enables conceptual mapping between ACARA and IB:

| ACARA Element | IB Equivalent | Mapping Notes |
|--------------|---------------|---------------|
| General Capabilities | ATL Skills | Strong conceptual alignment |
| Cross-Curriculum Priorities | Global Contexts | Thematic similarities |
| Achievement Standards | Assessment Criteria | Different models (norm vs criterion) |
| Content Descriptions | Objectives | Structural differences |
| Learning Areas | Subject Groups | Organisational alignment |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 2026 | Initial compilation from public sources |

---

## Contact and Feedback

For corrections or updates to this reference data, please contact the Scholarly development team.

For official IB curriculum documentation, please visit:
- IB Programme Resource Centre: https://resources.ibo.org
- IB Public Website: https://www.ibo.org
