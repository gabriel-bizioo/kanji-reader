import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HomeScreenProps } from '../types/navigation';
import { darkTheme } from '../styles/theme';
import { useDatabase } from '../hooks/useDatabase';
import { kanjiDatabaseService } from '../services/KanjiDatabaseService';
import { fileStorageService } from '../services/FileStorageService';

interface ImportedBook {
  id: string;
  title: string;
  uri: string;
  size: number;
  mimeType: string;
  type: 'pdf' | 'image';
  importedAt: Date;
}

interface ReadingProgress {
  bookId: string;
  currentPage: number;
  totalPages: number;
  lastReadAt: Date;
}

interface KnowledgeBankStats {
  totalKanji: number;
  kanjiWithProgress: number;
  averageTimesSeen: number;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [books, setBooks] = useState<ImportedBook[]>([]);
  const [lastReadBook, setLastReadBook] = useState<ImportedBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showImportOptions, setShowImportOptions] = useState(false);
  const [knowledgeStats, setKnowledgeStats] = useState<KnowledgeBankStats>({
    totalKanji: 0,
    kanjiWithProgress: 0,
    averageTimesSeen: 0,
  });

  const { 
    isReady: isDatabaseReady, 
    isLoading: isDatabaseLoading,
    error: databaseError 
  } = useDatabase();

  const BOOKS_DIR = `${FileSystem.documentDirectory}books/`;
  const LIBRARY_KEY = 'imported_books_library';
  const LAST_READ_KEY = 'last_read_book_id';

  // Load data when screen focuses AND database is ready
  useFocusEffect(
    useCallback(() => {
      if (isDatabaseReady && !isDatabaseLoading) {
        loadData();
      }
    }, [isDatabaseReady, isDatabaseLoading])
  );

  const loadKnowledgeBankStats = async () => {
    if (!isDatabaseReady || isDatabaseLoading) {
      console.log('Skipping knowledge bank stats - database not ready');
      return;
    }

    try {
      console.log('Loading knowledge bank stats...');
      
      const allKanji = await kanjiDatabaseService.getAllKanji();
      const kanjiWithProgress = allKanji.filter(k => k.timesSeen && k.timesSeen > 0);
      const totalTimesSeen = kanjiWithProgress.reduce((sum, k) => sum + (k.timesSeen || 0), 0);
      const averageTimesSeen = kanjiWithProgress.length > 0 ? totalTimesSeen / kanjiWithProgress.length : 0;

      const stats = {
        totalKanji: allKanji.length,
        kanjiWithProgress: kanjiWithProgress.length,
        averageTimesSeen: Math.round(averageTimesSeen * 10) / 10,
      };

      setKnowledgeStats(stats);
      console.log('Knowledge bank stats loaded:', stats);
    } catch (error) {
      console.error('Error loading knowledge bank stats:', error);
      setKnowledgeStats({
        totalKanji: 0,
        kanjiWithProgress: 0,
        averageTimesSeen: 0,
      });
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      console.log('Loading HomeScreen data...');
      
      // Ensure books directory exists
      const dirInfo = await FileSystem.getInfoAsync(BOOKS_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(BOOKS_DIR, { intermediates: true });
      }

      // Load books library
      const libraryData = await AsyncStorage.getItem(LIBRARY_KEY);
      let loadedBooks: ImportedBook[] = [];
      
      if (libraryData) {
        const parsedBooks = JSON.parse(libraryData);
        loadedBooks = parsedBooks.map((book: any) => ({
          ...book,
          importedAt: new Date(book.importedAt),
          type: book.type || 'pdf', // Default to pdf for backward compatibility
        }));
      }

      // Load last read book
      const lastReadId = await AsyncStorage.getItem(LAST_READ_KEY);
      const lastRead = loadedBooks.find(book => book.id === lastReadId) || null;

      setBooks(loadedBooks);
      setLastReadBook(lastRead);

      console.log(`Loaded ${loadedBooks.length} books`);

      // Load knowledge bank statistics
      await loadKnowledgeBankStats();
      
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load your library.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleExploreKanji = () => {
    if (!isDatabaseReady || isDatabaseLoading) {
      Alert.alert('Database Loading', 'Please wait for the kanji database to finish loading.');
      return;
    }
    
    if (databaseError) {
      Alert.alert('Database Error', 'The kanji database failed to load. Please restart the app.');
      return;
    }

    navigation.navigate('KanjiExplorer');
  };

  const saveBooksLibrary = async (updatedBooks: ImportedBook[]) => {
    try {
      const booksForStorage = updatedBooks.map(book => ({
        ...book,
        importedAt: book.importedAt.toISOString(),
      }));
      await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(booksForStorage));
    } catch (error) {
      console.error('Error saving books library:', error);
    }
  };

  const checkForDuplicates = (fileName: string, fileSize: number): ImportedBook | null => {
    const nameWithoutExt = fileName.replace(/\.(pdf|jpg|jpeg|png)$/i, '').toLowerCase();
    
    for (const book of books) {
      const existingName = book.title.toLowerCase();
      
      if (existingName === nameWithoutExt && Math.abs(book.size - fileSize) < 1000) {
        return book;
      }
    }
    
    return null;
  };

  const handleQuickResume = async () => {
    if (lastReadBook) {
      try {
        const progress = await fileStorageService.getReadingProgress(lastReadBook.id);
        const startPage = progress?.currentPage || 1;
        
        console.log(`Quick resume: ${lastReadBook.title} at page ${startPage}`);
        
        if (lastReadBook.type === 'image') {
          navigation.navigate('ImageAnalysis', {
            imageUri: lastReadBook.uri,
            imageTitle: lastReadBook.title,
          });
        } else {
          navigation.navigate('Reading', {
            bookId: lastReadBook.id,
            bookPath: lastReadBook.uri,
            bookTitle: lastReadBook.title,
            lastPage: startPage,
          });
        }
      } catch (error) {
        console.error('Error loading reading progress:', error);
        // Fallback
        if (lastReadBook.type === 'image') {
          navigation.navigate('ImageAnalysis', {
            imageUri: lastReadBook.uri,
            imageTitle: lastReadBook.title,
          });
        } else {
          navigation.navigate('Reading', {
            bookId: lastReadBook.id,
            bookPath: lastReadBook.uri,
            bookTitle: lastReadBook.title,
            lastPage: 1,
          });
        }
      }
    } else {
      Alert.alert('No Recent Content', 'Import a PDF or image to get started!');
    }
  };

  const handleImportPDF = async () => {
    setImporting(true);
    setShowImportOptions(false);
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        Alert.alert('Error', 'Please select a PDF file.');
        return;
      }

      // Check for duplicates
      const duplicate = checkForDuplicates(file.name, file.size || 0);
      if (duplicate) {
        Alert.alert(
          'Duplicate PDF',
          `"${duplicate.title}" is already in your library. Would you like to open it instead?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Existing',
              onPress: () => navigation.navigate('Reading', {
                bookId: duplicate.id,
                bookPath: duplicate.uri,
                bookTitle: duplicate.title,
                lastPage: 1,
              }),
            },
            {
              text: 'Import Anyway',
              onPress: () => proceedWithPDFImport(file),
            },
          ]
        );
        return;
      }

      await proceedWithPDFImport(file);
      
    } catch (error) {
      console.error('Error importing PDF:', error);
      Alert.alert('Import Error', `Failed to import PDF: ${error}`);
    } finally {
      setImporting(false);
    }
  };

  const handleImportImage = async () => {
    setImporting(true);
    setShowImportOptions(false);
    
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to select images.');
        return;
      }

      // Show image picker options
      Alert.alert(
        'Select Japanese Image',
        'Choose how to select an image with Japanese text',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Camera',
            onPress: () => pickImageFromCamera(),
          },
          {
            text: 'Photo Library',
            onPress: () => pickImageFromLibrary(),
          },
        ]
      );
      
    } catch (error) {
      console.error('Error setting up image picker:', error);
      Alert.alert('Error', 'Failed to setup image picker.');
    } finally {
      setImporting(false);
    }
  };

  const pickImageFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera permissions to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        await proceedWithImageImport(result.assets[0], 'camera');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Camera Error', 'Failed to take photo.');
    }
  };

  const pickImageFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        await proceedWithImageImport(result.assets[0], 'library');
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Library Error', 'Failed to select image.');
    }
  };

  const proceedWithImageImport = async (imageAsset: any, source: 'camera' | 'library') => {
    try {
      setImporting(true);

      // Generate filename
      const timestamp = Date.now();
      const extension = imageAsset.uri.split('.').pop() || 'jpg';
      const fileName = `${timestamp}_japanese_${source}.${extension}`;
      const permanentUri = `${BOOKS_DIR}${fileName}`;

      // Copy to permanent storage
      await FileSystem.copyAsync({
        from: imageAsset.uri,
        to: permanentUri,
      });

      // Verify copy
      const fileInfo = await FileSystem.getInfoAsync(permanentUri);
      if (!fileInfo.exists) {
        throw new Error('Failed to copy image to permanent storage');
      }

      // Create book metadata
      const importedBook: ImportedBook = {
        id: timestamp.toString(),
        title: `Japanese Image (${source})`,
        uri: permanentUri,
        size: fileInfo.size || imageAsset.fileSize || 0,
        mimeType: `image/${extension}`,
        type: 'image',
        importedAt: new Date(),
      };

      // Update library
      const updatedBooks = [importedBook, ...books];
      setBooks(updatedBooks);
      await saveBooksLibrary(updatedBooks);

      // Update last read
      await AsyncStorage.setItem(LAST_READ_KEY, importedBook.id);
      setLastReadBook(importedBook);

      Alert.alert(
        'Success',
        'Image imported successfully! Ready for Japanese text analysis.',
        [
          {
            text: 'Analyze Now',
            onPress: () => navigation.navigate('ImageAnalysis', {
              imageUri: importedBook.uri,
              imageTitle: importedBook.title,
            }),
          },
          { text: 'OK', style: 'cancel' },
        ]
      );

    } catch (error) {
      console.error('Error importing image:', error);
      Alert.alert('Import Error', `Failed to import image: ${error}`);
    } finally {
      setImporting(false);
    }
  };

  const proceedWithPDFImport = async (file: any) => {
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${sanitizedName}`;
    const permanentUri = `${BOOKS_DIR}${fileName}`;

    await FileSystem.copyAsync({
      from: file.uri,
      to: permanentUri,
    });

    const fileInfo = await FileSystem.getInfoAsync(permanentUri);
    if (!fileInfo.exists) {
      throw new Error('Failed to copy file to permanent storage');
    }

    const importedBook: ImportedBook = {
      id: timestamp.toString(),
      title: file.name.replace('.pdf', ''),
      uri: permanentUri,
      size: fileInfo.size || file.size || 0,
      mimeType: file.mimeType || 'application/pdf',
      type: 'pdf',
      importedAt: new Date(),
    };

    const updatedBooks = [importedBook, ...books];
    setBooks(updatedBooks);
    await saveBooksLibrary(updatedBooks);

    Alert.alert(
      'Success',
      `"${importedBook.title}" has been imported successfully!`,
      [
        {
          text: 'Start Reading',
          onPress: () => navigation.navigate('Reading', {
            bookId: importedBook.id,
            bookPath: importedBook.uri,
            bookTitle: importedBook.title,
            lastPage: 1,
          }),
        },
        { text: 'OK', style: 'cancel' },
      ]
    );
  };

  const handleOpenBook = async (book: ImportedBook) => {
    try {
      await AsyncStorage.setItem(LAST_READ_KEY, book.id);
      setLastReadBook(book);
      
      if (book.type === 'image') {
        navigation.navigate('ImageAnalysis', {
          imageUri: book.uri,
          imageTitle: book.title,
        });
      } else {
        const progress = await fileStorageService.getReadingProgress(book.id);
        const startPage = progress?.currentPage || 1;
        
        navigation.navigate('Reading', {
          bookId: book.id,
          bookPath: book.uri,
          bookTitle: book.title,
          lastPage: startPage,
        });
      }
    } catch (error) {
      console.error('Error opening book:', error);
      if (book.type === 'image') {
        navigation.navigate('ImageAnalysis', {
          imageUri: book.uri,
          imageTitle: book.title,
        });
      } else {
        navigation.navigate('Reading', {
          bookId: book.id,
          bookPath: book.uri,
          bookTitle: book.title,
          lastPage: 1,
        });
      }
    }
  };

  const handleDeleteBook = (book: ImportedBook) => {
    Alert.alert(
      `Delete ${book.type === 'image' ? 'Image' : 'PDF'}`,
      `Are you sure you want to delete "${book.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await FileSystem.deleteAsync(book.uri);
              
              const updatedBooks = books.filter(b => b.id !== book.id);
              setBooks(updatedBooks);
              await saveBooksLibrary(updatedBooks);
              
              if (lastReadBook?.id === book.id) {
                setLastReadBook(null);
                await AsyncStorage.removeItem(LAST_READ_KEY);
              }
              
            } catch (error) {
              console.error('Error deleting book:', error);
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatLastRead = (date: Date): string => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
  };

  const getBookIcon = (book: ImportedBook): string => {
    return book.type === 'image' ? '📷' : '📖';
  };

  // Show loading screen while database is initializing
  if (loading || isDatabaseLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={darkTheme.colors.primary} />
          <Text style={styles.loadingText}>
            {isDatabaseLoading ? 'Initializing kanji database...' : 'Loading your library...'}
          </Text>
          {isDatabaseLoading && (
            <Text style={styles.loadingSubtext}>
              Importing 50 kanji from database...
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[darkTheme.colors.primary]}
            tintColor={darkTheme.colors.primary}
          />
        }
      >
        {/* Quick Resume Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.quickResumeButton,
              !lastReadBook && styles.quickResumeButtonDisabled
            ]}
            onPress={handleQuickResume}
            activeOpacity={0.8}
          >
            <Text style={styles.quickResumeText}>
              {lastReadBook ? 'Quick Resume' : 'No Recent Content'}
            </Text>
            <Text style={styles.quickResumeSubtext}>
              {lastReadBook 
                ? `Continue "${lastReadBook.title}" ${getBookIcon(lastReadBook)}` 
                : 'Import a PDF or image to get started'
              }
            </Text>
          </TouchableOpacity>
        </View>

        {/* Knowledge Bank Statistics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Knowledge Bank</Text>
            <TouchableOpacity
              style={[
                styles.exploreButton,
                (!isDatabaseReady || databaseError) && styles.exploreButtonDisabled
              ]}
              onPress={handleExploreKanji}
              activeOpacity={0.7}
              disabled={!isDatabaseReady || !!databaseError}
            >
              <Text style={styles.exploreButtonText}>
                {isDatabaseReady ? 'Explore' : 'Loading...'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={[
              styles.statsContainer,
              (!isDatabaseReady || databaseError) && styles.statsContainerDisabled
            ]}
            onPress={handleExploreKanji}
            activeOpacity={0.8}
            disabled={!isDatabaseReady || !!databaseError}
          >
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{knowledgeStats.totalKanji}</Text>
              <Text style={styles.statLabel}>Total Kanji</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{knowledgeStats.kanjiWithProgress}</Text>
              <Text style={styles.statLabel}>Encountered</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{books.length}</Text>
              <Text style={styles.statLabel}>Items</Text>
            </View>
          </TouchableOpacity>
          
          {knowledgeStats.kanjiWithProgress > 0 && (
            <Text style={styles.knowledgeSubtext}>
              Average {knowledgeStats.averageTimesSeen} times seen per kanji
            </Text>
          )}
        </View>

        {/* Recently Read Books/Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Content</Text>
          
          {books.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📚</Text>
              <Text style={styles.emptyStateText}>No content yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Import Japanese PDFs or take photos of Japanese text to get started
              </Text>
            </View>
          ) : (
            books.slice(0, 5).map((book) => (
              <TouchableOpacity
                key={book.id}
                style={styles.bookItem}
                onPress={() => handleOpenBook(book)}
                onLongPress={() => handleDeleteBook(book)}
                activeOpacity={0.7}
              >
                <View style={styles.bookInfo}>
                  <Text style={styles.bookTitle} numberOfLines={2}>
                    {getBookIcon(book)} {book.title}
                  </Text>
                  <Text style={styles.bookDetails}>
                    {book.type === 'image' ? 'Image' : 'PDF'} • {formatFileSize(book.size)} • {formatLastRead(book.importedAt)}
                  </Text>
                </View>
                <Text style={styles.bookArrow}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Import Options */}
        <View style={styles.section}>
          {!showImportOptions ? (
            <TouchableOpacity
              style={[styles.loadBookButton, importing && styles.loadBookButtonDisabled]}
              onPress={() => setShowImportOptions(true)}
              activeOpacity={0.8}
              disabled={importing}
            >
              {importing ? (
                <ActivityIndicator size="small" color={darkTheme.colors.text} />
              ) : (
                <Text style={styles.loadBookIcon}>📱</Text>
              )}
              <Text style={styles.loadBookButtonText}>
                {importing ? 'Importing...' : 'Import Content'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.importOptionsContainer}>
              <TouchableOpacity
                style={styles.importOption}
                onPress={handleImportPDF}
                activeOpacity={0.8}
              >
                <Text style={styles.importOptionIcon}>📖</Text>
                <Text style={styles.importOptionTitle}>PDF Document</Text>
                <Text style={styles.importOptionSubtext}>Import Japanese PDF books</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.importOption}
                onPress={handleImportImage}
                activeOpacity={0.8}
              >
                <Text style={styles.importOptionIcon}>📷</Text>
                <Text style={styles.importOptionTitle}>Japanese Image</Text>
                <Text style={styles.importOptionSubtext}>Photo or select image with text</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cancelImportButton}
                onPress={() => setShowImportOptions(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelImportText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Database Status Indicator */}
        {databaseError && (
          <View style={styles.section}>
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Database Error</Text>
              <Text style={styles.errorSubtext}>{databaseError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  loadData();
                }}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: darkTheme.spacing.xl,
  },
  loadingText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    marginTop: darkTheme.spacing.md,
    textAlign: 'center',
  },
  loadingSubtext: {
    ...darkTheme.typography.bodySmall,
    color: darkTheme.colors.textTertiary,
    marginTop: darkTheme.spacing.sm,
    textAlign: 'center',
  },
  scrollContent: {
    padding: darkTheme.spacing.md,
    paddingBottom: darkTheme.spacing.xl,
  },
  section: {
    marginBottom: darkTheme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: darkTheme.spacing.md,
  },
  sectionTitle: {
    ...darkTheme.typography.h3,
    color: darkTheme.colors.text,
  },
  exploreButton: {
    backgroundColor: darkTheme.colors.primary,
    borderRadius: darkTheme.borderRadius.md,
    paddingHorizontal: darkTheme.spacing.md,
    paddingVertical: darkTheme.spacing.sm,
  },
  exploreButtonDisabled: {
    backgroundColor: darkTheme.colors.surface,
    opacity: 0.6,
  },
  exploreButtonText: {
    ...darkTheme.typography.bodySmall,
    color: darkTheme.colors.text,
    fontWeight: '600',
  },
  
  // Quick Resume Button
  quickResumeButton: {
    backgroundColor: darkTheme.colors.primary,
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.xl,
    alignItems: 'center',
    ...darkTheme.shadows.medium,
  },
  quickResumeButtonDisabled: {
    backgroundColor: darkTheme.colors.surface,
    borderWidth: 2,
    borderColor: darkTheme.colors.border,
    borderStyle: 'dashed',
  },
  quickResumeText: {
    ...darkTheme.typography.h2,
    color: darkTheme.colors.text,
    marginBottom: darkTheme.spacing.xs,
  },
  quickResumeSubtext: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    opacity: 0.8,
    textAlign: 'center',
  },
  
  // Knowledge Bank Statistics
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: darkTheme.colors.surface,
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.lg,
    ...darkTheme.shadows.small,
  },
  statsContainerDisabled: {
    opacity: 0.6,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: darkTheme.colors.border,
    marginHorizontal: darkTheme.spacing.md,
  },
  statNumber: {
    ...darkTheme.typography.h1,
    color: darkTheme.colors.primary,
    marginBottom: darkTheme.spacing.xs,
  },
  statLabel: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
  },
  knowledgeSubtext: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textTertiary,
    textAlign: 'center',
    marginTop: darkTheme.spacing.sm,
  },
  
  // Empty State
  emptyState: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.xl,
    alignItems: 'center',
    ...darkTheme.shadows.small,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: darkTheme.spacing.md,
  },
  emptyStateText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    marginBottom: darkTheme.spacing.xs,
  },
  emptyStateSubtext: {
    ...darkTheme.typography.bodySmall,
    color: darkTheme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Book Items
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.surface,
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.lg,
    marginBottom: darkTheme.spacing.md,
    ...darkTheme.shadows.small,
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    fontWeight: '600',
    marginBottom: darkTheme.spacing.xs,
  },
  bookDetails: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
  },
  bookArrow: {
    ...darkTheme.typography.h3,
    color: darkTheme.colors.textTertiary,
    marginLeft: darkTheme.spacing.md,
  },
  
  // Load Book Button
  loadBookButton: {
    backgroundColor: darkTheme.colors.surface,
    borderColor: darkTheme.colors.border,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.xl,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadBookButtonDisabled: {
    opacity: 0.6,
  },
  loadBookIcon: {
    fontSize: 24,
    marginRight: darkTheme.spacing.sm,
  },
  loadBookButtonText: {
    ...darkTheme.typography.button,
    color: darkTheme.colors.text,
  },

  // Import Options
  importOptionsContainer: {
    gap: darkTheme.spacing.md,
  },
  importOption: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.lg,
    alignItems: 'center',
    ...darkTheme.shadows.small,
  },
  importOptionIcon: {
    fontSize: 32,
    marginBottom: darkTheme.spacing.sm,
  },
  importOptionTitle: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    fontWeight: '600',
    marginBottom: darkTheme.spacing.xs,
  },
  importOptionSubtext: {
    ...darkTheme.typography.bodySmall,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
  },
  cancelImportButton: {
    backgroundColor: darkTheme.colors.background,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.md,
    alignItems: 'center',
  },
  cancelImportText: {
    ...darkTheme.typography.button,
    color: darkTheme.colors.textSecondary,
  },

  // Error Container
  errorContainer: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b6b',
  },
  errorText: {
    ...darkTheme.typography.body,
    color: '#ff6b6b',
    fontWeight: '600',
    marginBottom: darkTheme.spacing.xs,
  },
  errorSubtext: {
    ...darkTheme.typography.bodySmall,
    color: darkTheme.colors.textSecondary,
    marginBottom: darkTheme.spacing.md,
  },
  retryButton: {
    backgroundColor: darkTheme.colors.primary,
    borderRadius: darkTheme.borderRadius.md,
    padding: darkTheme.spacing.sm,
    alignItems: 'center',
  },
  retryButtonText: {
    ...darkTheme.typography.bodySmall,
    color: darkTheme.colors.text,
    fontWeight: '600',
  },
});

export default HomeScreen;
