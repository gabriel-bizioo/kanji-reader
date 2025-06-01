import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Modal,
  Dimensions,
} from 'react-native';
import type { ReadingScreenProps } from '../types/navigation';
import { darkTheme } from '../styles/theme';
import ExpoPDFViewer from '../components/ExpoPDFViewer';

const { height: screenHeight } = Dimensions.get('window');

const ReadingScreen: React.FC<ReadingScreenProps> = ({ navigation, route }) => {
  const { bookTitle, bookPath } = route.params || {};
  const [showKanjiAnalysis, setShowKanjiAnalysis] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const handleLearnButtonPress = () => {
    setShowKanjiAnalysis(true);
  };

  const handleCloseBottomSheet = () => {
    setShowKanjiAnalysis(false);
  };

  const handlePageChanged = (page: number, total: number) => {
    setCurrentPage(page);
    setTotalPages(total);
  };

  const handleLoadComplete = (total: number) => {
    setTotalPages(total);
  };

  const handlePDFError = (error: Error) => {
    console.error('PDF Error:', error);
    // Handle error - maybe show alert or fallback
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <View style={styles.headerOverlay}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {bookTitle || 'Reading'}
          </Text>
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

      {/* Real PDF Viewer */}
      <View style={styles.pdfContainer}>
        {bookPath ? (
          <ExpoPDFViewer
            source={{ uri: bookPath }}
            onPageChanged={handlePageChanged}
            onLoadComplete={handleLoadComplete}
            onError={handlePDFError}
            style={styles.pdfViewer}
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
              Current page: {currentPage} of {totalPages}
            </Text>
            <View style={styles.features}>
              <Text style={styles.featureText}>• PDF loaded successfully</Text>
              <Text style={styles.featureText}>• Page navigation working</Text>
              <Text style={styles.featureText}>• Ready for kanji analysis (Week 3)</Text>
              <Text style={styles.featureText}>• Text extraction coming soon</Text>
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
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 24,
  },
  learnButtonText: {
    fontSize: 24,
    color: darkTheme.colors.text,
    fontWeight: '400',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 24,
  },
  
  headerTitle: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    fontWeight: '600',
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
  
  // Modal styles
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
  features: {
    marginBottom: darkTheme.spacing.lg,
  },
  featureText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textTertiary,
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
