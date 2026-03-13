import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './screens/LoginScreen';
import TasksScreen from './screens/TasksScreen';
import TaskDetailScreen from './screens/TaskDetailScreen';
import QRScannerScreen from './screens/QRScannerScreen';
import { AuthContext } from './utils/AuthContext';

const Stack = createNativeStackNavigator();

export default function App() {
  const [authState, setAuthState] = useState({
    token: null,
    user: null,
    loading: true,
  });

  useEffect(() => {
    // Перевіряємо збережений токен при запуску
    const loadToken = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        const userJSON = await AsyncStorage.getItem('auth_user');
        if (token && userJSON) {
          setAuthState({
            token,
            user: JSON.parse(userJSON),
            loading: false,
          });
        } else {
          setAuthState({ token: null, user: null, loading: false });
        }
      } catch {
        setAuthState({ token: null, user: null, loading: false });
      }
    };
    loadToken();
  }, []);

  const login = async (token, user) => {
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('auth_user', JSON.stringify(user));
    setAuthState({ token, user, loading: false });
  };

  const logout = async () => {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('auth_user');
    setAuthState({ token: null, user: null, loading: false });
  };

  if (authState.loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      <NavigationContainer>
        <StatusBar style="light" />
        {!authState.token ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
          </Stack.Navigator>
        ) : (
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: '#007bff' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
            }}
          >
            <Stack.Screen
              name="Tasks"
              component={TasksScreen}
              options={{ title: 'Мої завдання' }}
            />
            <Stack.Screen
              name="TaskDetail"
              component={TaskDetailScreen}
              options={{ title: 'Деталі завдання' }}
            />
            <Stack.Screen
              name="QRScanner"
              component={QRScannerScreen}
              options={{ title: 'Сканувати QR-код' }}
            />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});
