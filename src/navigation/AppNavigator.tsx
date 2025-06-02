import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, TouchableOpacity, Text } from 'react-native';
import type { RootStackParamList } from '@/types/navigation';
import HomeScreen from '../screens/HomeScreen';
import KanjiExplorerScreen from '../screens/KanjiExplorerScreen';
import KanjiDetailScreen from '../screens/KanjiDetailScreen';
import ReadingScreen from '../screens/ReadingScreen';
import ImageAnalysisScreen from '../screens/ImageAnalysisScreen';
import { darkTheme } from '../styles/theme';

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <StatusBar
        barStyle="light-content"
        backgroundColor={darkTheme.colors.background}
        translucent={false}
      />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: darkTheme.colors.surface,
            borderBottomColor: darkTheme.colors.border,
            borderBottomWidth: 1,
          },
          headerTintColor: darkTheme.colors.text,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
          cardStyle: {
            backgroundColor: darkTheme.colors.background,
          },
          gestureEnabled: true,
          headerBackTitleVisible: false,
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Kanji Reader',
            headerStyle: {
              backgroundColor: darkTheme.colors.background,
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 0,
            },
          }}
        />
        <Stack.Screen
          name="Reading"
          component={ReadingScreen}
          options={({ route }) => ({
            title: route.params?.bookTitle || 'Reading',
            headerShown: false, // Full screen reading experience
          })}
        />
        <Stack.Screen
          name="KanjiExplorer"
          component={KanjiExplorerScreen}
          options={{
            title: 'Kanji Explorer',
            headerStyle: {
              backgroundColor: darkTheme.colors.surface,
              elevation: 2,
              shadowOpacity: 0.1,
            },
            headerRight: () => (
              <TouchableOpacity
                style={{
                  marginRight: 16,
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: darkTheme.colors.primary,
                }}
                onPress={() => {
                  // Future: Add quick actions like "Show only new kanji"
                }}
              >
                <Text style={{
                  color: darkTheme.colors.text,
                  fontSize: 12,
                  fontWeight: '600'
                }}>
                  学
                </Text>
              </TouchableOpacity>
            ),
          }}
        />
        <Stack.Screen
          name="KanjiDetail"
          component={KanjiDetailScreen}
          options={({ route }) => ({
            title: `Kanji: ${route.params?.character || ''}`,
            headerStyle: {
              backgroundColor: darkTheme.colors.surface,
              elevation: 2,
              shadowOpacity: 0.1,
            },
          })}
        />
        <Stack.Screen 
            name="ImageAnalysis" 
            component={ImageAnalysisScreen} 
            options={{ 
                title: 'Image Analysis',
                headerStyle: { backgroundColor: darkTheme.colors.surface },
                headerTintColor: darkTheme.colors.text,
            }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
