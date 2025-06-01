// src/screens/HomeScreen.tsx - Enhanced Version
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
import type { HomeScreenProps } from '../types/navigation';
import { darkTheme } from '../styles/theme';
import { documentPickerService, ImportedBook } from '../services/DocumentPickerService';
import { fileStorageService, ReadingProgress } from '../services/FileStorageService';

interface BookWithProgress extends ImportedBook {
  progress?: ReadingProgress;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [books, setBooks] = useState<BookWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastReadBook, setLastReadBook] = useState<BookWithProgress | null>(null);
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalKanji: 0, // Placeholder for Week 6
    booksThisWeek: 0,
  });

  // Load books and data when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load library and progress data
      const library = await fileStorageService.getBookLibrary();
      const lastReadBookId = await fileStorageService.getLastReadBook();
      
      // Combine books with their reading progress
      const booksWithProgress: BookWithProgress[] = [];
      let lastRead: BookWithProgress | null = null;

      for (const book of library.books) {
        const progress = await fileStorageService.getReadingProgress(book.id);
        const bookWithProgress = { ...book, progress };
        
        booksWithProgress.push(bookWithProgress);
        
        if (book.id === lastReadBookId) {
          lastRead = bookWithProgress;
        }
      }

      // Calculate stats
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const recentBooks = library.books.filter(book => book.importedAt > oneWeekAgo);

      setBooks(booksWithProgress);
      setLastReadBook(lastRead);
      setStats({
        totalBooks: library.books.length,
        totalKanji: 0, // TODO: Implement in Week 6
        booksThisWeek: recentBooks.length,
      });
      
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load your library. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleQuickResume = () => {
    if (lastReadBook) {
      navigation.navigate('Reading', {
        bookId: lastReadBook.id,
        bookPath: lastReadBook.uri,
        bookTitle: lastReadBook.title,
        lastPage: lastReadBook.progress?.currentPage || 1,
      });
    } else {
      Alert.alert('No Recent Book', 'You haven\'t started reading any books yet. Import a PDF to get started!');
    }
  };

  const handleLoadNewBook = async () => {
    setImporting(true);
    
    try {
      const importedBook = await documentPickerService.pickAndImportPDF();
      
      if (importedBook) {
        // Save to library
        await fileStorageService.saveBookToLibrary(importedBook);
        
        // Reload data
        await loadData();
        
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
      }
    } catch (error) {
      console.error('Error importing book:', error);
      Alert.alert('Error', 'Failed to import book. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteBook = (book: BookWithProgress) => {
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
              // Delete from device storage
              await documentPickerService.deleteBook(book.id);
              
              // Remove from library
              await fileStorageService.removeBookFromLibrary(book.id);
              
              // Reload data
              await loadData();
            } catch (error) {
              console.error('Error deleting book:', error);
              Alert.alert('Error', 'Failed to delete book. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleOpenBook = (book: BookWithProgress) => {
    navigation.navigate('Reading', {
      bookId: book.id,
      bookPath: book.uri,
      bookTitle: book.title,
      lastPage: book.progress?.currentPage || 1,
    });
  };

  const formatLastRead = (date: Date): string => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
  };

  const renderBookItem = (book: BookWithProgress) => (
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
        
        <View style={styles.bookDetails}>
          <Text style={styles.bookSize}>
            {documentPickerService.formatFileSize(book.size)}
          </Text>
          
          {book.progress && (
            <>
              <Text style={styles.bookSeparator}>•</Text>
              <Text style={styles.bookProgress}>
                Page {book.progress.currentPage}
                {book.progress.totalPages > 0 && `/${book.progress.totalPages}`}
              </Text>
              <Text style={styles.bookSeparator}>•</Text>
              <Text style={styles.bookLastRead}>
                {formatLastRead(book.progress.lastReadAt)}
              </Text>
            </>
          )}
        </View>
        
        {book.progress && book.progress.totalPages > 0 && (
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(book.progress.currentPage / book.progress.totalPages) * 100}%` }
              ]} 
            />
          </View>
        )}
      </View>
      
      <View style={styles.bookActions}>
        <Text style={styles.deleteHint}>Long press to delete</Text>
      </View>
    </TouchableOpacity>
  );

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
        {/* Quick Resume Button - Enhanced with actual functionality */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.quickResumeButton,
              !lastReadBook && styles.quickResumeButtonDisabled
            ]}
            onPress={handleQuickResume}
            activeOpacity={0.8}
            disabled={!lastReadBook}
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
            {lastReadBook?.progress && (
              <Text style={styles.quickResumeProgress}>
                Page {lastReadBook.progress.currentPage}
                {lastReadBook.progress.totalPages > 0 && ` of ${lastReadBook.progress.totalPages}`}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Knowledge Bank Statistics - Enhanced with real data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Knowledge Bank</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalKanji}</Text>
              <Text style={styles.statLabel}>Total Kanji</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.booksThisWeek}</Text>
              <Text style={styles.statLabel}>New This Week</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalBooks}</Text>
              <Text style={styles.statLabel}>Books Read</Text>
            </View>
          </View>
        </View>

        {/* Recently Read Books - Enhanced with real book list */}
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
            books.map(renderBookItem)
          )}
        </View>

        {/* Load New Book Button - Enhanced with actual import */}
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
  
  // Quick Resume Button (Enhanced)
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
  quickResumeProgress: {
    ...darkTheme.typography.bodySmall,
    color: darkTheme.colors.text,
    opacity: 0.6,
    marginTop: darkTheme.spacing.xs,
  },
  
  // Knowledge Bank Statistics (Same as before)
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
  
  // Empty State (Same as before)
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
  
  // Book Items (New)
  bookItem: {
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
    marginBottom: darkTheme.spacing.sm,
  },
  bookDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: darkTheme.spacing.sm,
  },
  bookSize: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textTertiary,
  },
  bookSeparator: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.border,
    marginHorizontal: darkTheme.spacing.sm,
  },
  bookProgress: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.primary,
    fontWeight: '600',
  },
  bookLastRead: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textTertiary,
  },
  progressBar: {
    height: 3,
    backgroundColor: darkTheme.colors.border,
    borderRadius: 2,
    marginBottom: darkTheme.spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: darkTheme.colors.primary,
    borderRadius: 2,
  },
  bookActions: {
    alignItems: 'center',
    marginTop: darkTheme.spacing.xs,
  },
  deleteHint: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textTertiary,
    fontStyle: 'italic',
  },
  
  // Load Book Button (Enhanced)
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
