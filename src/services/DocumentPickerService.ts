// services/DocumentPickerService.ts
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

export interface ImportedBook {
  id: string;
  title: string;
  uri: string;
  size: number;
  mimeType: string;
  importedAt: Date;
}

class DocumentPickerService {
  private readonly BOOKS_DIRECTORY = `${FileSystem.documentDirectory}books/`;

  async ensureBooksDirectoryExists(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(this.BOOKS_DIRECTORY);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.BOOKS_DIRECTORY, { intermediates: true });
    }
  }

  async pickAndImportPDF(): Promise<ImportedBook | null> {
    try {
      // Ensure books directory exists
      await this.ensureBooksDirectoryExists();

      // Pick document
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return null;
      }

      const file = result.assets[0];
      
      // Validate file
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        Alert.alert('Error', 'Please select a PDF file.');
        return null;
      }

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${timestamp}_${sanitizedName}`;
      const destinationUri = `${this.BOOKS_DIRECTORY}${fileName}`;

      // Copy file to app's document directory
      await FileSystem.copyAsync({
        from: file.uri,
        to: destinationUri,
      });

      // Create book record
      const importedBook: ImportedBook = {
        id: timestamp.toString(),
        title: file.name.replace('.pdf', ''),
        uri: destinationUri,
        size: file.size || 0,
        mimeType: file.mimeType || 'application/pdf',
        importedAt: new Date(),
      };

      return importedBook;
    } catch (error) {
      console.error('Error importing PDF:', error);
      Alert.alert('Error', 'Failed to import PDF file. Please try again.');
      return null;
    }
  }

  async deleteBook(bookId: string): Promise<boolean> {
    try {
      const books = await this.getImportedBooks();
      const book = books.find(b => b.id === bookId);
      
      if (!book) {
        return false;
      }

      // Delete file
      const fileInfo = await FileSystem.getInfoAsync(book.uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(book.uri);
      }

      return true;
    } catch (error) {
      console.error('Error deleting book:', error);
      return false;
    }
  }

  async getImportedBooks(): Promise<ImportedBook[]> {
    try {
      await this.ensureBooksDirectoryExists();
      
      const files = await FileSystem.readDirectoryAsync(this.BOOKS_DIRECTORY);
      const books: ImportedBook[] = [];

      for (const fileName of files) {
        if (fileName.endsWith('.pdf')) {
          const filePath = `${this.BOOKS_DIRECTORY}${fileName}`;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          
          if (fileInfo.exists) {
            // Extract timestamp and original name from filename
            const parts = fileName.split('_');
            const timestamp = parts[0];
            const originalName = parts.slice(1).join('_').replace('.pdf', '');

            books.push({
              id: timestamp,
              title: originalName,
              uri: filePath,
              size: fileInfo.size || 0,
              mimeType: 'application/pdf',
              importedAt: new Date(parseInt(timestamp)),
            });
          }
        }
      }

      // Sort by import date (newest first)
      return books.sort((a, b) => b.importedAt.getTime() - a.importedAt.getTime());
    } catch (error) {
      console.error('Error getting imported books:', error);
      return [];
    }
  }

  async getBookById(bookId: string): Promise<ImportedBook | null> {
    const books = await this.getImportedBooks();
    return books.find(book => book.id === bookId) || null;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}

export const documentPickerService = new DocumentPickerService();
