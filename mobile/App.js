import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './screens/LoginScreen';
import TasksScreen from './screens/TasksScreen';
import TaskDetailScreen from './screens/TaskDetailScreen';
import QRScannerScreen from './screens/QRScannerScreen';
import SettingsScreen from './screens/SettingsScreen';
import { AuthContext } from './utils/AuthContext';
import { loadServerUrl } from './utils/api';

const Stack = createNativeStackNavigator();

export default function App() {
  const [authState, setAuthState] = useState({
    token: null,
    user: null,
    loading: true,
  });

  useEffect(() => {
    const init = async () => {
      try {
        // Завантажуємо збережений URL сервера + токен паралельно
        const [token, userJSON] = await Promise.all([
          AsyncStorage.getItem('auth_token'),
          AsyncStorage.getItem('auth_user'),
          loadServerUrl(), // ← завантажуємо URL з AsyncStorage
        ]);

        if (token && userJSON) {
          setAuthState({ token, user: JSON.parse(userJSON), loading: false });
        } else {
          setAuthState({ token: null, user: null, loading: false });
        }
      } catch {
        setAuthState({ token: null, user: null, loading: false });
      }
    };
    init();
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
          // ─── Неавторизовані: Login + Settings (для введення URL сервера) ──────
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                headerShown: true,
                title: 'Налаштування сервера',
                headerStyle: { backgroundColor: '#343a40' },
                headerTintColor: '#fff',
              }}
            />
          </Stack.Navigator>
        ) : (
          // ─── Авторизовані: всі екрани техніка ──────────────────────────────────
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
              options={({ navigation }) => ({
                title: 'Мої завдання',
                headerRight: () => (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Settings')}
                    style={{ marginRight: 4 }}
                  >
                    <Text style={{ color: '#fff', fontSize: 22 }}>⚙️</Text>
                  </TouchableOpacity>
                ),
              })}
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
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: 'Налаштування сервера' }}
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
