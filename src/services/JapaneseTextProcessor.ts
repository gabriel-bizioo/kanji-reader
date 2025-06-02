import { kanjiDatabaseService } from './KanjiDatabaseService';

export interface KanjiMatch {
  character: string;
  position: number;
  meanings: string[];
  readings: string[];
  timesSeen: number;
  isNew: boolean;
  jlptLevel?: number;
  strokeCount?: number;
  frequency?: number;
}

export interface TextAnalysisResult {
  originalText: string;
  foundKanji: KanjiMatch[];
  uniqueKanji: KanjiMatch[];
  newKanji: KanjiMatch[];
  knownKanji: KanjiMatch[];
  stats: {
    totalCharacters: number;
    kanjiCount: number;
    uniqueKanjiCount: number;
    newKanjiCount: number;
    hiraganaCount: number;
    katakanaCount: number;
  };
}

export class JapaneseTextProcessor {
  private static instance: JapaneseTextProcessor;

  public static getInstance(): JapaneseTextProcessor {
    if (!JapaneseTextProcessor.instance) {
      JapaneseTextProcessor.instance = new JapaneseTextProcessor();
    }
    return JapaneseTextProcessor.instance;
  }

  /**
   * Analyze Japanese text and extract kanji information
   */
  async analyzeText(text: string): Promise<TextAnalysisResult> {
    try {
      console.log('Analyzing Japanese text:', text.substring(0, 50) + '...');

      // Step 1: Extract all kanji characters from text
      const kanjiCharacters = this.extractKanjiCharacters(text);
      console.log(`Found ${kanjiCharacters.length} kanji characters`);

      // Step 2: Get detailed information for each kanji
      const kanjiMatches = await this.getKanjiDetails(kanjiCharacters, text);
      console.log(`Retrieved details for ${kanjiMatches.length} kanji`);

      // Step 3: Process unique kanji and categorize
      const uniqueKanji = this.getUniqueKanji(kanjiMatches);
      const newKanji = uniqueKanji.filter(k => k.isNew);
      const knownKanji = uniqueKanji.filter(k => !k.isNew);

      // Step 4: Calculate statistics
      const stats = this.calculateTextStats(text, kanjiMatches);

      const result: TextAnalysisResult = {
        originalText: text,
        foundKanji: kanjiMatches,
        uniqueKanji,
        newKanji,
        knownKanji,
        stats,
      };

      console.log('Text analysis complete:', {
        totalKanji: kanjiMatches.length,
        uniqueKanji: uniqueKanji.length,
        newKanji: newKanji.length,
      });

      return result;

    } catch (error) {
      console.error('Text analysis failed:', error);
      throw new Error(`Failed to analyze Japanese text: ${error}`);
    }
  }

  /**
   * Extract all kanji characters from text with their positions
   */
  private extractKanjiCharacters(text: string): Array<{ character: string; position: number }> {
    const kanjiRegex = /[\u4E00-\u9FAF]/g;
    const matches: Array<{ character: string; position: number }> = [];
    let match;

    while ((match = kanjiRegex.exec(text)) !== null) {
      matches.push({
        character: match[0],
        position: match.index,
      });
    }

    return matches;
  }

  /**
   * Get detailed information for each kanji from the database
   */
  private async getKanjiDetails(
    kanjiCharacters: Array<{ character: string; position: number }>,
    originalText: string
  ): Promise<KanjiMatch[]> {
    const kanjiMatches: KanjiMatch[] = [];

    for (const { character, position } of kanjiCharacters) {
      try {
        // Get kanji data from database
        const kanjiData = await kanjiDatabaseService.getKanjiByCharacter(character);

        if (kanjiData) {
          const kanjiMatch: KanjiMatch = {
            character,
            position,
            meanings: kanjiData.meanings || [],
            readings: [
              ...(kanjiData.kun_readings || []),
              ...(kanjiData.on_readings || []),
            ].filter(Boolean),
            timesSeen: kanjiData.timesSeen || 0,
            isNew: (kanjiData.timesSeen || 0) === 0,
            jlptLevel: kanjiData.jlpt_level,
            strokeCount: kanjiData.stroke_count,
            frequency: kanjiData.frequency,
          };

          kanjiMatches.push(kanjiMatch);
        } else {
          // If kanji not in our database, create basic entry
          console.warn(`Kanji not found in database: ${character}`);
          
          const basicMatch: KanjiMatch = {
            character,
            position,
            meanings: ['Unknown'],
            readings: [],
            timesSeen: 0,
            isNew: true,
          };

          kanjiMatches.push(basicMatch);
        }
      } catch (error) {
        console.error(`Error getting details for kanji ${character}:`, error);
        
        // Add basic entry for failed lookups
        const fallbackMatch: KanjiMatch = {
          character,
          position,
          meanings: ['Error loading'],
          readings: [],
          timesSeen: 0,
          isNew: true,
        };

        kanjiMatches.push(fallbackMatch);
      }
    }

    return kanjiMatches;
  }

  /**
   * Get unique kanji (remove duplicates)
   */
  private getUniqueKanji(kanjiMatches: KanjiMatch[]): KanjiMatch[] {
    const uniqueMap = new Map<string, KanjiMatch>();

    for (const kanji of kanjiMatches) {
      if (!uniqueMap.has(kanji.character)) {
        uniqueMap.set(kanji.character, kanji);
      }
    }

    return Array.from(uniqueMap.values()).sort((a, b) => {
      // Sort by: new kanji first, then by frequency, then alphabetically
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      
      if (a.frequency && b.frequency) {
        return a.frequency - b.frequency; // Lower number = more frequent
      }
      
      return a.character.localeCompare(b.character);
    });
  }

  /**
   * Calculate text statistics
   */
  private calculateTextStats(text: string, kanjiMatches: KanjiMatch[]): TextAnalysisResult['stats'] {
    const hiraganaRegex = /[\u3040-\u309F]/g;
    const katakanaRegex = /[\u30A0-\u30FF]/g;

    const hiraganaMatches = text.match(hiraganaRegex) || [];
    const katakanaMatches = text.match(katakanaRegex) || [];

    const uniqueKanji = new Set(kanjiMatches.map(k => k.character));
    const newKanji = kanjiMatches.filter(k => k.isNew);
    const uniqueNewKanji = new Set(newKanji.map(k => k.character));

    return {
      totalCharacters: text.length,
      kanjiCount: kanjiMatches.length,
      uniqueKanjiCount: uniqueKanji.size,
      newKanjiCount: uniqueNewKanji.size,
      hiraganaCount: hiraganaMatches.length,
      katakanaCount: katakanaMatches.length,
    };
  }

  /**
   * Update knowledge bank with newly encountered kanji
   */
  async updateKnowledgeBank(kanjiMatches: KanjiMatch[]): Promise<void> {
    try {
      console.log('Updating knowledge bank...');

      const uniqueKanji = new Set(kanjiMatches.map(k => k.character));
      let updatedCount = 0;

      for (const character of uniqueKanji) {
        try {
          await kanjiDatabaseService.incrementKanjiTimesSeen(character);
          updatedCount++;
        } catch (error) {
          console.error(`Failed to update kanji ${character}:`, error);
        }
      }

      console.log(`Knowledge bank updated: ${updatedCount} kanji`);

    } catch (error) {
      console.error('Failed to update knowledge bank:', error);
      throw new Error(`Knowledge bank update failed: ${error}`);
    }
  }

  /**
   * Clean and normalize Japanese text
   */
  cleanText(text: string): string {
    return text
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove common OCR artifacts
      .replace(/[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uFF00-\uFFEF\s\n.,!?。、]/g, '')
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Trim
      .trim();
  }

  /**
   * Check if text contains Japanese characters
   */
  isJapaneseText(text: string): boolean {
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    return japaneseRegex.test(text);
  }

  /**
   * Get reading difficulty score (0-10)
   */
  calculateDifficultyScore(analysisResult: TextAnalysisResult): number {
    const { stats, newKanji } = analysisResult;
    
    if (stats.kanjiCount === 0) return 1; // No kanji = very easy

    // Factor 1: Ratio of kanji to total characters
    const kanjiRatio = stats.kanjiCount / stats.totalCharacters;
    
    // Factor 2: Ratio of new kanji to total kanji
    const newKanjiRatio = stats.newKanjiCount / stats.uniqueKanjiCount;
    
    // Factor 3: Average JLPT level of new kanji (lower JLPT = harder)
    const jlptLevels = newKanji
      .map(k => k.jlptLevel)
      .filter(level => level !== undefined) as number[];
    
    const avgJlptLevel = jlptLevels.length > 0 
      ? jlptLevels.reduce((sum, level) => sum + level, 0) / jlptLevels.length
      : 3; // Default to N3 level

    // Calculate difficulty (0-10)
    let difficulty = 1;
    difficulty += kanjiRatio * 3; // Up to +3 for high kanji density
    difficulty += newKanjiRatio * 4; // Up to +4 for many new kanji
    difficulty += (6 - avgJlptLevel) * 0.5; // Up to +2.5 for low JLPT levels

    return Math.min(Math.round(difficulty), 10);
  }
}

export const japaneseTextProcessor = JapaneseTextProcessor.getInstance();
