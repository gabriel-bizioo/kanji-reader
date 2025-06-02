import { useState, useEffect } from 'react';
import { kanjiDatabaseService } from '../services/KanjiDatabaseService';

interface DatabaseState {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  stats: {
    totalKanji: number;
    totalRadicals: number;
    databaseVersion: string;
  } | null;
}

export const useDatabase = () => {
  const [state, setState] = useState<DatabaseState>({
    isLoading: true,
    isReady: false,
    error: null,
    stats: null,
  });

  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      console.log('Initializing SQLite kanji database...');
      await kanjiDatabaseService.initialize();
      
      console.log('Getting database stats...');
      const stats = await kanjiDatabaseService.getDatabaseStats();
      
      setState({
        isLoading: false,
        isReady: true,
        error: null,
        stats: {
          totalKanji: stats.totalKanji,
          totalRadicals: stats.totalRadicals,
          databaseVersion: stats.databaseVersion,
        },
      });
      
      console.log('SQLite database ready:', stats);
    } catch (error) {
      console.error('SQLite database initialization failed:', error);
      setState({
        isLoading: false,
        isReady: false,
        error: error instanceof Error ? error.message : 'Database initialization failed',
        stats: null,
      });
    }
  };

  const retryInitialization = () => {
    initializeDatabase();
  };

  return {
    ...state,
    retryInitialization,
  };
};
