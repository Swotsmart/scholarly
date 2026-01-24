import * as fs from 'fs';
import * as path from 'path';
import {
  MRACGraph,
  MRACNode,
  ParsedCurriculumStandard,
  CurriculumElementType,
  YEAR_LEVEL_MAPPINGS,
  LEARNING_AREA_CODES,
  GENERAL_CAPABILITY_CODES,
  CROSS_CURRICULUM_CODES,
  LangValue,
  IdRef,
} from './types';

export class MRACParser {
  private nodeMap: Map<string, MRACNode> = new Map();
  private parsedStandards: ParsedCurriculumStandard[] = [];
  private currentLearningArea: string = '';
  private sequenceCounter: number = 0;

  /**
   * Parse a MRAC JSON-LD file and extract curriculum standards
   */
  async parseFile(filePath: string): Promise<ParsedCurriculumStandard[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content) as MRACGraph[];

    // Reset state
    this.nodeMap.clear();
    this.parsedStandards = [];
    this.sequenceCounter = 0;

    // Detect learning area from file path
    this.currentLearningArea = this.detectLearningArea(filePath);

    // Build node map for quick lookups
    for (const graph of data) {
      if (graph['@graph']) {
        for (const node of graph['@graph']) {
          this.nodeMap.set(node['@id'], node);
        }
      }
    }

    // Parse all nodes
    for (const [id, node] of this.nodeMap) {
      const parsed = this.parseNode(node);
      if (parsed) {
        this.parsedStandards.push(parsed);
      }
    }

    return this.parsedStandards;
  }

  private detectLearningArea(filePath: string): string {
    const basename = path.basename(filePath, '.jsonld');
    for (const [code, name] of Object.entries(LEARNING_AREA_CODES)) {
      if (basename.includes(code)) {
        return name;
      }
    }

    // Check directory name
    const dirName = path.dirname(filePath);
    for (const [code, name] of Object.entries(LEARNING_AREA_CODES)) {
      if (dirName.includes(code)) {
        return name;
      }
    }

    return 'Unknown';
  }

  private parseNode(node: MRACNode): ParsedCurriculumStandard | null {
    const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];

    // Skip nodes without type or just reference nodes
    if (!types || !types[0]) {
      return null;
    }

    // Determine element type
    const elementType = this.determineElementType(node, types);
    if (!elementType) {
      return null;
    }

    // Extract basic info
    const id = node['@id'];
    const code = this.extractCode(node);
    const title = this.extractLangValue(node['http://purl.org/dc/terms/title']);
    const description = this.extractLangValue(node['http://purl.org/dc/terms/description']);
    const prefLabel = this.extractLangValue(node['http://www.w3.org/2004/02/skos/core#prefLabel']);

    // Skip root/metadata nodes
    if (code === 'root' || !title && !description && !prefLabel) {
      return null;
    }

    // Extract year levels
    const yearLevels = this.extractYearLevels(node);

    // Extract general capabilities
    const generalCapabilities = this.extractGeneralCapabilities(node);

    // Extract cross-curriculum priorities
    const crossCurriculumPriorities = this.extractCrossCurriculumPriorities(node);

    // Extract hierarchy info
    const parentId = this.extractParentId(node);
    const childIds = this.extractChildIds(node);
    const { strand, substrand } = this.extractStrandInfo(node);

    this.sequenceCounter++;

    return {
      id,
      framework: 'ACARA-v9',
      code: code || prefLabel || this.generateCode(id),
      type: elementType,
      learningArea: this.currentLearningArea,
      subject: this.extractSubject(node) || this.currentLearningArea,
      strand,
      substrand,
      yearLevels,
      title: title || prefLabel || '',
      description: description || '',
      generalCapabilities,
      crossCurriculumPriorities,
      parentId,
      childIds,
      sequenceNumber: this.sequenceCounter,
    };
  }

  private determineElementType(node: MRACNode, types: (string | undefined)[]): CurriculumElementType | null {
    const typeString = types.join(' ');
    const id = node['@id'];

    // Check URL patterns
    if (id.includes('/LA/')) {
      if (id.match(/\/LA\/[A-Z]+$/)) {
        return 'LearningArea';
      }

      const code = this.extractCode(node);
      if (code?.match(/^AC[A-Z]{1,4}\d{3,5}$/)) {
        return 'ContentDescription';
      }
      if (code?.match(/^AS[A-Z]+/)) {
        return 'Achievement Standard';
      }
    }

    if (id.includes('/GC/')) {
      return 'GeneralCapability';
    }

    if (id.includes('/CCP/')) {
      return 'CrossCurriculumPriority';
    }

    // Check type URIs
    if (typeString.includes('Statement')) {
      return 'ContentDescription';
    }
    if (typeString.includes('Concept')) {
      const label = this.extractLangValue(node['http://www.w3.org/2004/02/skos/core#prefLabel']);
      if (label?.startsWith('AC')) {
        return 'ContentDescription';
      }
    }

    // Default to content description if has meaningful content
    const title = this.extractLangValue(node['http://purl.org/dc/terms/title']);
    const desc = this.extractLangValue(node['http://purl.org/dc/terms/description']);
    if (title || desc) {
      return 'ContentDescription';
    }

    return null;
  }

  private extractCode(node: MRACNode): string | null {
    const notation = node['http://purl.org/ASN/schema/core/statementNotation'];
    if (notation) {
      return this.extractLangValue(notation);
    }

    const label = node['http://purl.org/ASN/schema/core/statementLabel'];
    if (label) {
      return this.extractLangValue(label);
    }

    const prefLabel = node['http://www.w3.org/2004/02/skos/core#prefLabel'];
    if (prefLabel) {
      const value = this.extractLangValue(prefLabel);
      if (value?.match(/^[A-Z]{2,}/)) {
        return value;
      }
    }

    return null;
  }

  private extractLangValue(values: LangValue[] | undefined): string | null {
    if (!values || values.length === 0) return null;

    // Prefer English Australian
    const enAu = values.find(v => v['@language'] === 'en-au');
    if (enAu) return enAu['@value'];

    // Fall back to any English
    const en = values.find(v => v['@language']?.startsWith('en'));
    if (en) return en['@value'];

    // Fall back to first value
    return values[0]['@value'];
  }

  private extractYearLevels(node: MRACNode): string[] {
    const levels: string[] = [];

    const educationLevels = node['http://purl.org/ASN/schema/core/educationLevel'];
    if (educationLevels) {
      for (const ref of educationLevels) {
        const mappedLevel = YEAR_LEVEL_MAPPINGS[ref['@id']];
        if (mappedLevel && !levels.includes(mappedLevel)) {
          levels.push(mappedLevel);
        }
      }
    }

    // Extract from code pattern (e.g., AC9M5N01 -> Year 5)
    const code = this.extractCode(node);
    if (code) {
      const yearMatch = code.match(/(\d{1,2})/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        if (year >= 0 && year <= 10) {
          const yearLevel = year === 0 ? 'Foundation' : `Year ${year}`;
          if (!levels.includes(yearLevel)) {
            levels.push(yearLevel);
          }
        }
      }
    }

    return levels;
  }

  private extractGeneralCapabilities(node: MRACNode): string[] {
    const capabilities: string[] = [];

    const skills = node['http://purl.org/ASN/schema/core/skillEmbodied'];
    if (skills) {
      for (const ref of skills) {
        const capability = this.resolveGeneralCapability(ref['@id']);
        if (capability && !capabilities.includes(capability)) {
          capabilities.push(capability);
        }
      }
    }

    return capabilities;
  }

  private resolveGeneralCapability(uri: string): string | null {
    for (const [code, name] of Object.entries(GENERAL_CAPABILITY_CODES)) {
      if (uri.includes(`/GC/${code}/`) || uri.includes(`GC:${code}`)) {
        return name;
      }
    }
    return null;
  }

  private extractCrossCurriculumPriorities(node: MRACNode): string[] {
    const priorities: string[] = [];

    const alignments = node['http://purl.org/ASN/schema/core/broadAlignment'];
    if (alignments) {
      for (const ref of alignments) {
        const priority = this.resolveCrossCurriculumPriority(ref['@id']);
        if (priority && !priorities.includes(priority)) {
          priorities.push(priority);
        }
      }
    }

    return priorities;
  }

  private resolveCrossCurriculumPriority(uri: string): string | null {
    for (const [code, name] of Object.entries(CROSS_CURRICULUM_CODES)) {
      if (uri.includes(`/CCP/${code}/`) || uri.includes(`CCP:${code}`)) {
        return name;
      }
    }
    return null;
  }

  private extractParentId(node: MRACNode): string | undefined {
    const isPartOf = node['http://purl.org/ASN/schema/core/isPartOf'];
    if (isPartOf && isPartOf.length > 0) {
      return isPartOf[0]['@id'];
    }

    const broader = node['http://www.w3.org/2004/02/skos/core#broader'];
    if (broader && broader.length > 0) {
      return broader[0]['@id'];
    }

    return undefined;
  }

  private extractChildIds(node: MRACNode): string[] {
    const childIds: string[] = [];

    const hasChild = node['http://purl.org/gem/qualifiers/hasChild'];
    if (hasChild) {
      for (const ref of hasChild) {
        childIds.push(ref['@id']);
      }
    }

    const narrower = node['http://www.w3.org/2004/02/skos/core#narrower'];
    if (narrower) {
      for (const ref of narrower) {
        if (!childIds.includes(ref['@id'])) {
          childIds.push(ref['@id']);
        }
      }
    }

    return childIds;
  }

  private extractStrandInfo(node: MRACNode): { strand?: string; substrand?: string } {
    // Try to determine strand/substrand from parent chain
    const parentId = this.extractParentId(node);
    if (!parentId) return {};

    const parent = this.nodeMap.get(parentId);
    if (!parent) return {};

    const parentTitle = this.extractLangValue(parent['http://purl.org/dc/terms/title']);
    const grandParentId = this.extractParentId(parent);

    if (grandParentId) {
      const grandParent = this.nodeMap.get(grandParentId);
      const grandParentTitle = grandParent
        ? this.extractLangValue(grandParent['http://purl.org/dc/terms/title'])
        : null;

      if (grandParentTitle && parentTitle) {
        return {
          strand: grandParentTitle,
          substrand: parentTitle,
        };
      }
    }

    if (parentTitle) {
      return { strand: parentTitle };
    }

    return {};
  }

  private extractSubject(node: MRACNode): string | null {
    // Extract subject from parent learning area
    const parentId = this.extractParentId(node);
    if (!parentId) return null;

    // Walk up the tree to find learning area
    let currentId: string | undefined = parentId;
    let depth = 0;
    while (currentId && depth < 5) {
      const parent = this.nodeMap.get(currentId);
      if (!parent) break;

      // Check if this is a learning area
      if (currentId.match(/\/LA\/[A-Z]+$/)) {
        const title = this.extractLangValue(parent['http://purl.org/dc/terms/title']);
        return title;
      }

      currentId = this.extractParentId(parent);
      depth++;
    }

    return null;
  }

  private generateCode(id: string): string {
    // Generate a code from the URI
    const parts = id.split('/');
    const last = parts[parts.length - 1];
    return last.substring(0, 8).toUpperCase();
  }
}
