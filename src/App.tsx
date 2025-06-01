// App.tsx - Updated with Database Initialization
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { useDatabase } from './src/hooks/useDatabase';
import { darkTheme } from './src/styles/theme';

export default function App() {
  const { isLoading, isReady, error, stats, retryInitialization } = useDatabase();

  console.log('App render - Database state:', {isLoading, isReady, error});
  // Show loading screen while database initializes
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={darkTheme.colors.primary} />
        <Text style={styles.loadingText}>Initializing Kanji Database...</Text>
        <Text style={styles.loadingSubtext}>Setting up your learning environment</Text>
      </View>
    );
  }

  // Show error screen if database fails to initialize
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Database Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={retryInitialization}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show success info briefly then load main app
  if (isReady && stats) {
    return (
      <View style={{ flex: 1 }}>
        {/* Database ready - show main app */}
        <AppNavigator />
        
        {/* Optional: Show database stats in development */}
        {__DEV__ && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>
              DB: {stats.totalKanji} kanji, {stats.totalRadicals} radicals (v{stats.databaseVersion})
            </Text>
          </View>
        )}
      </View>
    );
  }

  // Fallback
  return (
    <View style={styles.loadingContainer}>
      <Text style={styles.errorText}>Something went wrong</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.background,
    padding: darkTheme.spacing.xl,
  },
  loadingText: {
    ...darkTheme.typography.h3,
    color: darkTheme.colors.text,
    marginTop: darkTheme.spacing.lg,
    textAlign: 'center',
  },
  loadingSubtext: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    marginTop: darkTheme.spacing.sm,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.background,
    padding: darkTheme.spacing.xl,
  },
  errorTitle: {
    ...darkTheme.typography.h2,
    color: darkTheme.colors.error,
    marginBottom: darkTheme.spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: darkTheme.spacing.xl,
    lineHeight: 24,
  },
  errorText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.error,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: darkTheme.colors.primary,
    paddingHorizontal: darkTheme.spacing.xl,
    paddingVertical: darkTheme.spacing.md,
    borderRadius: darkTheme.borderRadius.lg,
  },
  retryButtonText: {
    ...darkTheme.typography.button,
    color: darkTheme.colors.text,
  },
  debugInfo: {
    position: 'absolute',
    bottom: 50,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: darkTheme.spacing.sm,
    borderRadius: darkTheme.borderRadius.sm,
  },
  debugText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.text,
    textAlign: 'center',
  },
});
