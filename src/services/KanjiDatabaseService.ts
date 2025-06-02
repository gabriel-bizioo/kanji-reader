import * as SQLite from 'expo-sqlite';
import kanjiData from '../data/kanji.json';

export interface KanjiEntry {
  id: number;
  character: string;
  meanings: string[];
  onReadings: string[];
  kunReadings: string[];
  strokeCount: number;
  grade?: number;
  jlptLevel?: number;
  frequency?: string;
  radicals: string[];
  rtkStory?: string;
  examples: string[];
  timesSeen?: number;
}

export interface RadicalEntry {
  id: number;
  radical: string;
  name: string;
  strokeCount: number;
  meaning: string;
  position: string;
}

export interface KanjiSearchResult {
  kanji: KanjiEntry[];
  totalCount: number;
}

export interface DatabaseStats {
  totalKanji: number;
  totalRadicals: number;
  databaseVersion: string;
  lastUpdated: Date;
  size: string;
}

class KanjiDatabaseService {
  private static instance: KanjiDatabaseService;
  private db: SQLite.SQLiteDatabase | null = null;
  private readonly DB_NAME = 'kanji_database.db';
  private readonly DB_VERSION = '2.0.0';
  
  public static getInstance(): KanjiDatabaseService {
    if (!KanjiDatabaseService.instance) {
      KanjiDatabaseService.instance = new KanjiDatabaseService();
    }
    return KanjiDatabaseService.instance;
  }

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing SQLite Kanji Database with new API...');
      
      // Open database with new API
      this.db = await SQLite.openDatabaseAsync(this.DB_NAME);
      
      await this.createTables();
      await this.checkAndSeedDatabase();
      
      console.log('SQLite Kanji Database initialized successfully');
    } catch (error) {
      console.error('Error initializing SQLite kanji database:', error);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Kanji table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS kanji (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          character TEXT UNIQUE NOT NULL,
          meanings TEXT NOT NULL,
          on_readings TEXT NOT NULL,
          kun_readings TEXT NOT NULL,
          stroke_count INTEGER NOT NULL,
          jlpt_level INTEGER,
          frequency TEXT,
          radicals TEXT NOT NULL,
          rtk_story TEXT,
          examples TEXT NOT NULL,
          times_seen INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // User knowledge bank table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS user_kanji_knowledge (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          kanji_id INTEGER NOT NULL,
          times_seen INTEGER DEFAULT 0,
          times_correct INTEGER DEFAULT 0,
          times_incorrect INTEGER DEFAULT 0,
          first_encountered DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
          mastery_level INTEGER DEFAULT 0,
          notes TEXT,
          FOREIGN KEY (kanji_id) REFERENCES kanji (id)
        );
      `);

      // Database metadata table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS database_metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      console.log('SQLite database tables created successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  /**
   * Check if database needs seeding and seed with kanji.json data
   */
  private async checkAndSeedDatabase(): Promise<void> {
    const stats = await this.getDatabaseStats();
    
    if (stats.totalKanji === 0) {
      console.log('Database is empty, importing kanji.json data...');
      await this.importKanjiJsonData();
    } else {
      console.log(`Database already contains ${stats.totalKanji} kanji entries`);
    }
  }

  /**
   * Import all kanji from kanji.json
   */
  private async importKanjiJsonData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    console.log(`Importing ${kanjiData.kanji.length} kanji from kanji.json...`);

    try {
      // Use transaction for better performance
      await this.db.withTransactionAsync(async () => {
        // Import kanji data
        for (const kanji of kanjiData.kanji) {
          await this.db!.runAsync(
            `INSERT OR IGNORE INTO kanji (
              character, meanings, on_readings, kun_readings, stroke_count, 
              jlpt_level, frequency, radicals, rtk_story, examples, times_seen
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              kanji.character,
              JSON.stringify(kanji.meanings),
              JSON.stringify(kanji.onReadings),
              JSON.stringify(kanji.kunReadings),
              kanji.strokeCount,
              kanji.jlptLevel,
              kanji.frequency,
              JSON.stringify(kanji.radicals),
              kanji.rtkStory,
              JSON.stringify(kanji.examples),
              kanji.timesSeen || 0
            ]
          );
        }

        // Insert metadata
        await this.db!.runAsync(
          'INSERT OR REPLACE INTO database_metadata (key, value) VALUES (?, ?)',
          ['version', this.DB_VERSION]
        );
        await this.db!.runAsync(
          'INSERT OR REPLACE INTO database_metadata (key, value) VALUES (?, ?)',
          ['seeded_at', new Date().toISOString()]
        );
        await this.db!.runAsync(
          'INSERT OR REPLACE INTO database_metadata (key, value) VALUES (?, ?)',
          ['data_source', 'kanji.json']
        );
        await this.db!.runAsync(
          'INSERT OR REPLACE INTO database_metadata (key, value) VALUES (?, ?)',
          ['total_imported', kanjiData.kanji.length.toString()]
        );
      });

      console.log(`Successfully imported ${kanjiData.kanji.length} kanji from kanji.json`);
    } catch (error) {
      console.error('Error importing kanji data:', error);
      throw error;
    }
  }

  /**
   * Get kanji by character
   */
  async getKanji(character: string): Promise<KanjiEntry | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getFirstAsync(
        'SELECT * FROM kanji WHERE character = ?',
        [character]
      ) as any;

      if (!result) return null;

      return {
        id: result.id,
        character: result.character,
        meanings: JSON.parse(result.meanings),
        onReadings: JSON.parse(result.on_readings),
        kunReadings: JSON.parse(result.kun_readings),
        strokeCount: result.stroke_count,
        jlptLevel: result.jlpt_level,
        frequency: result.frequency,
        radicals: JSON.parse(result.radicals),
        rtkStory: result.rtk_story,
        examples: JSON.parse(result.examples),
        timesSeen: result.times_seen || 0,
      };
    } catch (error) {
      console.error('Error getting kanji:', error);
      throw error;
    }
  }

  /**
   * Search kanji by various criteria
   */
  async searchKanji(options: {
    query?: string;
    jlptLevel?: number;
    strokeCount?: number;
    frequency?: string;
    limit?: number;
    offset?: number;
  }): Promise<KanjiSearchResult> {
    if (!this.db) throw new Error('Database not initialized');

    const { query, jlptLevel, strokeCount, frequency, limit = 50, offset = 0 } = options;
    
    let whereClause = '1=1';
    const params: any[] = [];

    if (query) {
      whereClause += ` AND (
        character LIKE ? OR 
        meanings LIKE ? OR 
        on_readings LIKE ? OR 
        kun_readings LIKE ?
      )`;
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (jlptLevel !== undefined) {
      whereClause += ' AND jlpt_level = ?';
      params.push(jlptLevel);
    }

    if (strokeCount !== undefined) {
      whereClause += ' AND stroke_count = ?';
      params.push(strokeCount);
    }

    if (frequency !== undefined) {
      whereClause += ' AND frequency = ?';
      params.push(frequency);
    }

    try {
      // Get total count
      const countResult = await this.db.getFirstAsync(
        `SELECT COUNT(*) as total FROM kanji WHERE ${whereClause}`,
        params
      ) as any;
      
      const totalCount = countResult?.total || 0;

      // Get paginated results
      const results = await this.db.getAllAsync(
        `SELECT * FROM kanji WHERE ${whereClause} ORDER BY stroke_count ASC, character ASC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ) as any[];

      const kanji: KanjiEntry[] = results.map(row => ({
        id: row.id,
        character: row.character,
        meanings: JSON.parse(row.meanings),
        onReadings: JSON.parse(row.on_readings),
        kunReadings: JSON.parse(row.kun_readings),
        strokeCount: row.stroke_count,
        jlptLevel: row.jlpt_level,
        frequency: row.frequency,
        radicals: JSON.parse(row.radicals),
        rtkStory: row.rtk_story,
        examples: JSON.parse(row.examples),
        timesSeen: row.times_seen || 0,
      }));

      return { kanji, totalCount };
    } catch (error) {
      console.error('Error searching kanji:', error);
      throw error;
    }
  }

  /**
   * Get multiple kanji by characters
   */
  async getMultipleKanji(characters: string[]): Promise<KanjiEntry[]> {
    if (!this.db) throw new Error('Database not initialized');
    if (characters.length === 0) return [];

    const placeholders = characters.map(() => '?').join(',');
    
    try {
      const results = await this.db.getAllAsync(
        `SELECT * FROM kanji WHERE character IN (${placeholders}) ORDER BY stroke_count ASC`,
        characters
      ) as any[];

      return results.map(row => ({
        id: row.id,
        character: row.character,
        meanings: JSON.parse(row.meanings),
        onReadings: JSON.parse(row.on_readings),
        kunReadings: JSON.parse(row.kun_readings),
        strokeCount: row.stroke_count,
        jlptLevel: row.jlpt_level,
        frequency: row.frequency,
        radicals: JSON.parse(row.radicals),
        rtkStory: row.rtk_story,
        examples: JSON.parse(row.examples),
        timesSeen: row.times_seen || 0,
      }));
    } catch (error) {
      console.error('Error getting multiple kanji:', error);
      throw error;
    }
  }

  /**
   * Get all kanji
   */
  async getAllKanji(): Promise<KanjiEntry[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const results = await this.db.getAllAsync(
        'SELECT * FROM kanji ORDER BY stroke_count ASC, character ASC'
      ) as any[];

      return results.map(row => ({
        id: row.id,
        character: row.character,
        meanings: JSON.parse(row.meanings),
        onReadings: JSON.parse(row.on_readings),
        kunReadings: JSON.parse(row.kun_readings),
        strokeCount: row.stroke_count,
        jlptLevel: row.jlpt_level,
        frequency: row.frequency,
        radicals: JSON.parse(row.radicals),
        rtkStory: row.rtk_story,
        examples: JSON.parse(row.examples),
        timesSeen: row.times_seen || 0,
      }));
    } catch (error) {
      console.error('Error getting all kanji:', error);
      throw error;
    }
  }

  /**
   * Update times seen for a kanji (knowledge bank)
   */
  async updateKanjiTimesSeen(character: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        'UPDATE kanji SET times_seen = times_seen + 1, updated_at = CURRENT_TIMESTAMP WHERE character = ?',
        [character]
      );
      console.log(`Updated times_seen for kanji: ${character}`);
    } catch (error) {
      console.error('Error updating kanji times seen:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const kanjiResult = await this.db.getFirstAsync(
        'SELECT COUNT(*) as kanji_count FROM kanji'
      ) as any;
      
      const metaResult = await this.db.getFirstAsync(
        'SELECT value FROM database_metadata WHERE key = ?',
        ['seeded_at']
      ) as any;

      const kanjiCount = kanjiResult?.kanji_count || 0;
      const seededAt = metaResult?.value ? new Date(metaResult.value) : new Date();

      return {
        totalKanji: kanjiCount,
        totalRadicals: 0, // We'll add radicals later
        databaseVersion: this.DB_VERSION,
        lastUpdated: seededAt,
        size: `${(kanjiCount * 1.2).toFixed(1)} KB`, // Rough estimate
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw error;
    }
  }

  /**
   * Check if character is in database
   */
  async hasKanji(character: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getFirstAsync(
        'SELECT 1 FROM kanji WHERE character = ? LIMIT 1',
        [character]
      );
      return !!result;
    } catch (error) {
      console.error('Error checking if kanji exists:', error);
      return false;
    }
  }

  /**
   * Extract kanji from text that exist in our database
   */
  async extractKanjiFromText(text: string): Promise<string[]> {
    const kanjiChars = text.match(/[\u4E00-\u9FAF]/g) || [];
    const uniqueKanji = [...new Set(kanjiChars)];
    
    // Filter to only include kanji we have in database
    const existingKanji: string[] = [];
    for (const char of uniqueKanji) {
      if (await this.hasKanji(char)) {
        existingKanji.push(char);
      }
    }
    
    return existingKanji;
  }

  /**
   * Get kanji by frequency level
   */
  async getKanjiByFrequency(frequency: string): Promise<KanjiEntry[]> {
    const result = await this.searchKanji({ frequency, limit: 100 });
    return result.kanji;
  }

  /**
   * Get kanji by JLPT level
   */
  async getKanjiByJLPTLevel(level: number): Promise<KanjiEntry[]> {
    const result = await this.searchKanji({ jlptLevel: level, limit: 100 });
    return result.kanji;
  }
}

export const kanjiDatabaseService = KanjiDatabaseService.getInstance();
