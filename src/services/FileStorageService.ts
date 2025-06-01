import AsyncStorage from '@react-native-async-storage/async-storage';
import { ImportedBook } from './DocumentPickerService';

export interface ReadingProgress {
  bookId: string;
  currentPage: number;
  totalPages: number;
  lastReadAt: Date;
  readingTimeSeconds: number;
}

export interface BookLibrary {
  books: ImportedBook[];
  lastUpdated: Date;
}

class FileStorageService {
  private readonly KEYS = {
    BOOKS_LIBRARY: 'books_library',
    READING_PROGRESS: 'reading_progress_',
    LAST_READ_BOOK: 'last_read_book',
    KNOWLEDGE_BANK: 'knowledge_bank',
  };

  // Book Library Management
  async saveBookToLibrary(book: ImportedBook): Promise<void> {
    try {
      const library = await this.getBookLibrary();
      
      // Remove existing book with same ID (update case)
      const filteredBooks = library.books.filter(b => b.id !== book.id);
      
      // Add new/updated book
      const updatedLibrary: BookLibrary = {
        books: [book, ...filteredBooks],
        lastUpdated: new Date(),
      };

      await AsyncStorage.setItem(
        this.KEYS.BOOKS_LIBRARY,
        JSON.stringify(updatedLibrary)
      );
    } catch (error) {
      console.error('Error saving book to library:', error);
      throw error;
    }
  }

  async getBookLibrary(): Promise<BookLibrary> {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.BOOKS_LIBRARY);
      
      if (!data) {
        return {
          books: [],
          lastUpdated: new Date(),
        };
      }

      const library = JSON.parse(data);
      
      // Convert date strings back to Date objects
      library.lastUpdated = new Date(library.lastUpdated);
      library.books = library.books.map((book: any) => ({
        ...book,
        importedAt: new Date(book.importedAt),
      }));

      return library;
    } catch (error) {
      console.error('Error getting book library:', error);
      return {
        books: [],
        lastUpdated: new Date(),
      };
    }
  }

  async removeBookFromLibrary(bookId: string): Promise<void> {
    try {
      const library = await this.getBookLibrary();
      
      const updatedLibrary: BookLibrary = {
        books: library.books.filter(book => book.id !== bookId),
        lastUpdated: new Date(),
      };

      await AsyncStorage.setItem(
        this.KEYS.BOOKS_LIBRARY,
        JSON.stringify(updatedLibrary)
      );

      // Also remove reading progress
      await this.removeReadingProgress(bookId);
    } catch (error) {
      console.error('Error removing book from library:', error);
      throw error;
    }
  }

  // Reading Progress Management
  async saveReadingProgress(progress: ReadingProgress): Promise<void> {
    try {
      const progressData = {
        ...progress,
        lastReadAt: progress.lastReadAt.toISOString(),
      };

      await AsyncStorage.setItem(
        `${this.KEYS.READING_PROGRESS}${progress.bookId}`,
        JSON.stringify(progressData)
      );

      // Update last read book
      await AsyncStorage.setItem(this.KEYS.LAST_READ_BOOK, progress.bookId);
    } catch (error) {
      console.error('Error saving reading progress:', error);
      throw error;
    }
  }

  async getReadingProgress(bookId: string): Promise<ReadingProgress | null> {
    try {
      const data = await AsyncStorage.getItem(`${this.KEYS.READING_PROGRESS}${bookId}`);
      
      if (!data) {
        return null;
      }

      const progress = JSON.parse(data);
      progress.lastReadAt = new Date(progress.lastReadAt);
      
      return progress;
    } catch (error) {
      console.error('Error getting reading progress:', error);
      return null;
    }
  }

  async removeReadingProgress(bookId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${this.KEYS.READING_PROGRESS}${bookId}`);
    } catch (error) {
      console.error('Error removing reading progress:', error);
    }
  }

  async getLastReadBook(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.KEYS.LAST_READ_BOOK);
    } catch (error) {
      console.error('Error getting last read book:', error);
      return null;
    }
  }

  // Knowledge Bank (for future use)
  async saveKnowledgeBank(knowledgeBank: Record<string, any>): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.KEYS.KNOWLEDGE_BANK,
        JSON.stringify(knowledgeBank)
      );
    } catch (error) {
      console.error('Error saving knowledge bank:', error);
      throw error;
    }
  }

  async getKnowledgeBank(): Promise<Record<string, any>> {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.KNOWLEDGE_BANK);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error getting knowledge bank:', error);
      return {};
    }
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const appKeys = keys.filter(key => 
        key.startsWith('books_') || 
        key.startsWith('reading_progress_') || 
        key === this.KEYS.LAST_READ_BOOK ||
        key === this.KEYS.KNOWLEDGE_BANK
      );
      
      await AsyncStorage.multiRemove(appKeys);
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }

  async getStorageInfo(): Promise<{ totalBooks: number; totalSize: string }> {
    try {
      const library = await this.getBookLibrary();
      const totalBytes = library.books.reduce((sum, book) => sum + book.size, 0);
      
      return {
        totalBooks: library.books.length,
        totalSize: this.formatFileSize(totalBytes),
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { totalBooks: 0, totalSize: '0 B' };
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}

export const fileStorageService = new FileStorageService();
