import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

export interface KanjiEntry {
  id: number;
  character: string;
  meanings: string[];
  onReadings: string[];
  kunReadings: string[];
  strokeCount: number;
  grade?: number; // School grade (1-6) or null for non-Joyo kanji
  jlptLevel?: number; // JLPT level (1-5) or null
  frequency?: number; // Frequency ranking
  radicals: string[];
  rtkStory?: string; // RTK mnemonic story
  examples: string[]; // Example words using this kanji
}

export interface RadicalEntry {
  id: number;
  radical: string;
  name: string;
  strokeCount: number;
  meaning: string;
  position: string; // left, right, top, bottom, etc.
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
  private db: SQLite.WebSQLDatabase | null = null;
  private readonly DB_NAME = 'kanji_database.db';
  private readonly DB_VERSION = '1.0.0';
  
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
      console.log('Initializing Kanji Database...');
      
      this.db = SQLite.openDatabase(this.DB_NAME);
      
      await this.createTables();
      await this.checkAndSeedDatabase();
      
      console.log('Kanji Database initialized successfully');
    } catch (error) {
      console.error('Error initializing kanji database:', error);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.transaction(
        (tx) => {
          // Kanji table
          tx.executeSql(`
            CREATE TABLE IF NOT EXISTS kanji (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              character TEXT UNIQUE NOT NULL,
              meanings TEXT NOT NULL,
              on_readings TEXT NOT NULL,
              kun_readings TEXT NOT NULL,
              stroke_count INTEGER NOT NULL,
              grade INTEGER,
              jlpt_level INTEGER,
              frequency INTEGER,
              radicals TEXT NOT NULL,
              rtk_story TEXT,
              examples TEXT NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);

          // Radicals table
          tx.executeSql(`
            CREATE TABLE IF NOT EXISTS radicals (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              radical TEXT UNIQUE NOT NULL,
              name TEXT NOT NULL,
              stroke_count INTEGER NOT NULL,
              meaning TEXT NOT NULL,
              position TEXT NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);

          // User knowledge bank table
          tx.executeSql(`
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
            )
          `);

          // Database metadata table
          tx.executeSql(`
            CREATE TABLE IF NOT EXISTS database_metadata (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);

          console.log('Database tables created successfully');
        },
        (error) => {
          console.error('Error creating tables:', error);
          reject(error);
        },
        () => {
          resolve();
        }
      );
    });
  }

  /**
   * Check if database needs seeding and seed with initial data
   */
  private async checkAndSeedDatabase(): Promise<void> {
    const stats = await this.getDatabaseStats();
    
    if (stats.totalKanji === 0) {
      console.log('Database is empty, seeding with initial data...');
      await this.seedInitialData();
    } else {
      console.log(`Database already contains ${stats.totalKanji} kanji entries`);
    }
  }

  /**
   * Seed database with essential kanji data
   */
  private async seedInitialData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Essential radicals first
    const radicals: Omit<RadicalEntry, 'id'>[] = [
      { radical: '人', name: 'person', strokeCount: 2, meaning: 'person, human', position: 'left' },
      { radical: '口', name: 'mouth', strokeCount: 3, meaning: 'mouth, opening', position: 'left' },
      { radical: '手', name: 'hand', strokeCount: 4, meaning: 'hand', position: 'left' },
      { radical: '心', name: 'heart', strokeCount: 4, meaning: 'heart, mind', position: 'bottom' },
      { radical: '日', name: 'sun', strokeCount: 4, meaning: 'sun, day', position: 'left' },
      { radical: '月', name: 'moon', strokeCount: 4, meaning: 'moon, month', position: 'left' },
      { radical: '木', name: 'tree', strokeCount: 4, meaning: 'tree, wood', position: 'left' },
      { radical: '水', name: 'water', strokeCount: 4, meaning: 'water', position: 'left' },
      { radical: '火', name: 'fire', strokeCount: 4, meaning: 'fire', position: 'left' },
      { radical: '土', name: 'earth', strokeCount: 3, meaning: 'earth, soil', position: 'left' },
      { radical: '金', name: 'gold', strokeCount: 8, meaning: 'gold, metal', position: 'left' },
      { radical: '女', name: 'woman', strokeCount: 3, meaning: 'woman, female', position: 'left' },
      { radical: '子', name: 'child', strokeCount: 3, meaning: 'child', position: 'left' },
      { radical: '学', name: 'study', strokeCount: 8, meaning: 'study, learning', position: 'top' },
      { radical: '言', name: 'speech', strokeCount: 7, meaning: 'speech, words', position: 'left' },
    ];

    // Essential kanji with comprehensive data
    const kanjiData: Omit<KanjiEntry, 'id'>[] = [
      {
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
      {
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
      {
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
      {
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
      {
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
      {
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
      {
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
      {
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
      {
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
      {
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
    ];

    return new Promise((resolve, reject) => {
      this.db!.transaction(
        (tx) => {
          // Insert radicals
          radicals.forEach(radical => {
            tx.executeSql(
              'INSERT OR IGNORE INTO radicals (radical, name, stroke_count, meaning, position) VALUES (?, ?, ?, ?, ?)',
              [radical.radical, radical.name, radical.strokeCount, radical.meaning, radical.position]
            );
          });

          // Insert kanji
          kanjiData.forEach(kanji => {
            tx.executeSql(
              `INSERT OR IGNORE INTO kanji (
                character, meanings, on_readings, kun_readings, stroke_count, 
                grade, jlpt_level, frequency, radicals, rtk_story, examples
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                kanji.character,
                JSON.stringify(kanji.meanings),
                JSON.stringify(kanji.onReadings),
                JSON.stringify(kanji.kunReadings),
                kanji.strokeCount,
                kanji.grade,
                kanji.jlptLevel,
                kanji.frequency,
                JSON.stringify(kanji.radicals),
                kanji.rtkStory,
                JSON.stringify(kanji.examples)
              ]
            );
          });

          // Insert metadata
          tx.executeSql(
            'INSERT OR REPLACE INTO database_metadata (key, value) VALUES (?, ?)',
            ['version', this.DB_VERSION]
          );
          tx.executeSql(
            'INSERT OR REPLACE INTO database_metadata (key, value) VALUES (?, ?)',
            ['seeded_at', new Date().toISOString()]
          );

          console.log('Database seeded with initial data');
        },
        (error) => {
          console.error('Error seeding database:', error);
          reject(error);
        },
        () => {
          resolve();
        }
      );
    });
  }

  /**
   * Get kanji by character
   */
  async getKanji(character: string): Promise<KanjiEntry | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM kanji WHERE character = ?',
          [character],
          (_, result) => {
            if (result.rows.length > 0) {
              const row = result.rows.item(0);
              const kanji: KanjiEntry = {
                id: row.id,
                character: row.character,
                meanings: JSON.parse(row.meanings),
                onReadings: JSON.parse(row.on_readings),
                kunReadings: JSON.parse(row.kun_readings),
                strokeCount: row.stroke_count,
                grade: row.grade,
                jlptLevel: row.jlpt_level,
                frequency: row.frequency,
                radicals: JSON.parse(row.radicals),
                rtkStory: row.rtk_story,
                examples: JSON.parse(row.examples),
              };
              resolve(kanji);
            } else {
              resolve(null);
            }
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Search kanji by various criteria
   */
  async searchKanji(options: {
    query?: string;
    grade?: number;
    jlptLevel?: number;
    strokeCount?: number;
    limit?: number;
    offset?: number;
  }): Promise<KanjiSearchResult> {
    if (!this.db) throw new Error('Database not initialized');

    const { query, grade, jlptLevel, strokeCount, limit = 50, offset = 0 } = options;
    
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

    if (grade !== undefined) {
      whereClause += ' AND grade = ?';
      params.push(grade);
    }

    if (jlptLevel !== undefined) {
      whereClause += ' AND jlpt_level = ?';
      params.push(jlptLevel);
    }

    if (strokeCount !== undefined) {
      whereClause += ' AND stroke_count = ?';
      params.push(strokeCount);
    }

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        // Get total count
        tx.executeSql(
          `SELECT COUNT(*) as total FROM kanji WHERE ${whereClause}`,
          params,
          (_, countResult) => {
            const totalCount = countResult.rows.item(0).total;

            // Get paginated results
            tx.executeSql(
              `SELECT * FROM kanji WHERE ${whereClause} ORDER BY frequency ASC LIMIT ? OFFSET ?`,
              [...params, limit, offset],
              (_, result) => {
                const kanji: KanjiEntry[] = [];
                for (let i = 0; i < result.rows.length; i++) {
                  const row = result.rows.item(i);
                  kanji.push({
                    id: row.id,
                    character: row.character,
                    meanings: JSON.parse(row.meanings),
                    onReadings: JSON.parse(row.on_readings),
                    kunReadings: JSON.parse(row.kun_readings),
                    strokeCount: row.stroke_count,
                    grade: row.grade,
                    jlptLevel: row.jlpt_level,
                    frequency: row.frequency,
                    radicals: JSON.parse(row.radicals),
                    rtkStory: row.rtk_story,
                    examples: JSON.parse(row.examples),
                  });
                }
                resolve({ kanji, totalCount });
              },
              (_, error) => {
                reject(error);
                return false;
              }
            );
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Get multiple kanji by characters
   */
  async getMultipleKanji(characters: string[]): Promise<KanjiEntry[]> {
    if (!this.db) throw new Error('Database not initialized');
    if (characters.length === 0) return [];

    const placeholders = characters.map(() => '?').join(',');
    
    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        tx.executeSql(
          `SELECT * FROM kanji WHERE character IN (${placeholders}) ORDER BY frequency ASC`,
          characters,
          (_, result) => {
            const kanji: KanjiEntry[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              kanji.push({
                id: row.id,
                character: row.character,
                meanings: JSON.parse(row.meanings),
                onReadings: JSON.parse(row.on_readings),
                kunReadings: JSON.parse(row.kun_readings),
                strokeCount: row.stroke_count,
                grade: row.grade,
                jlptLevel: row.jlpt_level,
                frequency: row.frequency,
                radicals: JSON.parse(row.radicals),
                rtkStory: row.rtk_story,
                examples: JSON.parse(row.examples),
              });
            }
            resolve(kanji);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        tx.executeSql(
          'SELECT COUNT(*) as kanji_count FROM kanji',
          [],
          (_, kanjiResult) => {
            tx.executeSql(
              'SELECT COUNT(*) as radical_count FROM radicals',
              [],
              (_, radicalResult) => {
                tx.executeSql(
                  'SELECT value FROM database_metadata WHERE key = ?',
                  ['seeded_at'],
                  (_, metaResult) => {
                    const kanjiCount = kanjiResult.rows.item(0).kanji_count;
                    const radicalCount = radicalResult.rows.item(0).radical_count;
                    const seededAt = metaResult.rows.length > 0 
                      ? new Date(metaResult.rows.item(0).value)
                      : new Date();

                    resolve({
                      totalKanji: kanjiCount,
                      totalRadicals: radicalCount,
                      databaseVersion: this.DB_VERSION,
                      lastUpdated: seededAt,
                      size: `${(kanjiCount * 0.5).toFixed(1)} KB`, // Rough estimate
                    });
                  },
                  (_, error) => {
                    reject(error);
                    return false;
                  }
                );
              },
              (_, error) => {
                reject(error);
                return false;
              }
            );
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Add or update user knowledge for a kanji
   */
  async updateUserKnowledge(kanjiId: number, correct: boolean): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        // Check if knowledge entry exists
        tx.executeSql(
          'SELECT * FROM user_kanji_knowledge WHERE kanji_id = ?',
          [kanjiId],
          (_, result) => {
            if (result.rows.length > 0) {
              // Update existing entry
              const current = result.rows.item(0);
              const newTimesCorrect = correct ? current.times_correct + 1 : current.times_correct;
              const newTimesIncorrect = correct ? current.times_incorrect : current.times_incorrect + 1;
              
              tx.executeSql(
                `UPDATE user_kanji_knowledge SET 
                  times_seen = times_seen + 1,
                  times_correct = ?,
                  times_incorrect = ?,
                  last_seen = CURRENT_TIMESTAMP
                  WHERE kanji_id = ?`,
                [newTimesCorrect, newTimesIncorrect, kanjiId]
              );
            } else {
              // Create new entry
              const timesCorrect = correct ? 1 : 0;
              const timesIncorrect = correct ? 0 : 1;
              
              tx.executeSql(
                `INSERT INTO user_kanji_knowledge 
                  (kanji_id, times_seen, times_correct, times_incorrect) 
                  VALUES (?, 1, ?, ?)`,
                [kanjiId, timesCorrect, timesIncorrect]
              );
            }
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }, reject, resolve);
    });
  }

  /**
   * Get user's kanji knowledge stats
   */
  async getUserKnowledgeStats(): Promise<{
    totalSeen: number;
    totalMastered: number;
    averageAccuracy: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        tx.executeSql(
          `SELECT 
            COUNT(*) as total_seen,
            AVG(CASE WHEN times_seen > 0 THEN CAST(times_correct AS FLOAT) / times_seen ELSE 0 END) as avg_accuracy,
            COUNT(CASE WHEN times_correct >= 3 AND CAST(times_correct AS FLOAT) / times_seen >= 0.8 THEN 1 END) as mastered
           FROM user_kanji_knowledge`,
          [],
          (_, result) => {
            const row = result.rows.item(0);
            resolve({
              totalSeen: row.total_seen || 0,
              totalMastered: row.mastered || 0,
              averageAccuracy: row.avg_accuracy || 0,
            });
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }
}

export const kanjiDatabaseService = KanjiDatabaseService.getInstance();
