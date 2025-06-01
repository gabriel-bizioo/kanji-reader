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
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HomeScreenProps } from '../types/navigation';
import { darkTheme } from '../styles/theme';

interface ImportedBook {
  id: string;
  title: string;
  uri: string;
  size: number;
  mimeType: string;
  importedAt: Date;
}

interface ReadingProgress {
  bookId: string;
  currentPage: number;
  totalPages: number;
  lastReadAt: Date;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [books, setBooks] = useState<ImportedBook[]>([]);
  const [lastReadBook, setLastReadBook] = useState<ImportedBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const BOOKS_DIR = `${FileSystem.documentDirectory}books/`;
  const LIBRARY_KEY = 'imported_books_library';
  const LAST_READ_KEY = 'last_read_book_id';

  // Load data when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      
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
        }));
      }

      // Load last read book
      const lastReadId = await AsyncStorage.getItem(LAST_READ_KEY);
      const lastRead = loadedBooks.find(book => book.id === lastReadId) || null;

      setBooks(loadedBooks);
      setLastReadBook(lastRead);
      
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
    // Check for exact filename match (ignoring timestamp prefix)
    const nameWithoutExt = fileName.replace('.pdf', '').toLowerCase();
    
    for (const book of books) {
      const existingName = book.title.toLowerCase();
      
      // Check filename similarity and size
      if (existingName === nameWithoutExt && Math.abs(book.size - fileSize) < 1000) {
        return book;
      }
    }
    
    return null;
  };

  const handleQuickResume = () => {
    if (lastReadBook) {
      navigation.navigate('Reading', {
        bookId: lastReadBook.id,
        bookPath: lastReadBook.uri,
        bookTitle: lastReadBook.title,
        lastPage: 1,
      });
    } else {
      Alert.alert('No Recent Book', 'Import a PDF to get started!');
    }
  };

  const handleLoadNewBook = async () => {
    setImporting(true);
    
    try {
      // Step 1: Pick PDF
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

      // Step 2: Check for duplicates
      const duplicate = checkForDuplicates(file.name, file.size || 0);
      if (duplicate) {
        Alert.alert(
          'Duplicate Book',
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
              onPress: () => proceedWithImport(file),
            },
          ]
        );
        return;
      }

      // No duplicate, proceed with import
      await proceedWithImport(file);
      
    } catch (error) {
      console.error('Error importing book:', error);
      Alert.alert('Import Error', `Failed to import PDF: ${error}`);
    } finally {
      setImporting(false);
    }
  };

  const proceedWithImport = async (file: any) => {
    // Copy to permanent storage
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${sanitizedName}`;
    const permanentUri = `${BOOKS_DIR}${fileName}`;

    await FileSystem.copyAsync({
      from: file.uri,
      to: permanentUri,
    });

    const originalInfo = await FileSystem.getInfoAsync(file.uri);
    const copiedInfo = await FileSystem.getInfoAsync(permanentUri);
    console.log('Original size:', originalInfo.size, 'Copied size:', copiedInfo.size);
    console.log('Original URI:', file.uri);
    console.log('Copied URI:', permanentUri);

    // Verify copy
    const fileInfo = await FileSystem.getInfoAsync(permanentUri);
    if (!fileInfo.exists) {
      throw new Error('Failed to copy file to permanent storage');
    }

    // Create book metadata
    const importedBook: ImportedBook = {
      id: timestamp.toString(),
      title: file.name.replace('.pdf', ''),
      uri: permanentUri,
      size: fileInfo.size || file.size || 0,
      mimeType: file.mimeType || 'application/pdf',
      importedAt: new Date(),
    };

    // Update library
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

  const handleOpenBook = (book: ImportedBook) => {
    // Update last read book
    AsyncStorage.setItem(LAST_READ_KEY, book.id);
    setLastReadBook(book);
    
    navigation.navigate('Reading', {
      bookId: book.id,
      bookPath: book.uri,
      bookTitle: book.title,
      lastPage: 1,
    });
  };

  const handleDeleteBook = (book: ImportedBook) => {
    Alert.alert(
      'Delete Book',
      `Are you sure you want to delete "${book.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete file
              await FileSystem.deleteAsync(book.uri);
              
              // Remove from library
              const updatedBooks = books.filter(b => b.id !== book.id);
              setBooks(updatedBooks);
              await saveBooksLibrary(updatedBooks);
              
              // Clear last read if it was this book
              if (lastReadBook?.id === book.id) {
                setLastReadBook(null);
                await AsyncStorage.removeItem(LAST_READ_KEY);
              }
              
            } catch (error) {
              console.error('Error deleting book:', error);
              Alert.alert('Error', 'Failed to delete book');
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={darkTheme.colors.primary} />
          <Text style={styles.loadingText}>Loading your library...</Text>
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
        {/* Quick Resume Button - Prominent as specified */}
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
              {lastReadBook ? 'Quick Resume' : 'No Recent Book'}
            </Text>
            <Text style={styles.quickResumeSubtext}>
              {lastReadBook 
                ? `Continue "${lastReadBook.title}"` 
                : 'Import a PDF to get started'
              }
            </Text>
          </TouchableOpacity>
        </View>

        {/* Knowledge Bank Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Knowledge Bank</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Total Kanji</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>New This Week</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{books.length}</Text>
              <Text style={styles.statLabel}>Books Read</Text>
            </View>
          </View>
        </View>

        {/* Recently Read Books */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Read</Text>
          
          {books.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📚</Text>
              <Text style={styles.emptyStateText}>No books yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Load your first Japanese book to get started
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
                    {book.title}
                  </Text>
                  <Text style={styles.bookDetails}>
                    {formatFileSize(book.size)} • {formatLastRead(book.importedAt)}
                  </Text>
                </View>
                <Text style={styles.bookArrow}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Load New Book Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.loadBookButton, importing && styles.loadBookButtonDisabled]}
            onPress={handleLoadNewBook}
            activeOpacity={0.8}
            disabled={importing}
          >
            {importing ? (
              <ActivityIndicator size="small" color={darkTheme.colors.text} />
            ) : (
              <Text style={styles.loadBookIcon}>📖</Text>
            )}
            <Text style={styles.loadBookButtonText}>
              {importing ? 'Importing...' : 'Load New Book'}
            </Text>
          </TouchableOpacity>
        </View>
        {/* Temporary Test Button */}
        <View style={styles.section}>
            <TouchableOpacity
                style={[styles.loadBookButton, { backgroundColor: darkTheme.colors.accent }]}
                onPress={() => navigation.navigate('KanjiTest')}
                activeOpacity={0.8}
            >
                <Text style={styles.loadBookIcon}>🧪</Text>
                <Text style={styles.loadBookButtonText}>Test Kanji Database</Text>
            </TouchableOpacity>
        </View>
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
  },
  loadingText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    marginTop: darkTheme.spacing.md,
  },
  scrollContent: {
    padding: darkTheme.spacing.md,
    paddingBottom: darkTheme.spacing.xl,
  },
  section: {
    marginBottom: darkTheme.spacing.xl,
  },
  sectionTitle: {
    ...darkTheme.typography.h3,
    color: darkTheme.colors.text,
    marginBottom: darkTheme.spacing.md,
  },
  
  // Quick Resume Button (Prominent)
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
  
  // Book Items (Clean Design)
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
});

export default HomeScreen;
