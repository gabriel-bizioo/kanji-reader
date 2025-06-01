import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export interface PDFDocument {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
  localUri?: string;
}

export interface PDFMetadata {
  title: string;
  author?: string;
  numPages: number;
  fileSize: number;
  fileName: string;
}

export class ExpoPDFService {
  private static instance: ExpoPDFService;
  
  public static getInstance(): ExpoPDFService {
    if (!ExpoPDFService.instance) {
      ExpoPDFService.instance = new ExpoPDFService();
    }
    return ExpoPDFService.instance;
  }

  /**
   * Pick PDF file using Expo DocumentPicker
   */
  async pickPDFFile(): Promise<PDFDocument | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        return null;
      }

      const asset = result.assets[0];
      return {
        uri: asset.uri,
        name: asset.name,
        size: asset.size || 0,
        mimeType: asset.mimeType || 'application/pdf',
      };
    } catch (error) {
      console.error('Error picking PDF:', error);
      throw new Error('Failed to pick PDF file');
    }
  }

  /**
   * Save PDF to app's document directory
   */
  async savePDFToLibrary(pdfDocument: PDFDocument): Promise<string> {
    try {
      const fileName = `${Date.now()}_${pdfDocument.name}`;
      const localUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.copyAsync({
        from: pdfDocument.uri,
        to: localUri,
      });

      return localUri;
    } catch (error) {
      console.error('Error saving PDF:', error);
      throw new Error('Failed to save PDF');
    }
  }

  /**
   * Get PDF metadata (simplified for Expo)
   */
  async getPDFMetadata(uri: string): Promise<PDFMetadata> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      
      return {
        title: this.extractTitleFromFileName(uri),
        numPages: 0, // Will be set by WebView when loaded
        fileSize: fileInfo.size || 0,
        fileName: uri.split('/').pop() || 'Unknown',
      };
    } catch (error) {
      console.error('Error getting PDF metadata:', error);
      throw new Error('Failed to get PDF metadata');
    }
  }

  /**
   * List all saved PDFs
   */
  async getSavedPDFs(): Promise<PDFMetadata[]> {
    try {
      const files = await FileSystem.readDirectoryAsync(
        FileSystem.documentDirectory || ''
      );
      
      const pdfFiles = files.filter(file => file.endsWith('.pdf'));
      const pdfs: PDFMetadata[] = [];
      
      for (const file of pdfFiles) {
        const uri = `${FileSystem.documentDirectory}${file}`;
        const metadata = await this.getPDFMetadata(uri);
        pdfs.push(metadata);
      }
      
      return pdfs;
    } catch (error) {
      console.error('Error getting saved PDFs:', error);
      return [];
    }
  }

  /**
   * Delete PDF from library
   */
  async deletePDF(uri: string) {
    try {
      await FileSystem.deleteAsync(uri);
    } catch (error) {
      console.error('Error deleting PDF:', error);
      throw new Error('Failed to delete PDF');
    }
  }

  /**
   * Check if file is a valid PDF
   */
  async isPDF(uri: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      return fileInfo.exists && uri.toLowerCase().endsWith('.pdf');
    } catch (error) {
      return false;
    }
  }

  private extractTitleFromFileName(uri: string): string {
    const fileName = uri.split('/').pop() || '';
    return fileName.replace('.pdf', '').replace(/^\d+_/, '');
  }
}

export default ExpoPDFService;
