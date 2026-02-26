// App.js - Root of the IndieMatch RN app
// Sets up navigation (Stack), gesture handler, safe area, and asset initialization.

import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import FeedScreen from './src/screens/FeedScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { ensurePlayablesReady } from './src/utils/assetHelper';

const Stack = createNativeStackNavigator();

export default function App() {
  const [assetsReady, setAssetsReady] = useState(false);
  const [error, setError] = useState(null);

  // Copy playable assets to document directory on first launch
  useEffect(() => {
    ensurePlayablesReady()
      .then(() => setAssetsReady(true))
      .catch((e) => {
        console.error('[App] Asset init error:', e);
        setError(e.message);
        // Still allow the app to continue — WebViews will just fail to load
        setAssetsReady(true);
      });
  }, []);

  if (!assetsReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#fe2c55" />
        <Text style={styles.loadingText}>Loading IndieMatch…</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              // Enables the native swipe-back gesture (right-swipe on iOS)
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="Feed" component={FeedScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
  },
});
