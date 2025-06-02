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
import { kanjiDatabaseService, KanjiEntry } from '../services/KanjiDatabaseService';
import { darkTheme } from '../styles/theme';
import type { KanjiExplorerScreenProps } from '../types/navigation';

const KanjiExplorerScreen: React.FC<KanjiExplorerScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KanjiEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [filterType, setFilterType] = useState<'all' | 'jlpt' | 'frequency'>('all');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      console.log('Loading initial kanji data...');

      // Check if database is ready
      if (!kanjiDatabaseService) {
        throw new Error('Kanji database service not available');
      }

      // Get database stats
      const dbStats = await kanjiDatabaseService.getDatabaseStats();
      console.log('Database stats loaded:', dbStats);
      setStats(dbStats);

      // Load ALL kanji by default (not just 20)
      const result = await kanjiDatabaseService.getAllKanji();
      console.log('All kanji loaded:', result.length);
      setSearchResults(result);

    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert(
        'Database Error', 
        'Failed to load kanji data. Please make sure the database is properly initialized.\n\nError: ' + (error as Error).message,
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadInitialData();
      return;
    }

    setLoading(true);
    try {
      const result = await kanjiDatabaseService.searchKanji({
        query: searchQuery,
        limit: 50,
      });
      setSearchResults(result.kanji);
      console.log(`Search for "${searchQuery}" found ${result.kanji.length} results`);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKanjiSelect = (character: string) => {
    // Navigate to dedicated KanjiDetail screen
    // fromReading = false since this is from explorer, not reading a book
    navigation.navigate('KanjiDetail', { 
      character, 
      fromReading: false 
    });
  };

  const testSpecificKanji = async () => {
    const testCharacters = ['日', '本', '人', '学', '語', '今', '時', '見', '行', '来'];
    try {
      const kanji = await kanjiDatabaseService.getMultipleKanji(testCharacters);
      setSearchResults(kanji);
      Alert.alert('Test Complete', `Found ${kanji.length} of ${testCharacters.length} test kanji`);
    } catch (error) {
      console.error('Test error:', error);
      Alert.alert('Error', 'Test failed');
    }
  };

  const filterByJLPT = async (level: number) => {
    setLoading(true);
    try {
      const kanji = await kanjiDatabaseService.getKanjiByJLPTLevel(level);
      setSearchResults(kanji);
      setFilterType('jlpt');
      console.log(`JLPT N${level} filter: ${kanji.length} kanji`);
    } catch (error) {
      console.error('JLPT filter error:', error);
      Alert.alert('Error', 'Filter failed');
    } finally {
      setLoading(false);
    }
  };

  const filterByFrequency = async (frequency: string) => {
    setLoading(true);
    try {
      const kanji = await kanjiDatabaseService.getKanjiByFrequency(frequency);
      setSearchResults(kanji);
      setFilterType('frequency');
      console.log(`Frequency "${frequency}" filter: ${kanji.length} kanji`);
    } catch (error) {
      console.error('Frequency filter error:', error);
      Alert.alert('Error', 'Filter failed');
    } finally {
      setLoading(false);
    }
  };

  const showAllKanji = async () => {
    setLoading(true);
    try {
      const kanji = await kanjiDatabaseService.getAllKanji();
      setSearchResults(kanji);
      setFilterType('all');
      console.log(`All kanji loaded: ${kanji.length}`);
    } catch (error) {
      console.error('Error loading all kanji:', error);
      Alert.alert('Error', 'Failed to load all kanji');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Database Stats */}
      {stats && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Kanji Knowledge Bank</Text>
          <Text style={styles.statsText}>Total Kanji: {stats.totalKanji}</Text>
          <Text style={styles.statsText}>Version: {stats.databaseVersion}</Text>
          <Text style={styles.statsText}>Storage: {stats.size}</Text>
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

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity style={styles.filterButton} onPress={showAllKanji}>
            <Text style={styles.filterButtonText}>All</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.filterButton} onPress={() => filterByJLPT(5)}>
            <Text style={styles.filterButtonText}>JLPT N5</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.filterButton} onPress={() => filterByFrequency('very common')}>
            <Text style={styles.filterButtonText}>Very Common</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.filterButton} onPress={() => filterByFrequency('common')}>
            <Text style={styles.filterButtonText}>Common</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={testSpecificKanji}>
            <Text style={styles.testButtonText}>Test Core Kanji</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={darkTheme.colors.primary} />
          <Text style={styles.loadingText}>Loading kanji...</Text>
        </View>
      )}

      {/* Search Results */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>
          Kanji ({searchResults.length})
        </Text>
        
        <View style={styles.kanjiGrid}>
          {searchResults.map((kanji) => (
            <TouchableOpacity
              key={kanji.id}
              style={[
                styles.kanjiItem,
                kanji.timesSeen && kanji.timesSeen > 0 && styles.kanjiItemSeen
              ]}
              onPress={() => handleKanjiSelect(kanji.character)}
            >
              <Text style={styles.kanjiCharacter}>{kanji.character}</Text>
              <Text style={styles.kanjiMeaning} numberOfLines={1}>
                {kanji.meanings[0]}
              </Text>
              <View style={styles.kanjiMeta}>
                <Text style={styles.kanjiStroke}>
                  {kanji.strokeCount}画
                </Text>
                {kanji.timesSeen !== undefined && kanji.timesSeen > 0 && (
                  <Text style={styles.kanjiTimesSeen}>
                    見た: {kanji.timesSeen}
                  </Text>
                )}
              </View>
              {kanji.jlptLevel && (
                <Text style={styles.kanjiJlpt}>N{kanji.jlptLevel}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
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
    marginBottom: darkTheme.spacing.md,
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

  // Filters
  filterContainer: {
    marginBottom: darkTheme.spacing.lg,
  },
  filterButton: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: darkTheme.borderRadius.md,
    padding: darkTheme.spacing.sm,
    marginRight: darkTheme.spacing.sm,
  },
  filterButtonText: {
    ...darkTheme.typography.bodySmall,
    color: darkTheme.colors.text,
  },
  
  // Test Button
  testButton: {
    backgroundColor: darkTheme.colors.accent,
    borderRadius: darkTheme.borderRadius.md,
    padding: darkTheme.spacing.sm,
    marginRight: darkTheme.spacing.sm,
  },
  testButtonText: {
    ...darkTheme.typography.bodySmall,
    color: darkTheme.colors.text,
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
    width: '48%',
    marginBottom: darkTheme.spacing.md,
    alignItems: 'center',
  },
  kanjiItemSeen: {
    borderWidth: 2,
    borderColor: darkTheme.colors.primary,
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
  kanjiMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: darkTheme.spacing.xs,
  },
  kanjiStroke: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textTertiary,
    fontSize: 10,
  },
  kanjiTimesSeen: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.primary,
    fontSize: 10,
  },
  kanjiJlpt: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.accent,
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
  detailsJlpt: {
    ...darkTheme.typography.bodySmall,
    color: darkTheme.colors.accent,
  },
  detailsFrequency: {
    ...darkTheme.typography.bodySmall,
    color: darkTheme.colors.textSecondary,
  },
  detailsTimesSeen: {
    ...darkTheme.typography.bodySmall,
    color: darkTheme.colors.primary,
    fontWeight: '600',
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

export default KanjiExplorerScreen;
