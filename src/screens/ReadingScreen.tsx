import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Modal,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { ReadingScreenProps } from '../types/navigation';
import ExpoPDFViewer from '../components/ExpoPDFViewer';
import { darkTheme } from '../styles/theme';
import { fileStorageService, ReadingProgress } from '../services/FileStorageService';

const { height: screenHeight } = Dimensions.get('window');

const ReadingScreen: React.FC<ReadingScreenProps> = ({ navigation, route }) => {
  const { bookId, bookPath, bookTitle, lastPage } = route.params || {};
  
  const [showKanjiAnalysis, setShowKanjiAnalysis] = useState(false);
  const [currentPage, setCurrentPage] = useState(lastPage || 1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [readingStartTime, setReadingStartTime] = useState<Date>(new Date());

  // Load saved reading progress when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadReadingProgress();
    }, [bookId])
  );

  const loadReadingProgress = async () => {
    if (!bookId) return;
    
    try {
      const progress = await fileStorageService.getReadingProgress(bookId);
      if (progress && progress.currentPage > 0) {
        console.log(`Loaded saved progress: page ${progress.currentPage} of ${progress.totalPages}`);
        setCurrentPage(progress.currentPage);
        setTotalPages(progress.totalPages);
      }
    } catch (error) {
      console.error('Error loading reading progress:', error);
    }
  };

  const saveReadingProgress = async (page: number, total: number) => {
    if (!bookId || page <= 0 || total <= 0) return;
    
    try {
      const now = new Date();
      const readingTimeSeconds = Math.floor((now.getTime() - readingStartTime.getTime()) / 1000);
      
      const progress: ReadingProgress = {
        bookId,
        currentPage: page,
        totalPages: total,
        lastReadAt: now,
        readingTimeSeconds,
      };
      
      await fileStorageService.saveReadingProgress(progress);
      console.log(`Saved progress: page ${page} of ${total}`);
    } catch (error) {
      console.error('Error saving reading progress:', error);
    }
  };

  // Set screen title
  useEffect(() => {
    if (bookTitle) {
      navigation.setOptions({ title: bookTitle });
    }
  }, [bookTitle, navigation]);

  const handleLearnButtonPress = () => {
    setShowKanjiAnalysis(true);
  };

  const handleCloseBottomSheet = () => {
    setShowKanjiAnalysis(false);
  };

  const handlePageChanged = (page: number, total: number) => {
    console.log(`Page changed: ${page}/${total}`);
    setCurrentPage(page);
    setTotalPages(total);
    
    // Save progress immediately when page changes
    saveReadingProgress(page, total);
  };

  const handleLoadComplete = (total: number) => {
    console.log(`PDF loaded: ${total} pages`);
    setTotalPages(total);
    setLoading(false);
    
    // Save initial progress
    saveReadingProgress(currentPage, total);
  };

  const handlePDFError = (error: Error) => {
    console.error('PDF Error:', error);
    setLoading(false);
    Alert.alert(
      'PDF Error', 
      `Failed to load PDF. Please check the file.\n\nError: ${error.message}`,
      [
        { text: 'Go Back', onPress: () => navigation.goBack() },
        { text: 'Retry', onPress: () => setLoading(true) },
      ]
    );
  };

  const handleTextExtracted = (text: string, pageNumber: number) => {
    console.log(`Text extracted from page ${pageNumber}: ${text.length} characters`);
    // TODO: Process text for kanji analysis
    // This is where we'll implement the kanji identification in the next phase
  };

  const handleBackPress = () => {
    // Save final progress before leaving
    if (currentPage > 0 && totalPages > 0) {
      saveReadingProgress(currentPage, totalPages);
    }
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Header Overlay */}
      <View style={styles.headerOverlay}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleBackPress}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {bookTitle || 'Reading'}
          </Text>
          {totalPages > 0 && (
            <Text style={styles.headerSubtitle}>
              Page {currentPage} of {totalPages}
            </Text>
          )}
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleLearnButtonPress}
            activeOpacity={0.8}
          >
            <Text style={styles.learnButtonText}>学</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* PDF Viewer */}
      <View style={styles.pdfContainer}>
        {bookPath ? (
          <ExpoPDFViewer
            source={{ uri: bookPath }}
            onPageChanged={handlePageChanged}
            onLoadComplete={handleLoadComplete}
            onError={handlePDFError}
            onTextExtracted={handleTextExtracted}
            style={styles.pdfViewer}
            currentPage={currentPage}
          />
        ) : (
          <View style={styles.noPdfContainer}>
            <Text style={styles.noPdfText}>📖</Text>
            <Text style={styles.noPdfTitle}>No PDF Selected</Text>
            <Text style={styles.noPdfSubtext}>
              Go back and select a PDF book to read
            </Text>
          </View>
        )}
      </View>

      {/* Progress Bar */}
      {totalPages > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(currentPage / totalPages) * 100}%` }
              ]} 
            />
          </View>
        </View>
      )}

      {/* Bottom Sheet Modal */}
      <Modal
        visible={showKanjiAnalysis}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseBottomSheet}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            onPress={handleCloseBottomSheet}
            activeOpacity={1}
          />
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.bottomSheetTitle}>Kanji Analysis</Text>
            <Text style={styles.bottomSheetSubtext}>
              {bookTitle} - Page {currentPage} of {totalPages}
            </Text>

            {/* Reading Progress */}
            <View style={styles.statsSection}>
              <Text style={styles.statsTitle}>Reading Progress</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{currentPage}</Text>
                  <Text style={styles.statLabel}>Current Page</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{totalPages}</Text>
                  <Text style={styles.statLabel}>Total Pages</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0}%
                  </Text>
                  <Text style={styles.statLabel}>Complete</Text>
                </View>
              </View>
            </View>

            {/* Development Status */}
            <View style={styles.featuresSection}>
              <Text style={styles.featuresTitle}>Development Status</Text>
              <View style={styles.features}>
                <Text style={styles.featureText}>✅ PDF viewer (WebView + PDF.js)</Text>
                <Text style={styles.featureText}>✅ Page navigation & controls</Text>
                <Text style={styles.featureText}>✅ Reading progress persistence</Text>
                <Text style={styles.featureText}>✅ Text extraction ready</Text>
                <Text style={styles.featureText}>⏳ Kanji identification (next)</Text>
                <Text style={styles.featureText}>⏳ Knowledge bank integration</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleCloseBottomSheet}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.pdfBackground,
  },
  
  // Header
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.pdfOverlay,
    paddingTop: 50,
    paddingHorizontal: darkTheme.spacing.lg,
    paddingBottom: darkTheme.spacing.lg,
    zIndex: 10,
    height: 120,
  },
  
  headerLeft: {
    width: 70,
    alignItems: 'flex-start',
  },
  
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  headerRight: {
    width: 70,
    alignItems: 'flex-end',
  },
  
  headerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    ...darkTheme.shadows.small,
  },
  
  backButtonText: {
    fontSize: 24,
    color: darkTheme.colors.text,
    fontWeight: '600',
  },
  
  learnButtonText: {
    fontSize: 24,
    color: darkTheme.colors.text,
    fontWeight: '400',
  },
  
  headerTitle: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  
  headerSubtitle: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
  },
  
  // PDF Container
  pdfContainer: {
    flex: 1,
    backgroundColor: darkTheme.colors.pdfBackground,
  },
  pdfViewer: {
    flex: 1,
  },
  
  // No PDF State
  noPdfContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: darkTheme.spacing.xl,
  },
  noPdfText: {
    fontSize: 64,
    marginBottom: darkTheme.spacing.lg,
  },
  noPdfTitle: {
    ...darkTheme.typography.h2,
    color: darkTheme.colors.text,
    marginBottom: darkTheme.spacing.sm,
  },
  noPdfSubtext: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
  },
  
  // Progress Bar
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  progressBar: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: darkTheme.colors.primary,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheet: {
    backgroundColor: darkTheme.colors.surface,
    borderTopLeftRadius: darkTheme.borderRadius.xl,
    borderTopRightRadius: darkTheme.borderRadius.xl,
    padding: darkTheme.spacing.lg,
    paddingBottom: darkTheme.spacing.xl,
    minHeight: screenHeight * 0.4,
    ...darkTheme.shadows.large,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: darkTheme.colors.textTertiary,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: darkTheme.spacing.md,
  },
  bottomSheetTitle: {
    ...darkTheme.typography.h3,
    color: darkTheme.colors.text,
    marginBottom: darkTheme.spacing.sm,
    textAlign: 'center',
  },
  bottomSheetSubtext: {
    ...darkTheme.typography.bodySmall,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: darkTheme.spacing.lg,
  },
  
  // Stats Section
  statsSection: {
    marginBottom: darkTheme.spacing.lg,
  },
  statsTitle: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    fontWeight: '600',
    marginBottom: darkTheme.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: darkTheme.colors.background,
    borderRadius: darkTheme.borderRadius.md,
    padding: darkTheme.spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...darkTheme.typography.h3,
    color: darkTheme.colors.primary,
    marginBottom: darkTheme.spacing.xs,
  },
  statLabel: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
  },
  
  // Features Section
  featuresSection: {
    marginBottom: darkTheme.spacing.lg,
  },
  featuresTitle: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    fontWeight: '600',
    marginBottom: darkTheme.spacing.md,
  },
  features: {
    backgroundColor: darkTheme.colors.background,
    borderRadius: darkTheme.borderRadius.md,
    padding: darkTheme.spacing.md,
  },
  featureText: {
    ...darkTheme.typography.bodySmall,
    color: darkTheme.colors.textSecondary,
    marginBottom: darkTheme.spacing.xs,
  },
  
  closeButton: {
    backgroundColor: darkTheme.colors.primary,
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.md,
    alignItems: 'center',
  },
  closeButtonText: {
    ...darkTheme.typography.button,
    color: darkTheme.colors.text,
  },
});

export default ReadingScreen;
