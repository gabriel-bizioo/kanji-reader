import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { kanjiDatabaseService, KanjiEntry } from '../services/KanjiDatabaseService';
import { darkTheme } from '../styles/theme';

interface KanjiDetailScreenProps {
  route: {
    params: {
      character: string;
      fromReading?: boolean; // true if navigated from reading a book
    };
  };
  navigation: any;
}

const KanjiDetailScreen: React.FC<KanjiDetailScreenProps> = ({ route, navigation }) => {
  const [kanji, setKanji] = useState<KanjiEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const { character, fromReading = false } = route.params;

  useEffect(() => {
    loadKanjiDetails();
  }, [character]);

  const loadKanjiDetails = async () => {
    try {
      setLoading(true);
      
      const kanjiData = await kanjiDatabaseService.getKanji(character);
      if (!kanjiData) {
        Alert.alert('Error', 'Kanji not found in database');
        navigation.goBack();
        return;
      }

      setKanji(kanjiData);

      // Only update times seen if this came from reading a book
      if (fromReading) {
        await kanjiDatabaseService.updateKanjiTimesSeen(character);
        console.log(`Updated times seen for kanji: ${character} (from reading)`);
        
        // Reload to get updated count
        const updatedKanji = await kanjiDatabaseService.getKanji(character);
        setKanji(updatedKanji);
      }

    } catch (error) {
      console.error('Error loading kanji details:', error);
      Alert.alert('Error', 'Failed to load kanji details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={darkTheme.colors.primary} />
        <Text style={styles.loadingText}>Loading kanji details...</Text>
      </View>
    );
  }

  if (!kanji) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Kanji not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header with large kanji character */}
      <View style={styles.header}>
        <Text style={styles.kanjiCharacter}>{kanji.character}</Text>
        <View style={styles.headerInfo}>
          <Text style={styles.strokeCount}>
            {kanji.strokeCount} strokes
          </Text>
          {kanji.jlptLevel && (
            <Text style={styles.jlptLevel}>JLPT N{kanji.jlptLevel}</Text>
          )}
          {kanji.frequency && (
            <Text style={styles.frequency}>
              Frequency: {kanji.frequency}
            </Text>
          )}
          {fromReading && kanji.timesSeen && kanji.timesSeen > 0 && (
            <Text style={styles.timesSeen}>
              Encountered {kanji.timesSeen} time{kanji.timesSeen > 1 ? 's' : ''} while reading
            </Text>
          )}
        </View>
      </View>

      {/* Meanings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meanings</Text>
        <View style={styles.meaningsContainer}>
          {kanji.meanings.map((meaning, index) => (
            <View key={index} style={styles.meaningChip}>
              <Text style={styles.meaningText}>{meaning}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Readings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>On Readings (音読み)</Text>
        <View style={styles.readingsContainer}>
          {kanji.onReadings.map((reading, index) => (
            <View key={index} style={styles.readingChip}>
              <Text style={styles.readingText}>{reading}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kun Readings (訓読み)</Text>
        <View style={styles.readingsContainer}>
          {kanji.kunReadings.map((reading, index) => (
            <View key={index} style={styles.readingChip}>
              <Text style={styles.readingText}>{reading}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Radicals */}
      {kanji.radicals && kanji.radicals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Radicals (部首)</Text>
          <View style={styles.radicalsContainer}>
            {kanji.radicals.map((radical, index) => (
              <View key={index} style={styles.radicalChip}>
                <Text style={styles.radicalText}>{radical}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* RTK Story */}
      {kanji.rtkStory && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RTK Memory Story</Text>
          <View style={styles.storyContainer}>
            <Text style={styles.storyText}>{kanji.rtkStory}</Text>
          </View>
        </View>
      )}

      {/* Example Words */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Example Words</Text>
        <View style={styles.examplesContainer}>
          {kanji.examples.map((example, index) => (
            <View key={index} style={styles.exampleItem}>
              <Text style={styles.exampleText}>{example}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Learning Progress (only show if encountered while reading) */}
      {fromReading && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning Progress</Text>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              You've encountered this kanji while reading books
            </Text>
            {kanji.timesSeen && kanji.timesSeen > 0 && (
              <Text style={styles.progressCount}>
                Times seen: {kanji.timesSeen}
              </Text>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  content: {
    padding: darkTheme.spacing.lg,
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.surface,
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.xl,
    marginBottom: darkTheme.spacing.xl,
    ...darkTheme.shadows.medium,
  },
  kanjiCharacter: {
    fontSize: 120,
    color: darkTheme.colors.primary,
    marginRight: darkTheme.spacing.xl,
    fontWeight: '300',
  },
  headerInfo: {
    flex: 1,
  },
  strokeCount: {
    ...darkTheme.typography.h3,
    color: darkTheme.colors.text,
    marginBottom: darkTheme.spacing.sm,
  },
  jlptLevel: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.accent,
    marginBottom: darkTheme.spacing.sm,
  },
  frequency: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    marginBottom: darkTheme.spacing.sm,
  },
  timesSeen: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.primary,
    fontWeight: '600',
  },

  // Sections
  section: {
    marginBottom: darkTheme.spacing.xl,
  },
  sectionTitle: {
    ...darkTheme.typography.h3,
    color: darkTheme.colors.text,
    marginBottom: darkTheme.spacing.md,
  },

  // Meanings
  meaningsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  meaningChip: {
    backgroundColor: darkTheme.colors.primary,
    borderRadius: darkTheme.borderRadius.md,
    paddingHorizontal: darkTheme.spacing.md,
    paddingVertical: darkTheme.spacing.sm,
    marginRight: darkTheme.spacing.sm,
    marginBottom: darkTheme.spacing.sm,
  },
  meaningText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    fontWeight: '600',
  },

  // Readings
  readingsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  readingChip: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: darkTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    paddingHorizontal: darkTheme.spacing.md,
    paddingVertical: darkTheme.spacing.sm,
    marginRight: darkTheme.spacing.sm,
    marginBottom: darkTheme.spacing.sm,
  },
  readingText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
  },

  // Radicals
  radicalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  radicalChip: {
    backgroundColor: darkTheme.colors.accent,
    borderRadius: darkTheme.borderRadius.md,
    paddingHorizontal: darkTheme.spacing.md,
    paddingVertical: darkTheme.spacing.sm,
    marginRight: darkTheme.spacing.sm,
    marginBottom: darkTheme.spacing.sm,
  },
  radicalText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    fontWeight: '600',
  },

  // Story
  storyContainer: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: darkTheme.colors.primary,
  },
  storyText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    lineHeight: 24,
    fontStyle: 'italic',
  },

  // Examples
  examplesContainer: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.lg,
  },
  exampleItem: {
    marginBottom: darkTheme.spacing.md,
  },
  exampleText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    lineHeight: 24,
  },

  // Progress
  progressContainer: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: darkTheme.colors.accent,
  },
  progressText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    marginBottom: darkTheme.spacing.sm,
  },
  progressCount: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.primary,
    fontWeight: '600',
  },
});

export default KanjiDetailScreen;
