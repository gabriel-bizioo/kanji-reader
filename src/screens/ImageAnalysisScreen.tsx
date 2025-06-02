import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import type { ImageAnalysisScreenProps } from '../types/navigation';
import { darkTheme } from '../styles/theme';
import { ocrService } from '../services/OCRService';
import { japaneseTextProcessor, type TextAnalysisResult } from '../services/JapaneseTextProcessor';

const { height: screenHeight } = Dimensions.get('window');

const ImageAnalysisScreen: React.FC<ImageAnalysisScreenProps> = ({ navigation, route }) => {
  const { imageUri, imageTitle } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedText, setExtractedText] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<TextAnalysisResult | null>(null);
  const [showKanjiAnalysis, setShowKanjiAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number>(0);

  useEffect(() => {
    navigation.setOptions({ title: imageTitle });
    performOCR();
  }, [imageUri, imageTitle, navigation]);

  const performOCR = async () => {
    try {
      setLoading(true);
      setAnalyzing(true);
      setError(null);
      
      console.log('Starting OCR analysis...');
      
      // Check if OCR service is configured
      if (!ocrService.isConfigured()) {
        throw new Error('Google Cloud Vision API key not configured. Please add your API key to OCRService.ts');
      }
      
      // Step 1: Extract text from image using Google Vision API
      console.log('Extracting text from image...');
      const ocrResult = await ocrService.extractTextFromImage(imageUri);
      
      if (!ocrResult.text || ocrResult.text.trim().length === 0) {
        throw new Error('No text detected in image. Please try with an image containing clear Japanese text.');
      }
      
      console.log(`OCR extracted: ${ocrResult.text.length} characters`);
      setExtractedText(ocrResult.text);
      setOcrConfidence(ocrResult.confidence);
      
      // Step 2: Check if text contains Japanese
      if (!japaneseTextProcessor.isJapaneseText(ocrResult.text)) {
        console.warn('No Japanese text detected');
        Alert.alert(
          'No Japanese Text',
          'The extracted text does not appear to contain Japanese characters. Please try with an image containing Japanese text.',
          [{ text: 'OK' }]
        );
      }
      
      // Step 3: Clean and analyze the text
      console.log('Analyzing Japanese text...');
      const cleanedText = japaneseTextProcessor.cleanText(ocrResult.text);
      const textAnalysis = await japaneseTextProcessor.analyzeText(cleanedText);
      
      setAnalysisResult(textAnalysis);
      
      // Step 4: Update knowledge bank
      if (textAnalysis.foundKanji.length > 0) {
        console.log('Updating knowledge bank...');
        await japaneseTextProcessor.updateKnowledgeBank(textAnalysis.foundKanji);
      }
      
      setLoading(false);
      setAnalyzing(false);
      
      console.log(`Analysis complete: Found ${textAnalysis.uniqueKanji.length} unique kanji`);
      
    } catch (error) {
      console.error('OCR analysis failed:', error);
      setError(String(error));
      setLoading(false);
      setAnalyzing(false);
    }
  };

  const handleRetryOCR = () => {
    performOCR();
  };

  const handleAnalyzeKanji = () => {
    setShowKanjiAnalysis(true);
  };

  const handleCloseBottomSheet = () => {
    setShowKanjiAnalysis(false);
  };

  const handleKanjiPress = (kanji: any) => {
    navigation.navigate('KanjiDetail', {
      kanjiId: kanji.character,
      fromReading: true,
    });
  };

  const newKanji = analysisResult?.newKanji || [];
  const seenKanji = analysisResult?.knownKanji || [];
  const stats = analysisResult?.stats;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={darkTheme.colors.primary} />
          <Text style={styles.loadingText}>Analyzing Japanese text...</Text>
          <Text style={styles.loadingSubtext}>
            {analyzing ? 'Processing image with Google Vision API...' : 'Preparing image analysis...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorTitle}>Analysis Failed</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetryOCR}>
            <Text style={styles.retryButtonText}>Retry Analysis</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button and analyze button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.analyzeButton}
          onPress={handleAnalyzeKanji}
        >
          <Text style={styles.analyzeButtonText}>学 Analyze</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Display */}
        <View style={styles.imageSection}>
          <Text style={styles.sectionTitle}>Selected Image</Text>
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
          </View>
        </View>

        {/* Extracted Text */}
        <View style={styles.textSection}>
          <Text style={styles.sectionTitle}>
            Extracted Text {ocrConfidence > 0 && (
              <Text style={styles.confidenceText}>
                ({Math.round(ocrConfidence * 100)}% confidence)
              </Text>
            )}
          </Text>
          <View style={styles.textContainer}>
            <Text style={styles.extractedText}>{extractedText}</Text>
          </View>
        </View>

        {/* Analysis Results */}
        {analysisResult && (
          <>
            {/* Quick Stats */}
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Analysis Results</Text>
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats?.uniqueKanjiCount || 0}</Text>
                  <Text style={styles.statLabel}>Unique Kanji</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats?.newKanjiCount || 0}</Text>
                  <Text style={styles.statLabel}>New</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{(stats?.uniqueKanjiCount || 0) - (stats?.newKanjiCount || 0)}</Text>
                  <Text style={styles.statLabel}>Known</Text>
                </View>
              </View>
              
              {/* Additional Stats */}
              {stats && (
                <View style={styles.additionalStats}>
                  <Text style={styles.additionalStatsText}>
                    📝 {stats.totalCharacters} characters • 
                    🈁 {stats.hiraganaCount} hiragana • 
                    🈲 {stats.katakanaCount} katakana
                  </Text>
                  <Text style={styles.additionalStatsText}>
                    📊 Difficulty: {japaneseTextProcessor.calculateDifficultyScore(analysisResult)}/10
                  </Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsSection}>
              <TouchableOpacity style={styles.primaryAction} onPress={handleAnalyzeKanji}>
                <Text style={styles.primaryActionText}>
                  📚 View {analysisResult.uniqueKanji.length} Kanji
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.secondaryAction} onPress={handleRetryOCR}>
                <Text style={styles.secondaryActionText}>🔄 Re-analyze Image</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Kanji Analysis Bottom Sheet */}
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
            <Text style={styles.bottomSheetTitle}>Found Kanji</Text>
            <Text style={styles.bottomSheetSubtext}>
              {imageTitle} • {analysisResult?.uniqueKanji.length || 0} kanji found
            </Text>

            <ScrollView style={styles.kanjiScrollView} showsVerticalScrollIndicator={false}>
              {/* New Kanji Section */}
              {newKanji.length > 0 && (
                <View style={styles.kanjiGroup}>
                  <Text style={styles.kanjiGroupTitle}>
                    🆕 New Kanji ({newKanji.length})
                  </Text>
                  {newKanji.map((kanji, index) => (
                    <TouchableOpacity
                      key={`new-${index}`}
                      style={styles.kanjiItem}
                      onPress={() => handleKanjiPress(kanji)}
                    >
                      <Text style={styles.kanjiCharacter}>{kanji.character}</Text>
                      <View style={styles.kanjiInfo}>
                        <Text style={styles.kanjiMeaning}>
                          {kanji.meanings.slice(0, 2).join(', ')}
                        </Text>
                        <Text style={styles.kanjiReading}>
                          {kanji.readings.slice(0, 2).join(', ')}
                        </Text>
                      </View>
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Known Kanji Section */}
              {seenKanji.length > 0 && (
                <View style={styles.kanjiGroup}>
                  <Text style={styles.kanjiGroupTitle}>
                    ✅ Known Kanji ({seenKanji.length})
                  </Text>
                  {seenKanji.map((kanji, index) => (
                    <TouchableOpacity
                      key={`seen-${index}`}
                      style={styles.kanjiItem}
                      onPress={() => handleKanjiPress(kanji)}
                    >
                      <Text style={styles.kanjiCharacter}>{kanji.character}</Text>
                      <View style={styles.kanjiInfo}>
                        <Text style={styles.kanjiMeaning}>
                          {kanji.meanings.slice(0, 2).join(', ')}
                        </Text>
                        <Text style={styles.kanjiReading}>
                          {kanji.readings.slice(0, 2).join(', ')}
                        </Text>
                      </View>
                      <Text style={styles.timesSeenText}>{kanji.timesSeen}×</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* No Kanji Found */}
              {(!newKanji.length && !seenKanji.length) && (
                <View style={styles.noKanjiContainer}>
                  <Text style={styles.noKanjiText}>No kanji found in the extracted text</Text>
                  <Text style={styles.noKanjiSubtext}>Try with an image containing Japanese kanji characters</Text>
                </View>
              )}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleCloseBottomSheet}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  
  // Loading State
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

  // Error State
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: darkTheme.spacing.xl,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: darkTheme.spacing.md,
  },
  errorTitle: {
    ...darkTheme.typography.h2,
    color: darkTheme.colors.error,
    marginBottom: darkTheme.spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: darkTheme.spacing.lg,
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

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: darkTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
  },
  backButton: {
    paddingVertical: darkTheme.spacing.sm,
    paddingHorizontal: darkTheme.spacing.md,
  },
  backButtonText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.primary,
  },
  analyzeButton: {
    backgroundColor: darkTheme.colors.primary,
    paddingHorizontal: darkTheme.spacing.md,
    paddingVertical: darkTheme.spacing.sm,
    borderRadius: darkTheme.borderRadius.md,
  },
  analyzeButtonText: {
    ...darkTheme.typography.button,
    color: darkTheme.colors.text,
  },

  // Content
  content: {
    flex: 1,
    padding: darkTheme.spacing.lg,
  },
  
  // Section Styles
  sectionTitle: {
    ...darkTheme.typography.h3,
    color: darkTheme.colors.text,
    marginBottom: darkTheme.spacing.md,
  },

  // Image Section
  imageSection: {
    marginBottom: darkTheme.spacing.xl,
  },
  imageContainer: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.md,
    alignItems: 'center',
    ...darkTheme.shadows.small,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: darkTheme.borderRadius.md,
  },

  // Text Section
  textSection: {
    marginBottom: darkTheme.spacing.xl,
  },
  textContainer: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.lg,
    ...darkTheme.shadows.small,
  },
  extractedText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    lineHeight: 24,
    fontSize: 16,
  },
  confidenceText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textTertiary,
    fontWeight: 'normal',
  },

  // Stats Section
  statsSection: {
    marginBottom: darkTheme.spacing.xl,
  },
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
  additionalStats: {
    marginTop: darkTheme.spacing.md,
    alignItems: 'center',
  },
  additionalStatsText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: darkTheme.spacing.xs,
  },

  // Actions Section
  actionsSection: {
    gap: darkTheme.spacing.md,
    marginBottom: darkTheme.spacing.xl,
  },
  primaryAction: {
    backgroundColor: darkTheme.colors.primary,
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.lg,
    alignItems: 'center',
    ...darkTheme.shadows.medium,
  },
  primaryActionText: {
    ...darkTheme.typography.button,
    color: darkTheme.colors.text,
    fontSize: 16,
  },
  secondaryAction: {
    backgroundColor: darkTheme.colors.surface,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.lg,
    alignItems: 'center',
  },
  secondaryActionText: {
    ...darkTheme.typography.button,
    color: darkTheme.colors.textSecondary,
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
    maxHeight: screenHeight * 0.7,
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

  // Kanji List
  kanjiScrollView: {
    flex: 1,
    marginBottom: darkTheme.spacing.lg,
  },
  kanjiGroup: {
    marginBottom: darkTheme.spacing.lg,
  },
  kanjiGroupTitle: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    fontWeight: '600',
    marginBottom: darkTheme.spacing.md,
  },
  kanjiItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.background,
    borderRadius: darkTheme.borderRadius.md,
    padding: darkTheme.spacing.md,
    marginBottom: darkTheme.spacing.sm,
  },
  kanjiCharacter: {
    fontSize: 32,
    fontWeight: 'bold',
    color: darkTheme.colors.text,
    marginRight: darkTheme.spacing.md,
    minWidth: 50,
    textAlign: 'center',
  },
  kanjiInfo: {
    flex: 1,
  },
  kanjiMeaning: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    marginBottom: darkTheme.spacing.xs,
  },
  kanjiReading: {
    ...darkTheme.typography.bodySmall,
    color: darkTheme.colors.textSecondary,
  },
  newBadge: {
    backgroundColor: darkTheme.colors.primary,
    paddingHorizontal: darkTheme.spacing.sm,
    paddingVertical: 2,
    borderRadius: darkTheme.borderRadius.sm,
  },
  newBadgeText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.text,
    fontSize: 10,
    fontWeight: 'bold',
  },
  timesSeenText: {
    ...darkTheme.typography.bodySmall,
    color: darkTheme.colors.textSecondary,
    fontWeight: '600',
  },
  noKanjiContainer: {
    alignItems: 'center',
    padding: darkTheme.spacing.xl,
  },
  noKanjiText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: darkTheme.spacing.sm,
  },
  noKanjiSubtext: {
    ...darkTheme.typography.bodySmall,
    color: darkTheme.colors.textTertiary,
    textAlign: 'center',
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

export default ImageAnalysisScreen;
