// =============================================================================
// Multilingual Story Generator — French & Spanish CEFR-Aligned Generation
// =============================================================================
// Extends the Storybook Engine to French and Spanish with language-specific
// phonological constraint systems, cultural adaptation, and CEFR validation.
// =============================================================================

import { ScholarlyBaseService, Result, NATSClient, PrismaClient } from '../shared/types';

export enum SupportedLanguage { FRENCH = 'fr', SPANISH = 'es' }
export enum CEFRLevel { A1 = 'A1', A2 = 'A2', B1 = 'B1', B2 = 'B2', C1 = 'C1', C2 = 'C2' }

export interface PhonologicalUnit {
  grapheme: string; phoneme: string; phase: number;
  frequency: number; exampleWord: string; notes: string;
}

export interface PhonologyPhase {
  phase: number; name: string; units: PhonologicalUnit[]; description: string;
}

export interface LanguagePhonologyProfile {
  language: SupportedLanguage; totalPhonemes: number;
  phases: PhonologyPhase[]; trickyWords: Record<number, string[]>;
  syllablePatterns: string[];
}

export interface MultilingualStoryRequest {
  tenantId: string; language: SupportedLanguage; cefrLevel: CEFRLevel;
  phonicsPhase: number; targetGraphemes: string[]; theme: string;
  ageGroup: { min: number; max: number }; pageCount: number;
  culturalContext?: string; seriesId?: string; characterNames?: string[];
}

export interface StoryPage {
  pageNumber: number; text: string; wordCount: number;
  decodableWords: string[]; nonDecodableWords: string[];
  targetGraphemeInstances: string[]; sentenceCount: number; avgSentenceLength: number;
}

export interface VocabularyProfile {
  uniqueWords: number; totalWords: number; tier1Percentage: number;
  tier2Percentage: number; avgWordLength: number; avgSentenceLength: number;
  estimatedCEFR: CEFRLevel;
}

export interface IllustrationPrompt {
  pageNumber: number; sceneDescription: string; characters: string[];
  setting: string; mood: string; culturalElements: string[];
}

export interface GeneratedMultilingualStory {
  id: string; language: SupportedLanguage; cefrLevel: CEFRLevel;
  phonicsPhase: number; title: string; pages: StoryPage[];
  decodabilityScore: number; cefrComplianceScore: number;
  culturalAdaptationNotes: string[]; targetGraphemes: string[];
  graphemeCoverage: number; vocabularyProfile: VocabularyProfile;
  illustrationPrompts: IllustrationPrompt[];
}

// ─── French Phonology ───────────────────────────────────────────────────────

const FRENCH_PHASES: PhonologyPhase[] = [
  { phase: 1, name: 'Voyelles simples et consonnes frequentes', description: 'Simple vowels and frequent consonants',
    units: [
      { grapheme: 'a', phoneme: '/a/', phase: 1, frequency: 0.08, exampleWord: 'chat', notes: 'Open front' },
      { grapheme: 'i', phoneme: '/i/', phase: 1, frequency: 0.07, exampleWord: 'lit', notes: 'Close front' },
      { grapheme: 'o', phoneme: '/o/', phase: 1, frequency: 0.05, exampleWord: 'mot', notes: 'Mid back' },
      { grapheme: 'u', phoneme: '/y/', phase: 1, frequency: 0.04, exampleWord: 'lune', notes: 'Close front rounded' },
      { grapheme: 'e', phoneme: '/e/', phase: 1, frequency: 0.12, exampleWord: 'le', notes: 'Schwa' },
      { grapheme: 'l', phoneme: '/l/', phase: 1, frequency: 0.06, exampleWord: 'la', notes: '' },
      { grapheme: 'm', phoneme: '/m/', phase: 1, frequency: 0.03, exampleWord: 'maman', notes: '' },
      { grapheme: 'n', phoneme: '/n/', phase: 1, frequency: 0.03, exampleWord: 'non', notes: '' },
      { grapheme: 'p', phoneme: '/p/', phase: 1, frequency: 0.03, exampleWord: 'papa', notes: '' },
      { grapheme: 't', phoneme: '/t/', phase: 1, frequency: 0.04, exampleWord: 'tata', notes: '' },
      { grapheme: 'r', phoneme: '/R/', phase: 1, frequency: 0.06, exampleWord: 'rat', notes: 'Uvular' },
      { grapheme: 's', phoneme: '/s/', phase: 1, frequency: 0.05, exampleWord: 'sol', notes: '' },
    ] },
  { phase: 2, name: 'Digraphes vocaliques', description: 'Vowel digraphs and additional consonants',
    units: [
      { grapheme: 'ou', phoneme: '/u/', phase: 2, frequency: 0.04, exampleWord: 'loup', notes: '' },
      { grapheme: 'oi', phoneme: '/wa/', phase: 2, frequency: 0.03, exampleWord: 'roi', notes: '' },
      { grapheme: 'au', phoneme: '/o/', phase: 2, frequency: 0.02, exampleWord: 'chaud', notes: '' },
      { grapheme: 'eau', phoneme: '/o/', phase: 2, frequency: 0.02, exampleWord: 'beau', notes: 'Trigraph' },
      { grapheme: 'ai', phoneme: '/E/', phase: 2, frequency: 0.03, exampleWord: 'lait', notes: '' },
      { grapheme: 'ch', phoneme: '/S/', phase: 2, frequency: 0.02, exampleWord: 'chat', notes: '' },
      { grapheme: 'b', phoneme: '/b/', phase: 2, frequency: 0.02, exampleWord: 'bebe', notes: '' },
      { grapheme: 'd', phoneme: '/d/', phase: 2, frequency: 0.03, exampleWord: 'dodo', notes: '' },
      { grapheme: 'f', phoneme: '/f/', phase: 2, frequency: 0.02, exampleWord: 'fee', notes: '' },
      { grapheme: 'v', phoneme: '/v/', phase: 2, frequency: 0.02, exampleWord: 'vite', notes: '' },
      { grapheme: 'j', phoneme: '/Z/', phase: 2, frequency: 0.01, exampleWord: 'joli', notes: '' },
    ] },
  { phase: 3, name: 'Voyelles nasales', description: 'Nasal vowels and complex graphemes',
    units: [
      { grapheme: 'an', phoneme: '/A~/', phase: 3, frequency: 0.03, exampleWord: 'maman', notes: 'Nasal' },
      { grapheme: 'en', phoneme: '/A~/', phase: 3, frequency: 0.03, exampleWord: 'enfant', notes: 'Same as an' },
      { grapheme: 'on', phoneme: '/O~/', phase: 3, frequency: 0.02, exampleWord: 'maison', notes: 'Nasal' },
      { grapheme: 'in', phoneme: '/E~/', phase: 3, frequency: 0.02, exampleWord: 'lapin', notes: 'Nasal' },
      { grapheme: 'ain', phoneme: '/E~/', phase: 3, frequency: 0.01, exampleWord: 'pain', notes: '' },
      { grapheme: 'un', phoneme: '/9~/', phase: 3, frequency: 0.01, exampleWord: 'lundi', notes: '' },
      { grapheme: 'gn', phoneme: '/J/', phase: 3, frequency: 0.01, exampleWord: 'montagne', notes: 'Palatal nasal' },
      { grapheme: 'ph', phoneme: '/f/', phase: 3, frequency: 0.01, exampleWord: 'photo', notes: '' },
      { grapheme: 'qu', phoneme: '/k/', phase: 3, frequency: 0.02, exampleWord: 'qui', notes: '' },
    ] },
  { phase: 4, name: 'Lettres muettes et accents', description: 'Silent letters, accents, complex endings',
    units: [
      { grapheme: 'e_accent_aigu', phoneme: '/e/', phase: 4, frequency: 0.04, exampleWord: 'ete', notes: 'Closed e' },
      { grapheme: 'e_accent_grave', phoneme: '/E/', phase: 4, frequency: 0.02, exampleWord: 'mere', notes: 'Open e' },
      { grapheme: 'tion', phoneme: '/sjO~/', phase: 4, frequency: 0.02, exampleWord: 'attention', notes: '' },
      { grapheme: '-er', phoneme: '/e/', phase: 4, frequency: 0.04, exampleWord: 'manger', notes: 'Infinitive' },
      { grapheme: 'eur', phoneme: '/9R/', phase: 4, frequency: 0.01, exampleWord: 'fleur', notes: '' },
      { grapheme: 'ment', phoneme: '/mA~/', phase: 4, frequency: 0.01, exampleWord: 'lentement', notes: '' },
    ] },
];

const FRENCH_TRICKY: Record<number, string[]> = {
  1: ['est', 'et', 'un', 'une', 'le', 'la', 'les', 'des', 'je', 'tu', 'il', 'elle'],
  2: ['dans', 'avec', 'pour', 'sur', 'mais', 'ou', 'qui', 'que', 'comment', 'pourquoi'],
  3: ['beaucoup', 'aussi', 'encore', 'toujours', 'jamais', 'rien', 'tout', 'tres'],
  4: ['aujourd_hui', 'maintenant', 'quelque', 'plusieurs', 'chaque', 'autre', 'meme'],
};

// ─── Spanish Phonology ──────────────────────────────────────────────────────

const SPANISH_PHASES: PhonologyPhase[] = [
  { phase: 1, name: 'Vocales y consonantes frecuentes', description: 'Five vowels and frequent consonants',
    units: [
      { grapheme: 'a', phoneme: '/a/', phase: 1, frequency: 0.12, exampleWord: 'mama', notes: '' },
      { grapheme: 'e', phoneme: '/e/', phase: 1, frequency: 0.13, exampleWord: 'mesa', notes: '' },
      { grapheme: 'i', phoneme: '/i/', phase: 1, frequency: 0.07, exampleWord: 'isla', notes: '' },
      { grapheme: 'o', phoneme: '/o/', phase: 1, frequency: 0.09, exampleWord: 'oso', notes: '' },
      { grapheme: 'u', phoneme: '/u/', phase: 1, frequency: 0.04, exampleWord: 'uva', notes: '' },
      { grapheme: 'm', phoneme: '/m/', phase: 1, frequency: 0.03, exampleWord: 'mama', notes: '' },
      { grapheme: 'p', phoneme: '/p/', phase: 1, frequency: 0.03, exampleWord: 'papa', notes: '' },
      { grapheme: 's', phoneme: '/s/', phase: 1, frequency: 0.07, exampleWord: 'sol', notes: '' },
      { grapheme: 'l', phoneme: '/l/', phase: 1, frequency: 0.05, exampleWord: 'luna', notes: '' },
      { grapheme: 't', phoneme: '/t/', phase: 1, frequency: 0.04, exampleWord: 'taza', notes: '' },
      { grapheme: 'n', phoneme: '/n/', phase: 1, frequency: 0.06, exampleWord: 'nido', notes: '' },
      { grapheme: 'd', phoneme: '/d/', phase: 1, frequency: 0.04, exampleWord: 'dado', notes: '' },
    ] },
  { phase: 2, name: 'Consonantes adicionales', description: 'Additional consonants and direct syllables',
    units: [
      { grapheme: 'b', phoneme: '/b/', phase: 2, frequency: 0.02, exampleWord: 'bota', notes: '' },
      { grapheme: 'c', phoneme: '/k/', phase: 2, frequency: 0.04, exampleWord: 'casa', notes: 'Before a,o,u' },
      { grapheme: 'f', phoneme: '/f/', phase: 2, frequency: 0.01, exampleWord: 'foca', notes: '' },
      { grapheme: 'g', phoneme: '/g/', phase: 2, frequency: 0.02, exampleWord: 'gato', notes: 'Before a,o,u' },
      { grapheme: 'h', phoneme: '(silent)', phase: 2, frequency: 0.01, exampleWord: 'hola', notes: 'Always silent' },
      { grapheme: 'j', phoneme: '/x/', phase: 2, frequency: 0.01, exampleWord: 'jugo', notes: '' },
      { grapheme: 'r', phoneme: '/r/', phase: 2, frequency: 0.06, exampleWord: 'pero', notes: 'Tap' },
      { grapheme: 'v', phoneme: '/b/', phase: 2, frequency: 0.01, exampleWord: 'vaca', notes: 'Same as b' },
      { grapheme: 'z', phoneme: '/s/', phase: 2, frequency: 0.01, exampleWord: 'zapato', notes: '' },
    ] },
  { phase: 3, name: 'Silabas trabadas y digrafos', description: 'Blends and digraphs',
    units: [
      { grapheme: 'ch', phoneme: '/tS/', phase: 3, frequency: 0.01, exampleWord: 'chocolate', notes: '' },
      { grapheme: 'll', phoneme: '/j/', phase: 3, frequency: 0.02, exampleWord: 'llama', notes: '' },
      { grapheme: 'rr', phoneme: '/rr/', phase: 3, frequency: 0.01, exampleWord: 'perro', notes: 'Trill' },
      { grapheme: 'qu', phoneme: '/k/', phase: 3, frequency: 0.02, exampleWord: 'queso', notes: 'Before e,i' },
      { grapheme: 'gu', phoneme: '/g/', phase: 3, frequency: 0.01, exampleWord: 'guitarra', notes: 'Before e,i' },
      { grapheme: 'br', phoneme: '/br/', phase: 3, frequency: 0.01, exampleWord: 'brazo', notes: 'Blend' },
      { grapheme: 'cr', phoneme: '/kr/', phase: 3, frequency: 0.01, exampleWord: 'crema', notes: 'Blend' },
      { grapheme: 'pl', phoneme: '/pl/', phase: 3, frequency: 0.01, exampleWord: 'plato', notes: 'Blend' },
      { grapheme: 'tr', phoneme: '/tr/', phase: 3, frequency: 0.01, exampleWord: 'tren', notes: 'Blend' },
    ] },
  { phase: 4, name: 'Diptongos y acentuacion', description: 'Diphthongs and accent rules',
    units: [
      { grapheme: 'ai', phoneme: '/ai/', phase: 4, frequency: 0.01, exampleWord: 'aire', notes: '' },
      { grapheme: 'ei', phoneme: '/ei/', phase: 4, frequency: 0.01, exampleWord: 'seis', notes: '' },
      { grapheme: 'ue', phoneme: '/we/', phase: 4, frequency: 0.02, exampleWord: 'puerta', notes: '' },
      { grapheme: 'ie', phoneme: '/je/', phase: 4, frequency: 0.02, exampleWord: 'tierra', notes: '' },
      { grapheme: 'cion', phoneme: '/sjon/', phase: 4, frequency: 0.01, exampleWord: 'cancion', notes: '' },
    ] },
];

const SPANISH_TRICKY: Record<number, string[]> = {
  1: ['el', 'la', 'los', 'las', 'un', 'una', 'yo', 'tu', 'es', 'y', 'de', 'en', 'no', 'si'],
  2: ['hay', 'muy', 'con', 'sin', 'por', 'para', 'que', 'como', 'este', 'ese'],
  3: ['tambien', 'siempre', 'nunca', 'todo', 'nada', 'mucho', 'poco', 'otro'],
  4: ['porque', 'aunque', 'mientras', 'cuando', 'donde', 'quien', 'cual'],
};

// ─── CEFR Constraints ───────────────────────────────────────────────────────

interface CEFRConstraints {
  maxVocabularySize: number; maxSentenceLength: number; maxWordsPerPage: number;
  grammarFeatures: string[]; topicDomains: string[];
}

const CEFR_CONSTRAINTS: Record<CEFRLevel, CEFRConstraints> = {
  [CEFRLevel.A1]: { maxVocabularySize: 500, maxSentenceLength: 8, maxWordsPerPage: 30, grammarFeatures: ['present tense', 'simple nouns', 'articles'], topicDomains: ['family', 'animals', 'food', 'colours'] },
  [CEFRLevel.A2]: { maxVocabularySize: 1000, maxSentenceLength: 12, maxWordsPerPage: 50, grammarFeatures: ['past tense', 'future', 'comparatives'], topicDomains: ['routines', 'weather', 'hobbies', 'travel'] },
  [CEFRLevel.B1]: { maxVocabularySize: 2000, maxSentenceLength: 18, maxWordsPerPage: 80, grammarFeatures: ['complex past', 'conditionals', 'relative clauses'], topicDomains: ['environment', 'technology', 'culture'] },
  [CEFRLevel.B2]: { maxVocabularySize: 4000, maxSentenceLength: 25, maxWordsPerPage: 120, grammarFeatures: ['subjunctive', 'complex subordination'], topicDomains: ['science', 'politics', 'arts'] },
  [CEFRLevel.C1]: { maxVocabularySize: 8000, maxSentenceLength: 35, maxWordsPerPage: 180, grammarFeatures: ['all grammar', 'idiomatic'], topicDomains: ['any'] },
  [CEFRLevel.C2]: { maxVocabularySize: 16000, maxSentenceLength: 50, maxWordsPerPage: 250, grammarFeatures: ['native-level'], topicDomains: ['any'] },
};

// ─── Cultural Profiles ──────────────────────────────────────────────────────

interface CulturalProfile {
  language: SupportedLanguage;
  nameBank: { male: string[]; female: string[] };
  settings: string[]; foodReferences: string[]; celebrations: string[];
}

const CULTURAL_PROFILES: Record<SupportedLanguage, CulturalProfile> = {
  [SupportedLanguage.FRENCH]: {
    nameBank: { male: ['Pierre', 'Louis', 'Hugo', 'Arthur', 'Leo'], female: ['Emma', 'Lea', 'Chloe', 'Manon', 'Jade'] },
    settings: ['Paris', 'la campagne', 'le marche', 'la boulangerie', 'le jardin', 'la plage'],
    foodReferences: ['croissant', 'baguette', 'crepe', 'fromage', 'tarte', 'chocolat'],
    celebrations: ['Noel', 'la Chandeleur', 'Paques'],
  },
  [SupportedLanguage.SPANISH]: {
    nameBank: { male: ['Pablo', 'Mateo', 'Lucas', 'Hugo', 'Diego'], female: ['Lucia', 'Sofia', 'Martina', 'Maria', 'Julia'] },
    settings: ['la playa', 'el mercado', 'la plaza', 'el parque', 'la cocina', 'el campo'],
    foodReferences: ['tortilla', 'paella', 'churros', 'empanada', 'fruta', 'arroz'],
    celebrations: ['Navidad', 'Dia de los Reyes', 'carnaval'],
  },
};

// ─── Service ────────────────────────────────────────────────────────────────

export class MultilingualStoryGenerator extends ScholarlyBaseService {
  private frenchPhonology: LanguagePhonologyProfile;
  private spanishPhonology: LanguagePhonologyProfile;

  constructor(
    private prisma: PrismaClient, private nats: NATSClient,
    private aiProvider: { generateText: (prompt: string, system: string) => Promise<Result<string>> },
  ) {
    super('MultilingualStoryGenerator');
    this.frenchPhonology = { language: SupportedLanguage.FRENCH, totalPhonemes: 36, phases: FRENCH_PHASES, trickyWords: FRENCH_TRICKY, syllablePatterns: ['CV', 'CVC', 'CCV', 'V', 'VC'] };
    this.spanishPhonology = { language: SupportedLanguage.SPANISH, totalPhonemes: 24, phases: SPANISH_PHASES, trickyWords: SPANISH_TRICKY, syllablePatterns: ['CV', 'CVC', 'CCV', 'V', 'VC'] };
  }

  async generateStory(request: MultilingualStoryRequest): Promise<Result<GeneratedMultilingualStory>> {
    const phonology = request.language === SupportedLanguage.FRENCH ? this.frenchPhonology : this.spanishPhonology;
    const cultural = CULTURAL_PROFILES[request.language];
    const cefrConstraints = CEFR_CONSTRAINTS[request.cefrLevel];
    const taughtGraphemes = this.getTaughtGraphemes(phonology, request.phonicsPhase);
    const trickyWords = this.getTrickyWords(phonology, request.phonicsPhase);

    const systemPrompt = this.buildSystemPrompt(request, phonology, cultural, cefrConstraints, taughtGraphemes, trickyWords);
    const userPrompt = this.buildUserPrompt(request, cultural);

    const aiResult = await this.aiProvider.generateText(userPrompt, systemPrompt);
    if (!aiResult.success) return { success: false, error: aiResult.error! };

    const parsed = this.parseStoryResponse(aiResult.data!, request);
    if (!parsed.success) return { success: false, error: parsed.error! };

    const decodability = this.validateDecodability(parsed.data!.pages, taughtGraphemes, trickyWords, request.language);
    const cefr = this.validateCEFRCompliance(parsed.data!.pages, cefrConstraints);

    if (decodability.score < 80) {
      const retryPrompt = `Previous story had non-decodable words: ${decodability.nonDecodableWords.join(', ')}. Rewrite using only: ${taughtGraphemes.join(', ')}`;
      const retry = await this.aiProvider.generateText(retryPrompt, systemPrompt);
      if (retry.success) {
        const rp = this.parseStoryResponse(retry.data!, request);
        if (rp.success) {
          const rd = this.validateDecodability(rp.data!.pages, taughtGraphemes, trickyWords, request.language);
          if (rd.score > decodability.score) {
            return { success: true, data: { ...rp.data!, decodabilityScore: rd.score, cefrComplianceScore: cefr.score, graphemeCoverage: rd.graphemeCoverage, illustrationPrompts: this.generateIllustrationPrompts(rp.data!.pages, request, cultural), culturalAdaptationNotes: [`Story uses culturally appropriate ${request.language === SupportedLanguage.FRENCH ? 'French' : 'Spanish'} names and settings`] } };
          }
        }
      }
    }

    const story: GeneratedMultilingualStory = {
      ...parsed.data!, decodabilityScore: decodability.score, cefrComplianceScore: cefr.score,
      culturalAdaptationNotes: [`Culturally adapted for ${request.language}`],
      graphemeCoverage: decodability.graphemeCoverage,
      illustrationPrompts: this.generateIllustrationPrompts(parsed.data!.pages, request, cultural),
    };

    await this.nats.publish('scholarly.content.multilingual_story_generated', {
      language: request.language, cefrLevel: request.cefrLevel, phonicsPhase: request.phonicsPhase,
      decodabilityScore: story.decodabilityScore, tenantId: request.tenantId,
    });

    return { success: true, data: story };
  }

  private buildSystemPrompt(request: MultilingualStoryRequest, phonology: LanguagePhonologyProfile, cultural: CulturalProfile, cefr: CEFRConstraints, taughtGraphemes: string[], trickyWords: string[]): string {
    const lang = request.language === SupportedLanguage.FRENCH ? 'French' : 'Spanish';
    return `You are a ${lang} children's story writer. Write ONLY in ${lang}.\nCEFR: ${request.cefrLevel}, Phase: ${request.phonicsPhase}\nUse ONLY words decodable with: ${taughtGraphemes.join(', ')}\nTricky words allowed: ${trickyWords.join(', ')}\nMax sentence length: ${cefr.maxSentenceLength} words\nMax words/page: ${cefr.maxWordsPerPage}\nReturn JSON: { "title": "...", "pages": [{ "pageNumber": 1, "text": "..." }] }`;
  }

  private buildUserPrompt(request: MultilingualStoryRequest, cultural: CulturalProfile): string {
    const names = request.characterNames || [cultural.nameBank.male[0], cultural.nameBank.female[0]];
    return `Write a ${request.pageCount}-page story about "${request.theme}". Characters: ${names.join(', ')}. Target graphemes: ${request.targetGraphemes.join(', ')}`;
  }

  private validateDecodability(pages: StoryPage[], taught: string[], tricky: string[], lang: SupportedLanguage): { score: number; nonDecodableWords: string[]; graphemeCoverage: number } {
    const allWords: string[] = []; const nonDecodable: string[] = []; const hits = new Set<string>();
    for (const page of pages) {
      const words = page.text.toLowerCase().replace(/[.,!?;:'"()\-]/g, '').split(/\s+/).filter(Boolean);
      for (const w of words) {
        allWords.push(w);
        if (tricky.includes(w)) continue;
        if (this.isDecodable(w, taught)) { for (const g of taught) if (w.includes(g)) hits.add(g); }
        else nonDecodable.push(w);
      }
    }
    const score = allWords.length > 0 ? ((allWords.length - nonDecodable.length) / allWords.length) * 100 : 0;
    return { score: Math.round(score * 10) / 10, nonDecodableWords: [...new Set(nonDecodable)], graphemeCoverage: taught.length > 0 ? Math.round((hits.size / taught.length) * 1000) / 10 : 0 };
  }

  private isDecodable(word: string, taught: string[]): boolean {
    const sorted = [...taught].sort((a, b) => b.length - a.length);
    let rem = word;
    while (rem.length > 0) {
      let matched = false;
      for (const g of sorted) { if (rem.startsWith(g)) { rem = rem.slice(g.length); matched = true; break; } }
      if (!matched) return false;
    }
    return true;
  }

  private validateCEFRCompliance(pages: StoryPage[], constraints: CEFRConstraints): { score: number; violations: string[] } {
    const violations: string[] = []; let total = 0; let bad = 0;
    for (const p of pages) {
      const sentences = p.text.split(/[.!?]+/).filter(Boolean);
      for (const s of sentences) { total++; const wc = s.trim().split(/\s+/).length; if (wc > constraints.maxSentenceLength) { bad++; violations.push(`Page ${p.pageNumber}: ${wc} words`); } }
    }
    return { score: total > 0 ? Math.round(((total - bad) / total) * 1000) / 10 : 100, violations };
  }

  private parseStoryResponse(response: string, request: MultilingualStoryRequest): Result<GeneratedMultilingualStory> {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { success: false, error: 'No JSON found' };
      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.title || !parsed.pages) return { success: false, error: 'Missing title/pages' };
      const pages: StoryPage[] = parsed.pages.map((p: any) => {
        const words = p.text.split(/\s+/).filter(Boolean);
        const sentences = p.text.split(/[.!?]+/).filter(Boolean);
        return { pageNumber: p.pageNumber, text: p.text, wordCount: words.length, decodableWords: [], nonDecodableWords: [], targetGraphemeInstances: [], sentenceCount: sentences.length, avgSentenceLength: sentences.length > 0 ? words.length / sentences.length : 0 };
      });
      return { success: true, data: { id: `ml_${Date.now()}`, language: request.language, cefrLevel: request.cefrLevel, phonicsPhase: request.phonicsPhase, title: parsed.title, pages, decodabilityScore: 0, cefrComplianceScore: 0, culturalAdaptationNotes: [], targetGraphemes: request.targetGraphemes, graphemeCoverage: 0, vocabularyProfile: { uniqueWords: new Set(pages.flatMap(p => p.text.split(/\s+/))).size, totalWords: pages.reduce((s, p) => s + p.wordCount, 0), tier1Percentage: 80, tier2Percentage: 15, avgWordLength: 4, avgSentenceLength: 6, estimatedCEFR: request.cefrLevel }, illustrationPrompts: [] } };
    } catch (e) { return { success: false, error: `Parse: ${(e as Error).message}` }; }
  }

  private generateIllustrationPrompts(pages: StoryPage[], request: MultilingualStoryRequest, cultural: CulturalProfile): IllustrationPrompt[] {
    return pages.map(p => ({ pageNumber: p.pageNumber, sceneDescription: `Page ${p.pageNumber} illustration`, characters: request.characterNames || [], setting: cultural.settings[p.pageNumber % cultural.settings.length], mood: p.pageNumber <= 2 ? 'cheerful' : 'adventurous', culturalElements: [cultural.celebrations[0]] }));
  }

  private getTaughtGraphemes(phonology: LanguagePhonologyProfile, upToPhase: number): string[] {
    return phonology.phases.filter(p => p.phase <= upToPhase).flatMap(p => p.units.map(u => u.grapheme));
  }

  private getTrickyWords(phonology: LanguagePhonologyProfile, upToPhase: number): string[] {
    const words: string[] = [];
    for (let p = 1; p <= upToPhase; p++) words.push(...(phonology.trickyWords[p] || []));
    return words;
  }

  getPhonologyProfile(lang: SupportedLanguage): LanguagePhonologyProfile { return lang === SupportedLanguage.FRENCH ? this.frenchPhonology : this.spanishPhonology; }
  getCEFRConstraints(level: CEFRLevel): CEFRConstraints { return CEFR_CONSTRAINTS[level]; }
  getCulturalProfile(lang: SupportedLanguage): CulturalProfile { return CULTURAL_PROFILES[lang]; }
}
