import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'react-native';
import type { RootStackParamList } from '@/types/navigation';
import HomeScreen from '../screens/HomeScreen';
import KanjiTestScreen from '../screens/KanjiTestScreen'
import ReadingScreen from '../screens/ReadingScreen';
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
            name="KanjiTest"
            component={KanjiTestScreen}
            options={{ title: 'Kanji Database Test' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
