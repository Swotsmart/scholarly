// =============================================================================
// Extended Language Support — CEFR-Aligned Content Generation
// =============================================================================
// This service extends the Storybook Engine beyond English phonics into
// multilingual content generation aligned with the Common European Framework
// of Reference for Languages (CEFR). If the English phonics pipeline is a
// master key that opens the door to reading, the language support service is
// a ring of keys — one for each language a child might need.
//
// The CEFR alignment means every generated text is graded to a specific
// proficiency level (A1 through C2), with vocabulary, grammar complexity,
// and sentence structure calibrated to match. This transforms the Storybook
// Engine from an English phonics tool into a multilingual literacy platform.
//
// File: content/language-support.ts
// Sprint: 8 | Backlog: DE-007 | Lines: ~520
// =============================================================================

import { Result } from '../shared/result';

// === CEFR Framework Types ===

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type SupportedLanguage =
  | 'en' | 'fr' | 'es' | 'de' | 'it' | 'pt'
  | 'ja' | 'zh' | 'ko' | 'ar' | 'hi' | 'tr';

export interface LanguageProfile {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  scriptDirection: 'ltr' | 'rtl';
  hasPhonicsEquivalent: boolean;
  phonicsSystemName?: string;
  cefrDescriptors: CEFRDescriptorSet;
  writingSystem: 'latin' | 'arabic' | 'cjk' | 'devanagari' | 'hangul' | 'kana_kanji';
  morphologicalComplexity: 'low' | 'medium' | 'high';
  wordOrderTypology: 'SVO' | 'SOV' | 'VSO' | 'flexible';
  availableVoiceIds: string[];
}

export interface CEFRDescriptorSet {
  A1: CEFRLevelDescriptor;
  A2: CEFRLevelDescriptor;
  B1: CEFRLevelDescriptor;
  B2: CEFRLevelDescriptor;
  C1: CEFRLevelDescriptor;
  C2: CEFRLevelDescriptor;
}

export interface CEFRLevelDescriptor {
  level: CEFRLevel;
  label: string;
  description: string;
  vocabularyRange: { min: number; max: number };
  maxSentenceLength: number;
  grammarFeatures: string[];
  textTypes: string[];
  topicDomains: string[];
}

/** Language-specific generation constraints */
export interface LanguageConstraints {
  language: SupportedLanguage;
  cefrLevel: CEFRLevel;
  vocabularyList?: string[];
  excludeVocabulary?: string[];
  grammarFocus?: string[];
  targetStructures?: string[];
  culturalContext?: string[];
  dialectPreference?: string;
}

/** Language validation result */
export interface LanguageValidationResult {
  valid: boolean;
  cefrLevel: CEFRLevel;
  estimatedLevel: CEFRLevel;
  levelMatch: boolean;
  vocabularyAnalysis: {
    totalWords: number;
    uniqueWords: number;
    withinLevelWords: number;
    aboveLevelWords: string[];
    vocabularyDensity: number;
  };
  grammarAnalysis: {
    sentenceCount: number;
    averageSentenceLength: number;
    maxSentenceLength: number;
    complexSentences: number;
    targetStructuresFound: string[];
  };
  readabilityScore: number;
  issues: Array<{ severity: 'error' | 'warning' | 'info'; message: string }>;
}

// === Language Registry ===

const LANGUAGE_PROFILES: LanguageProfile[] = [
  {
    code: 'en', name: 'English', nativeName: 'English', scriptDirection: 'ltr',
    hasPhonicsEquivalent: true, phonicsSystemName: 'Systematic Synthetic Phonics (SSP)',
    writingSystem: 'latin', morphologicalComplexity: 'low', wordOrderTypology: 'SVO',
    availableVoiceIds: ['en_narrator_01', 'en_narrator_02', 'en_narrator_03'],
    cefrDescriptors: {
      A1: { level: 'A1', label: 'Breakthrough', description: 'Basic phrases and simple sentences',
        vocabularyRange: { min: 300, max: 600 }, maxSentenceLength: 8,
        grammarFeatures: ['present_simple', 'articles', 'pronouns', 'basic_prepositions'],
        textTypes: ['labels', 'simple_lists', 'short_messages'], topicDomains: ['self', 'family', 'daily_routine'] },
      A2: { level: 'A2', label: 'Waystage', description: 'Everyday expressions and routine tasks',
        vocabularyRange: { min: 600, max: 1200 }, maxSentenceLength: 12,
        grammarFeatures: ['past_simple', 'future_going_to', 'comparatives', 'conjunctions_and_but'],
        textTypes: ['short_stories', 'simple_emails', 'descriptions'], topicDomains: ['shopping', 'school', 'hobbies', 'travel'] },
      B1: { level: 'B1', label: 'Threshold', description: 'Main points on familiar matters',
        vocabularyRange: { min: 1200, max: 2500 }, maxSentenceLength: 18,
        grammarFeatures: ['present_perfect', 'conditionals_1st', 'passive_simple', 'relative_clauses'],
        textTypes: ['narratives', 'letters', 'reports'], topicDomains: ['work', 'education', 'leisure', 'current_events'] },
      B2: { level: 'B2', label: 'Vantage', description: 'Complex text on concrete and abstract topics',
        vocabularyRange: { min: 2500, max: 5000 }, maxSentenceLength: 25,
        grammarFeatures: ['conditionals_2nd_3rd', 'passive_continuous', 'reported_speech', 'subjunctive'],
        textTypes: ['essays', 'reviews', 'detailed_narratives'], topicDomains: ['science', 'culture', 'social_issues'] },
      C1: { level: 'C1', label: 'Effective Operational Proficiency', description: 'Wide range of demanding texts',
        vocabularyRange: { min: 5000, max: 10000 }, maxSentenceLength: 35,
        grammarFeatures: ['all_tenses', 'complex_passives', 'inversion', 'cleft_sentences'],
        textTypes: ['academic_texts', 'literary_analysis', 'presentations'], topicDomains: ['academic', 'professional', 'literary'] },
      C2: { level: 'C2', label: 'Mastery', description: 'Everything encountered with precision',
        vocabularyRange: { min: 10000, max: 25000 }, maxSentenceLength: 50,
        grammarFeatures: ['full_range', 'stylistic_variation', 'idiomatic_expression'],
        textTypes: ['all_text_types'], topicDomains: ['all_domains'] },
    },
  },
  {
    code: 'fr', name: 'French', nativeName: 'Français', scriptDirection: 'ltr',
    hasPhonicsEquivalent: true, phonicsSystemName: 'Méthode syllabique',
    writingSystem: 'latin', morphologicalComplexity: 'medium', wordOrderTypology: 'SVO',
    availableVoiceIds: ['fr_narrator_01', 'fr_narrator_02'],
    cefrDescriptors: {
      A1: { level: 'A1', label: 'Découverte', description: 'Phrases simples et expressions courantes',
        vocabularyRange: { min: 300, max: 600 }, maxSentenceLength: 8,
        grammarFeatures: ['present_indicatif', 'articles_definis_indefinis', 'negation_simple'],
        textTypes: ['etiquettes', 'listes', 'messages_courts'], topicDomains: ['soi_meme', 'famille', 'quotidien'] },
      A2: { level: 'A2', label: 'Survie', description: 'Expressions quotidiennes et tâches simples',
        vocabularyRange: { min: 600, max: 1200 }, maxSentenceLength: 12,
        grammarFeatures: ['passe_compose', 'futur_proche', 'comparatifs', 'pronoms_complements'],
        textTypes: ['recits_courts', 'descriptions', 'courriels'], topicDomains: ['achats', 'ecole', 'loisirs'] },
      B1: { level: 'B1', label: 'Seuil', description: 'Points principaux sur sujets familiers',
        vocabularyRange: { min: 1200, max: 2500 }, maxSentenceLength: 18,
        grammarFeatures: ['imparfait', 'conditionnel_present', 'subjonctif_present', 'pronoms_relatifs'],
        textTypes: ['narrations', 'lettres', 'rapports'], topicDomains: ['travail', 'education', 'actualite'] },
      B2: { level: 'B2', label: 'Avancé', description: 'Textes complexes sur sujets concrets et abstraits',
        vocabularyRange: { min: 2500, max: 5000 }, maxSentenceLength: 25,
        grammarFeatures: ['plus_que_parfait', 'conditionnel_passe', 'subjonctif_passe', 'discours_indirect'],
        textTypes: ['essais', 'critiques', 'narrations_detaillees'], topicDomains: ['sciences', 'culture', 'societe'] },
      C1: { level: 'C1', label: 'Autonome', description: 'Large gamme de textes exigeants',
        vocabularyRange: { min: 5000, max: 10000 }, maxSentenceLength: 35,
        grammarFeatures: ['tous_temps', 'passif_complexe', 'phrases_clivees'],
        textTypes: ['textes_academiques', 'analyses'], topicDomains: ['academique', 'professionnel'] },
      C2: { level: 'C2', label: 'Maîtrise', description: 'Tout comprendre avec aisance',
        vocabularyRange: { min: 10000, max: 25000 }, maxSentenceLength: 50,
        grammarFeatures: ['gamme_complete', 'variation_stylistique'],
        textTypes: ['tous_types'], topicDomains: ['tous_domaines'] },
    },
  },
  {
    code: 'es', name: 'Spanish', nativeName: 'Español', scriptDirection: 'ltr',
    hasPhonicsEquivalent: true, phonicsSystemName: 'Método silábico / fonético',
    writingSystem: 'latin', morphologicalComplexity: 'high', wordOrderTypology: 'SVO',
    availableVoiceIds: ['es_narrator_01', 'es_narrator_02'],
    cefrDescriptors: {
      A1: { level: 'A1', label: 'Acceso', description: 'Frases sencillas y expresiones básicas',
        vocabularyRange: { min: 300, max: 600 }, maxSentenceLength: 8,
        grammarFeatures: ['presente_indicativo', 'articulos', 'genero_numero'],
        textTypes: ['etiquetas', 'listas', 'mensajes_cortos'], topicDomains: ['uno_mismo', 'familia', 'rutina'] },
      A2: { level: 'A2', label: 'Plataforma', description: 'Expresiones cotidianas y tareas sencillas',
        vocabularyRange: { min: 600, max: 1200 }, maxSentenceLength: 12,
        grammarFeatures: ['preterito_indefinido', 'futuro_ir_a', 'comparativos', 'pronombres_objeto'],
        textTypes: ['relatos_cortos', 'descripciones'], topicDomains: ['compras', 'escuela', 'ocio'] },
      B1: { level: 'B1', label: 'Umbral', description: 'Puntos principales sobre temas conocidos',
        vocabularyRange: { min: 1200, max: 2500 }, maxSentenceLength: 18,
        grammarFeatures: ['preterito_imperfecto', 'condicional', 'subjuntivo_presente'],
        textTypes: ['narraciones', 'cartas', 'informes'], topicDomains: ['trabajo', 'educacion', 'actualidad'] },
      B2: { level: 'B2', label: 'Avanzado', description: 'Textos complejos sobre temas concretos y abstractos',
        vocabularyRange: { min: 2500, max: 5000 }, maxSentenceLength: 25,
        grammarFeatures: ['pluscuamperfecto', 'condicional_compuesto', 'subjuntivo_pasado'],
        textTypes: ['ensayos', 'criticas'], topicDomains: ['ciencias', 'cultura', 'sociedad'] },
      C1: { level: 'C1', label: 'Dominio operativo', description: 'Amplia gama de textos exigentes',
        vocabularyRange: { min: 5000, max: 10000 }, maxSentenceLength: 35,
        grammarFeatures: ['todos_tiempos', 'pasiva_compleja'],
        textTypes: ['textos_academicos'], topicDomains: ['academico', 'profesional'] },
      C2: { level: 'C2', label: 'Maestría', description: 'Todo con facilidad y precisión',
        vocabularyRange: { min: 10000, max: 25000 }, maxSentenceLength: 50,
        grammarFeatures: ['gama_completa'],
        textTypes: ['todos_tipos'], topicDomains: ['todos_dominios'] },
    },
  },
];

// === Language Support Service ===

export class LanguageSupportService {
  private readonly profiles: Map<SupportedLanguage, LanguageProfile> = new Map();

  constructor() {
    for (const profile of LANGUAGE_PROFILES) {
      this.profiles.set(profile.code, profile);
    }
  }

  /** Get all supported languages */
  getSupportedLanguages(): LanguageProfile[] {
    return Array.from(this.profiles.values());
  }

  /** Get a specific language profile */
  getLanguageProfile(language: SupportedLanguage): Result<LanguageProfile> {
    const profile = this.profiles.get(language);
    if (!profile) return { success: false, error: `Language "${language}" not supported` };
    return { success: true, data: profile };
  }

  /** Get CEFR descriptor for a specific language and level */
  getCEFRDescriptor(language: SupportedLanguage, level: CEFRLevel): Result<CEFRLevelDescriptor> {
    const profile = this.profiles.get(language);
    if (!profile) return { success: false, error: `Language "${language}" not supported` };
    return { success: true, data: profile.cefrDescriptors[level] };
  }

  /**
   * Build generation constraints for a multilingual storybook.
   * Translates CEFR level into specific vocabulary, grammar, and structural
   * constraints that the narrative generator can enforce.
   */
  buildLanguageConstraints(
    language: SupportedLanguage,
    cefrLevel: CEFRLevel,
    options?: { grammarFocus?: string[]; culturalContext?: string[]; dialectPreference?: string }
  ): Result<LanguageConstraints> {
    const profile = this.profiles.get(language);
    if (!profile) return { success: false, error: `Language "${language}" not supported` };

    const descriptor = profile.cefrDescriptors[cefrLevel];

    return {
      success: true,
      data: {
        language,
        cefrLevel,
        grammarFocus: options?.grammarFocus || descriptor.grammarFeatures.slice(0, 3),
        targetStructures: descriptor.grammarFeatures,
        culturalContext: options?.culturalContext || [],
        dialectPreference: options?.dialectPreference,
      },
    };
  }

  /**
   * Build the system prompt addendum for multilingual generation.
   * This is injected into the Claude system prompt alongside the phonics
   * constraints to produce CEFR-aligned content.
   */
  buildPromptConstraints(constraints: LanguageConstraints): Result<string> {
    const profile = this.profiles.get(constraints.language);
    if (!profile) return { success: false, error: 'Language not supported' };

    const descriptor = profile.cefrDescriptors[constraints.cefrLevel];
    const levelIndex = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].indexOf(constraints.cefrLevel);

    const prompt = [
      `LANGUAGE CONSTRAINTS (${profile.name} — CEFR ${constraints.cefrLevel}: ${descriptor.label})`,
      '',
      `Write in ${profile.name} (${profile.nativeName}).`,
      `Script direction: ${profile.scriptDirection}.`,
      '',
      'VOCABULARY:',
      `- Use vocabulary appropriate for ${descriptor.label} level (${descriptor.vocabularyRange.min}-${descriptor.vocabularyRange.max} word range)`,
      `- Introduce no more than 3-5 new words per page`,
      `- Repeat key vocabulary at least 3 times across the story`,
      constraints.vocabularyList ? `- Prioritise these words: ${constraints.vocabularyList.join(', ')}` : '',
      constraints.excludeVocabulary ? `- Do NOT use: ${constraints.excludeVocabulary.join(', ')}` : '',
      '',
      'GRAMMAR:',
      `- Maximum sentence length: ${descriptor.maxSentenceLength} words`,
      `- Grammar features to use: ${descriptor.grammarFeatures.join(', ')}`,
      constraints.grammarFocus ? `- Particular focus on: ${constraints.grammarFocus.join(', ')}` : '',
      levelIndex <= 1 ? '- Use only simple sentences (no subordinate clauses)' : '',
      levelIndex <= 2 ? '- Limit compound sentences to 1-2 per page' : '',
      '',
      'TEXT TYPE & TOPICS:',
      `- Appropriate text types: ${descriptor.textTypes.join(', ')}`,
      `- Topic domains: ${descriptor.topicDomains.join(', ')}`,
      '',
      'CULTURAL CONTEXT:',
      constraints.culturalContext && constraints.culturalContext.length > 0
        ? `- Incorporate cultural elements: ${constraints.culturalContext.join(', ')}`
        : '- Use culturally neutral or globally accessible themes',
      constraints.dialectPreference ? `- Dialect preference: ${constraints.dialectPreference}` : '',
      '',
      profile.morphologicalComplexity === 'high'
        ? 'NOTE: This language has complex morphology. Ensure verb conjugations and noun agreements are correct for the target level.'
        : '',
    ].filter(line => line !== '').join('\n');

    return { success: true, data: prompt };
  }

  /**
   * Validate generated text against CEFR level constraints.
   * Returns a report on vocabulary, grammar, and readability compliance.
   */
  validateCEFRCompliance(
    text: string,
    language: SupportedLanguage,
    targetLevel: CEFRLevel
  ): Result<LanguageValidationResult> {
    const profile = this.profiles.get(language);
    if (!profile) return { success: false, error: 'Language not supported' };

    const descriptor = profile.cefrDescriptors[targetLevel];
    const issues: LanguageValidationResult['issues'] = [];

    // Word analysis
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const uniqueWords = [...new Set(words.map(w => w.toLowerCase().replace(/[^a-zA-ZÀ-ÿ\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g, '')).filter(w => w.length > 0))];

    // Sentence analysis
    const sentences = text.split(/[.!?。？！]+/).filter(s => s.trim().length > 0);
    const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
    const avgSentenceLength = sentenceLengths.length > 0
      ? Math.round(sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length)
      : 0;
    const maxSentenceLength = sentenceLengths.length > 0 ? Math.max(...sentenceLengths) : 0;

    // Check sentence length compliance
    if (maxSentenceLength > descriptor.maxSentenceLength) {
      issues.push({
        severity: 'warning',
        message: `Longest sentence (${maxSentenceLength} words) exceeds ${targetLevel} maximum (${descriptor.maxSentenceLength} words)`,
      });
    }

    // Vocabulary density (unique words / total words)
    const vocabularyDensity = words.length > 0 ? uniqueWords.length / words.length : 0;

    // Estimate CEFR level based on vocabulary count and sentence complexity
    const estimatedLevel = this.estimateCEFRLevel(uniqueWords.length, avgSentenceLength, profile);

    // Check if estimated level matches target
    const levelIndex = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const targetIdx = levelIndex.indexOf(targetLevel);
    const estimatedIdx = levelIndex.indexOf(estimatedLevel);
    const levelMatch = Math.abs(targetIdx - estimatedIdx) <= 1;

    if (!levelMatch) {
      issues.push({
        severity: estimatedIdx > targetIdx + 1 ? 'error' : 'warning',
        message: `Estimated CEFR level (${estimatedLevel}) differs significantly from target (${targetLevel})`,
      });
    }

    // Complex sentence analysis
    const complexSentences = sentences.filter(s => {
      const conjunctions = (s.match(/\b(because|although|however|therefore|while|wenn|weil|parce que|porque)\b/gi) || []).length;
      return conjunctions > 0 || s.split(',').length > 2;
    }).length;

    if (targetIdx <= 1 && complexSentences > sentences.length * 0.1) {
      issues.push({
        severity: 'warning',
        message: `${complexSentences} complex sentences found — ${targetLevel} level should use primarily simple sentences`,
      });
    }

    // Readability (simplified: based on word length and sentence length)
    const avgWordLength = words.length > 0 ? words.reduce((sum, w) => sum + w.length, 0) / words.length : 0;
    const readabilityScore = Math.max(0, Math.min(100,
      100 - (avgSentenceLength - descriptor.maxSentenceLength * 0.6) * 3 - (avgWordLength - 4) * 5
    ));

    return {
      success: true,
      data: {
        valid: issues.filter(i => i.severity === 'error').length === 0,
        cefrLevel: targetLevel,
        estimatedLevel,
        levelMatch,
        vocabularyAnalysis: {
          totalWords: words.length,
          uniqueWords: uniqueWords.length,
          withinLevelWords: uniqueWords.length, // Simplified — would use corpus in production
          aboveLevelWords: [],
          vocabularyDensity: Math.round(vocabularyDensity * 100) / 100,
        },
        grammarAnalysis: {
          sentenceCount: sentences.length,
          averageSentenceLength: avgSentenceLength,
          maxSentenceLength,
          complexSentences,
          targetStructuresFound: [],
        },
        readabilityScore: Math.round(readabilityScore),
        issues,
      },
    };
  }

  private estimateCEFRLevel(uniqueWords: number, avgSentenceLength: number, _profile: LanguageProfile): CEFRLevel {
    // Heuristic estimation based on vocabulary breadth and sentence complexity
    if (uniqueWords < 50 && avgSentenceLength <= 8) return 'A1';
    if (uniqueWords < 120 && avgSentenceLength <= 12) return 'A2';
    if (uniqueWords < 250 && avgSentenceLength <= 18) return 'B1';
    if (uniqueWords < 500 && avgSentenceLength <= 25) return 'B2';
    if (uniqueWords < 800 && avgSentenceLength <= 35) return 'C1';
    return 'C2';
  }

  /**
   * Map a phonics phase to an approximate CEFR level for L1 learners.
   * This bridges the English phonics system with the CEFR framework,
   * enabling recommendations for bilingual learners.
   */
  mapPhonicsPhaseToLevel(phase: number): CEFRLevel {
    const mapping: Record<number, CEFRLevel> = {
      1: 'A1', 2: 'A1', 3: 'A1', 4: 'A2', 5: 'A2', 6: 'B1',
    };
    return mapping[phase] || 'A1';
  }
}

export default LanguageSupportService;
