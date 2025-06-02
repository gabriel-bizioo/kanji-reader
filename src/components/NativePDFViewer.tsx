import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Pdf from 'react-native-pdf';
import { darkTheme } from '../styles/theme';

interface NativePDFViewerProps {
  source: { uri: string };
  onPageChanged?: (page: number, totalPages: number) => void;
  onLoadComplete?: (totalPages: number) => void;
  onError?: (error: Error) => void;
  onTextExtracted?: (text: string, pageNumber: number) => void;
  style?: any;
  currentPage?: number;
}

const NativePDFViewer: React.FC<NativePDFViewerProps> = ({
  source,
  onPageChanged,
  onLoadComplete,
  onError,
  onTextExtracted,
  style,
  currentPage: initialPage = 1,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const pdfRef = useRef<Pdf>(null);

  const handleLoadComplete = (numberOfPages: number, filePath: string) => {
    console.log(`PDF loaded: ${numberOfPages} pages`);
    setLoading(false);
    setTotalPages(numberOfPages);
    onLoadComplete?.(numberOfPages);
    
    // Navigate to initial page if specified
    if (initialPage > 1 && initialPage <= numberOfPages) {
      setCurrentPage(initialPage);
      onPageChanged?.(initialPage, numberOfPages);
    } else {
      onPageChanged?.(1, numberOfPages);
    }
  };

  const handlePageChanged = (page: number, numberOfPages: number) => {
    console.log(`Page changed: ${page}/${numberOfPages}`);
    setCurrentPage(page);
    onPageChanged?.(page, numberOfPages);
  };

  const handleError = (error: any) => {
    console.error('PDF Error:', error);
    setError(`Failed to load PDF: ${error.message || error}`);
    setLoading(false);
    onError?.(new Error(`Failed to load PDF: ${error.message || error}`));
  };

  const handleLoadProgress = (percent: number) => {
    console.log(`PDF loading: ${Math.round(percent * 100)}%`);
  };

  const navigateToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages && pdfRef.current) {
      pdfRef.current.setPage(pageNumber);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      navigateToPage(currentPage + 1);
    }
  };
  
  const previousPage = () => {
    if (currentPage > 1) {
      navigateToPage(currentPage - 1);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, style]}>
        <ActivityIndicator size="large" color={darkTheme.colors.primary} />
        <Text style={styles.loadingText}>Loading PDF...</Text>
        <Text style={styles.debugText}>Using native PDF renderer</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent, style]}>
        <Text style={styles.errorText}>📄</Text>
        <Text style={styles.errorTitle}>PDF Loading Error</Text>
        <Text style={styles.errorDetails}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            setLoading(true);
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Pdf
        ref={pdfRef}
        source={source}
        onLoadComplete={handleLoadComplete}
        onPageChanged={handlePageChanged}
        onError={handleError}
        onLoadProgress={handleLoadProgress}
        style={styles.pdf}
        // PDF display settings
        spacing={0}
        enablePaging={true}
        horizontal={false}
        // Single page mode (as requested)
        singlePage={true}
        // Performance settings
        enableAntialiasing={true}
        enableAnnotationRendering={false}
        // Page settings
        page={currentPage}
        // Scale settings
        minScale={0.5}
        maxScale={3.0}
        scale={1.0}
        // UI settings
        activityIndicator={<ActivityIndicator size="large" color={darkTheme.colors.primary} />}
      />
      
      {/* Navigation controls */}
      {totalPages > 0 && (
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.navButton, currentPage === 1 && styles.disabledButton]}
            onPress={previousPage}
            disabled={currentPage === 1}
          >
            <Text style={styles.navButtonText}>◀ Previous</Text>
          </TouchableOpacity>
          
          <View style={styles.pageInfo}>
            <Text style={styles.pageText}>
              {currentPage} / {totalPages}
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.navButton, currentPage === totalPages && styles.disabledButton]}
            onPress={nextPage}
            disabled={currentPage === totalPages}
          >
            <Text style={styles.navButtonText}>Next ▶</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.pdfBackground,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdf: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    backgroundColor: darkTheme.colors.pdfBackground,
  },
  loadingText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    marginTop: darkTheme.spacing.md,
    textAlign: 'center',
  },
  debugText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textTertiary,
    marginTop: darkTheme.spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 48,
    marginBottom: darkTheme.spacing.md,
  },
  errorTitle: {
    ...darkTheme.typography.h3,
    color: darkTheme.colors.error,
    marginBottom: darkTheme.spacing.sm,
    textAlign: 'center',
  },
  errorDetails: {
    ...darkTheme.typography.bodySmall,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: darkTheme.spacing.lg,
    paddingHorizontal: darkTheme.spacing.md,
  },
  retryButton: {
    backgroundColor: darkTheme.colors.primary,
    paddingHorizontal: darkTheme.spacing.lg,
    paddingVertical: darkTheme.spacing.md,
    borderRadius: darkTheme.borderRadius.lg,
  },
  retryButtonText: {
    ...darkTheme.typography.button,
    color: darkTheme.colors.text,
  },
  controls: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  navButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: darkTheme.colors.primary,
    borderRadius: 20,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: darkTheme.colors.surface,
    opacity: 0.5,
  },
  navButtonText: {
    color: darkTheme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  pageInfo: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  pageText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default NativePDFViewer;
