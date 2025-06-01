import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { asyncKanjiService, KanjiEntry } from '../services/AsyncKanjiService';
import { darkTheme } from '../styles/theme';

const KanjiTestScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KanjiEntry[]>([]);
  const [selectedKanji, setSelectedKanji] = useState<KanjiEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      console.log('Loading initial data...');

      await asyncKanjiService.initialize();
      // Get database stats
      const dbStats = await asyncKanjiService.getDatabaseStats();
      console.log('Database stats loaded:', dbStats);
      setStats(dbStats);

      // Load first 10 kanji
      const result = await asyncKanjiService.searchKanji({ limit: 10 });
      console.log('Search results: ')
      setSearchResults(result.kanji);

    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert('Error', 'Failed to load kanji data: ' + error.message);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadInitialData();
      return;
    }

    setLoading(true);
    try {
      const result = await asyncKanjiService.searchKanji({
        query: searchQuery,
        limit: 20,
      });
      setSearchResults(result.kanji);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKanjiSelect = async (character: string) => {
    try {
      const kanji = await asyncKanjiService.getKanji(character);
      setSelectedKanji(kanji);
    } catch (error) {
      console.error('Error getting kanji details:', error);
      Alert.alert('Error', 'Failed to load kanji details');
    }
  };

  const testSpecificKanji = async () => {
    const testCharacters = ['日', '本', '人', '学', '語'];
    try {
      const kanji = await asyncKanjiService.getMultipleKanji(testCharacters);
      setSearchResults(kanji);
      Alert.alert('Test Complete', `Found ${kanji.length} of ${testCharacters.length} test kanji`);
    } catch (error) {
      console.error('Test error:', error);
      Alert.alert('Error', 'Test failed');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Database Stats */}
      {stats && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Database Statistics</Text>
          <Text style={styles.statsText}>Kanji: {stats.totalKanji}</Text>
          <Text style={styles.statsText}>Radicals: {stats.totalRadicals}</Text>
          <Text style={styles.statsText}>Version: {stats.databaseVersion}</Text>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search kanji, meaning, or reading..."
          placeholderTextColor={darkTheme.colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Test Button */}
      <TouchableOpacity style={styles.testButton} onPress={testSpecificKanji}>
        <Text style={styles.testButtonText}>Test Core Kanji (日本人学語)</Text>
      </TouchableOpacity>

      {/* Loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={darkTheme.colors.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {/* Search Results */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>
          Results ({searchResults.length})
        </Text>
        
        <View style={styles.kanjiGrid}>
          {searchResults.map((kanji) => (
            <TouchableOpacity
              key={kanji.id}
              style={styles.kanjiItem}
              onPress={() => handleKanjiSelect(kanji.character)}
            >
              <Text style={styles.kanjiCharacter}>{kanji.character}</Text>
              <Text style={styles.kanjiMeaning} numberOfLines={1}>
                {kanji.meanings[0]}
              </Text>
              <Text style={styles.kanjiGrade}>
                {kanji.grade ? `G${kanji.grade}` : 'N/A'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Selected Kanji Details */}
      {selectedKanji && (
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>Kanji Details</Text>
          
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsCharacter}>{selectedKanji.character}</Text>
            <View style={styles.detailsInfo}>
              <Text style={styles.detailsStroke}>
                {selectedKanji.strokeCount} strokes
              </Text>
              {selectedKanji.grade && (
                <Text style={styles.detailsGrade}>Grade {selectedKanji.grade}</Text>
              )}
              {selectedKanji.jlptLevel && (
                <Text style={styles.detailsJlpt}>JLPT N{selectedKanji.jlptLevel}</Text>
              )}
            </View>
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.detailsSectionTitle}>Meanings</Text>
            <Text style={styles.detailsSectionText}>
              {selectedKanji.meanings.join(', ')}
            </Text>
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.detailsSectionTitle}>On Readings</Text>
            <Text style={styles.detailsSectionText}>
              {selectedKanji.onReadings.join(', ')}
            </Text>
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.detailsSectionTitle}>Kun Readings</Text>
            <Text style={styles.detailsSectionText}>
              {selectedKanji.kunReadings.join(', ')}
            </Text>
          </View>

          {selectedKanji.rtkStory && (
            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>RTK Story</Text>
              <Text style={styles.detailsSectionText}>
                {selectedKanji.rtkStory}
              </Text>
            </View>
          )}

          <View style={styles.detailsSection}>
            <Text style={styles.detailsSectionTitle}>Examples</Text>
            <Text style={styles.detailsSectionText}>
              {selectedKanji.examples.join(', ')}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedKanji(null)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
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
    padding: darkTheme.spacing.md,
  },
  
  // Stats
  statsContainer: {
    backgroundColor: darkTheme.colors.surface,
    padding: darkTheme.spacing.lg,
    borderRadius: darkTheme.borderRadius.lg,
    marginBottom: darkTheme.spacing.lg,
  },
  statsTitle: {
    ...darkTheme.typography.h3,
    color: darkTheme.colors.text,
    marginBottom: darkTheme.spacing.md,
  },
  statsText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    marginBottom: darkTheme.spacing.xs,
  },
  
  // Search
  searchContainer: {
    flexDirection: 'row',
    marginBottom: darkTheme.spacing.lg,
  },
  searchInput: {
    flex: 1,
    backgroundColor: darkTheme.colors.surface,
    borderRadius: darkTheme.borderRadius.md,
    padding: darkTheme.spacing.md,
    color: darkTheme.colors.text,
    marginRight: darkTheme.spacing.md,
  },
  searchButton: {
    backgroundColor: darkTheme.colors.primary,
    borderRadius: darkTheme.borderRadius.md,
    padding: darkTheme.spacing.md,
    justifyContent: 'center',
  },
  searchButtonText: {
    ...darkTheme.typography.button,
    color: darkTheme.colors.text,
  },
  
  // Test Button
  testButton: {
    backgroundColor: darkTheme.colors.accent,
    borderRadius: darkTheme.borderRadius.md,
    padding: darkTheme.spacing.md,
    marginBottom: darkTheme.spacing.lg,
  },
  testButtonText: {
    ...darkTheme.typography.button,
    color: darkTheme.colors.text,
    textAlign: 'center',
  },
  
  // Loading
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: darkTheme.spacing.lg,
  },
  loadingText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    marginLeft: darkTheme.spacing.md,
  },
  
  // Results
  resultsContainer: {
    marginBottom: darkTheme.spacing.xl,
  },
  resultsTitle: {
    ...darkTheme.typography.h3,
    color: darkTheme.colors.text,
    marginBottom: darkTheme.spacing.md,
  },
  kanjiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  kanjiItem: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: darkTheme.borderRadius.md,
    padding: darkTheme.spacing.md,
    width: '30%',
    marginBottom: darkTheme.spacing.md,
    alignItems: 'center',
  },
  kanjiCharacter: {
    ...darkTheme.typography.kanjiMedium,
    color: darkTheme.colors.text,
    marginBottom: darkTheme.spacing.xs,
  },
  kanjiMeaning: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: darkTheme.spacing.xs,
  },
  kanjiGrade: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.primary,
    fontSize: 10,
  },
  
  // Details
  detailsContainer: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.lg,
    marginTop: darkTheme.spacing.lg,
  },
  detailsTitle: {
    ...darkTheme.typography.h3,
    color: darkTheme.colors.text,
    marginBottom: darkTheme.spacing.lg,
    textAlign: 'center',
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: darkTheme.spacing.lg,
  },
  detailsCharacter: {
    ...darkTheme.typography.kanjiLarge,
    color: darkTheme.colors.primary,
    marginRight: darkTheme.spacing.lg,
  },
  detailsInfo: {
    flex: 1,
  },
  detailsStroke: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
  },
  detailsGrade: {
    ...darkTheme.typography.bodySmall,
    color: darkTheme.colors.primary,
  },
  detailsJlpt: {
    ...darkTheme.typography.bodySmall,
    color: darkTheme.colors.accent,
  },
  detailsSection: {
    marginBottom: darkTheme.spacing.lg,
  },
  detailsSectionTitle: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    fontWeight: '600',
    marginBottom: darkTheme.spacing.sm,
  },
  detailsSectionText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    lineHeight: 24,
  },
  closeButton: {
    backgroundColor: darkTheme.colors.primary,
    borderRadius: darkTheme.borderRadius.md,
    padding: darkTheme.spacing.md,
    alignItems: 'center',
  },
  closeButtonText: {
    ...darkTheme.typography.button,
    color: darkTheme.colors.text,
  },
});

export default KanjiTestScreen;
