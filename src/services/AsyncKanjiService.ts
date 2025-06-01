// src/services/AsyncKanjiService.ts - Expo Go Compatible Alternative
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface KanjiEntry {
  id: string;
  character: string;
  meanings: string[];
  onReadings: string[];
  kunReadings: string[];
  strokeCount: number;
  grade?: number;
  jlptLevel?: number;
  frequency?: number;
  radicals: string[];
  rtkStory?: string;
  examples: string[];
}

export interface KanjiDatabase {
  kanji: Record<string, KanjiEntry>;
  radicals: Record<string, any>;
  metadata: {
    version: string;
    totalKanji: number;
    lastUpdated: string;
  };
}

export interface KanjiSearchResult {
  kanji: KanjiEntry[];
  totalCount: number;
}

class AsyncKanjiService {
  private static instance: AsyncKanjiService;
  private readonly STORAGE_KEY = 'kanji_database_v1';
  private database: KanjiDatabase | null = null;

  public static getInstance(): AsyncKanjiService {
    if (!AsyncKanjiService.instance) {
      AsyncKanjiService.instance = new AsyncKanjiService();
    }
    return AsyncKanjiService.instance;
  }

  /**
   * Initialize the kanji database
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing AsyncStorage Kanji Database...');
      
      // Try to load existing database
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      
      if (stored) {
        this.database = JSON.parse(stored);
        console.log(`Loaded existing database with ${this.database!.metadata.totalKanji} kanji`);
      } else {
        // Create new database with seed data
        await this.createInitialDatabase();
      }

      console.log('AsyncStorage Kanji Database ready!');
    } catch (error) {
      console.error('Error initializing AsyncStorage kanji database:', error);
      throw error;
    }
  }

  /**
   * Create initial database with essential kanji
   */
  private async createInitialDatabase(): Promise<void> {
    console.log('Creating initial kanji database...');

    const initialKanji: Record<string, KanjiEntry> = {
      '日': {
        id: 'kanji_01',
        character: '日',
        meanings: ['day', 'sun', 'Japan'],
        onReadings: ['ニチ', 'ジツ'],
        kunReadings: ['ひ', 'か'],
        strokeCount: 4,
        grade: 1,
        jlptLevel: 5,
        frequency: 1,
        radicals: ['日'],
        rtkStory: 'A picture of the sun with a sunspot in the middle.',
        examples: ['日本 (Japan)', '今日 (today)', '毎日 (every day)']
      },
      '本': {
        id: 'kanji_02',
        character: '本',
        meanings: ['book', 'origin', 'main'],
        onReadings: ['ホン'],
        kunReadings: ['もと'],
        strokeCount: 5,
        grade: 1,
        jlptLevel: 5,
        frequency: 2,
        radicals: ['木'],
        rtkStory: 'Tree with a line through the root to show the origin.',
        examples: ['日本 (Japan)', '本当 (really)', '本 (book)']
      },
      '人': {
        id: 'kanji_03',
        character: '人',
        meanings: ['person', 'people'],
        onReadings: ['ジン', 'ニン'],
        kunReadings: ['ひと'],
        strokeCount: 2,
        grade: 1,
        jlptLevel: 5,
        frequency: 3,
        radicals: ['人'],
        rtkStory: 'A person walking with two legs.',
        examples: ['人 (person)', '日本人 (Japanese person)', '大人 (adult)']
      },
      '学': {
        id: 'kanji_04',
        character: '学',
        meanings: ['study', 'learning', 'science'],
        onReadings: ['ガク'],
        kunReadings: ['まな.ぶ'],
        strokeCount: 8,
        grade: 1,
        jlptLevel: 5,
        frequency: 15,
        radicals: ['学', '子'],
        rtkStory: 'A child under a roof learning.',
        examples: ['学校 (school)', '大学 (university)', '学生 (student)']
      },
      '語': {
        id: 'kanji_05',
        character: '語',
        meanings: ['language', 'word'],
        onReadings: ['ゴ'],
        kunReadings: ['かた.る', 'かた.らう'],
        strokeCount: 14,
        grade: 2,
        jlptLevel: 5,
        frequency: 25,
        radicals: ['言', '口'],
        rtkStory: 'Words (言) spoken by mouth (口) in groups of five (五).',
        examples: ['日本語 (Japanese language)', '英語 (English)', '語学 (language study)']
      },
      '今': {
        id: 'kanji_06',
        character: '今',
        meanings: ['now', 'present'],
        onReadings: ['コン', 'キン'],
        kunReadings: ['いま'],
        strokeCount: 4,
        grade: 2,
        jlptLevel: 5,
        frequency: 12,
        radicals: ['人'],
        rtkStory: 'A person bending over, focused on the present moment.',
        examples: ['今日 (today)', '今 (now)', '今年 (this year)']
      },
      '時': {
        id: 'kanji_07',
        character: '時',
        meanings: ['time', 'hour'],
        onReadings: ['ジ'],
        kunReadings: ['とき'],
        strokeCount: 10,
        grade: 2,
        jlptLevel: 5,
        frequency: 20,
        radicals: ['日', '土'],
        rtkStory: 'The sun (日) over earth (土) marking time.',
        examples: ['時間 (time)', '何時 (what time)', '時々 (sometimes)']
      },
      '見': {
        id: 'kanji_08',
        character: '見',
        meanings: ['see', 'look', 'watch'],
        onReadings: ['ケン'],
        kunReadings: ['み.る', 'み.える'],
        strokeCount: 7,
        grade: 1,
        jlptLevel: 5,
        frequency: 18,
        radicals: ['目', '儿'],
        rtkStory: 'An eye on legs, looking around.',
        examples: ['見る (to see)', '見学 (field trip)', '意見 (opinion)']
      },
      '行': {
        id: 'kanji_09',
        character: '行',
        meanings: ['go', 'carry out'],
        onReadings: ['コウ', 'ギョウ'],
        kunReadings: ['い.く', 'ゆ.く', 'おこな.う'],
        strokeCount: 6,
        grade: 2,
        jlptLevel: 5,
        frequency: 14,
        radicals: ['行'],
        rtkStory: 'A crossroads where people go in different directions.',
        examples: ['行く (to go)', '旅行 (travel)', '銀行 (bank)']
      },
      '来': {
        id: 'kanji_10',
        character: '来',
        meanings: ['come', 'next'],
        onReadings: ['ライ'],
        kunReadings: ['く.る', 'きた.る'],
        strokeCount: 7,
        grade: 2,
        jlptLevel: 5,
        frequency: 16,
        radicals: ['木'],
        rtkStory: 'A tree with grain, representing something coming to fruition.',
        examples: ['来る (to come)', '来年 (next year)', '未来 (future)']
      },
      '生': {
        id: 'kanji_11',
        character: '生',
        meanings: ['life', 'birth', 'student'],
        onReadings: ['セイ', 'ショウ'],
        kunReadings: ['い.きる', 'う.まれる', 'なま'],
        strokeCount: 5,
        grade: 1,
        jlptLevel: 5,
        frequency: 8,
        radicals: ['生'],
        rtkStory: 'A plant growing from the earth, representing life.',
        examples: ['学生 (student)', '先生 (teacher)', '人生 (life)']
      },
      '先': {
        id: 'kanji_12',
        character: '先',
        meanings: ['before', 'ahead', 'previous'],
        onReadings: ['セン'],
        kunReadings: ['さき', 'ま.ず'],
        strokeCount: 6,
        grade: 1,
        jlptLevel: 5,
        frequency: 22,
        radicals: ['先'],
        rtkStory: 'A person with long legs taking the first step.',
        examples: ['先生 (teacher)', '先週 (last week)', '先に (ahead)']
      },
    };

    this.database = {
      kanji: initialKanji,
      radicals: {},
      metadata: {
        version: '1.0.0',
        totalKanji: Object.keys(initialKanji).length,
        lastUpdated: new Date().toISOString(),
      },
    };

    await this.saveDatabase();
    console.log(`Database created with ${this.database.metadata.totalKanji} kanji`);
  }

  /**
   * Save database to AsyncStorage
   */
  private async saveDatabase(): Promise<void> {
    if (!this.database) return;
    
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.database));
    } catch (error) {
      console.error('Error saving database:', error);
      throw error;
    }
  }

  /**
   * Get kanji by character
   */
  async getKanji(character: string): Promise<KanjiEntry | null> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    return this.database.kanji[character] || null;
  }

  /**
   * Get multiple kanji by characters
   */
  async getMultipleKanji(characters: string[]): Promise<KanjiEntry[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const results: KanjiEntry[] = [];
    for (const char of characters) {
      const kanji = this.database.kanji[char];
      if (kanji) {
        results.push(kanji);
      }
    }

    return results;
  }

  /**
   * Search kanji
   */
  async searchKanji(options: {
    query?: string;
    grade?: number;
    jlptLevel?: number;
    strokeCount?: number;
    limit?: number;
    offset?: number;
  }): Promise<KanjiSearchResult> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const { query, grade, jlptLevel, strokeCount, limit = 50, offset = 0 } = options;
    
    let results = Object.values(this.database.kanji);

    // Apply filters
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(kanji => 
        kanji.character.includes(query) ||
        kanji.meanings.some(meaning => meaning.toLowerCase().includes(lowerQuery)) ||
        kanji.onReadings.some(reading => reading.includes(query)) ||
        kanji.kunReadings.some(reading => reading.includes(query))
      );
    }

    if (grade !== undefined) {
      results = results.filter(kanji => kanji.grade === grade);
    }

    if (jlptLevel !== undefined) {
      results = results.filter(kanji => kanji.jlptLevel === jlptLevel);
    }

    if (strokeCount !== undefined) {
      results = results.filter(kanji => kanji.strokeCount === strokeCount);
    }

    // Sort by frequency
    results.sort((a, b) => (a.frequency || 999) - (b.frequency || 999));

    // Apply pagination
    const totalCount = results.length;
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      kanji: paginatedResults,
      totalCount,
    };
  }

  /**
   * Get all kanji
   */
  async getAllKanji(): Promise<KanjiEntry[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    return Object.values(this.database.kanji);
  }

  /**
   * Get database stats
   */
  async getDatabaseStats(): Promise<{
    totalKanji: number;
    totalRadicals: number;
    databaseVersion: string;
    lastUpdated: Date;
    size: string;
  }> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const sizeInBytes = JSON.stringify(this.database).length;
    const sizeInKB = (sizeInBytes / 1024).toFixed(1);

    return {
      totalKanji: this.database.metadata.totalKanji,
      totalRadicals: Object.keys(this.database.radicals).length,
      databaseVersion: this.database.metadata.version,
      lastUpdated: new Date(this.database.metadata.lastUpdated),
      size: `${sizeInKB} KB`,
    };
  }

  /**
   * Check if character is in database
   */
  hasKanji(character: string): boolean {
    return this.database ? character in this.database.kanji : false;
  }

  /**
   * Extract kanji from text
   */
  extractKanjiFromText(text: string): string[] {
    if (!this.database) return [];
    
    const kanjiChars = text.match(/[\u4E00-\u9FAF]/g) || [];
    return [...new Set(kanjiChars)].filter(char => this.hasKanji(char));
  }
}

export const asyncKanjiService = AsyncKanjiService.getInstance();
