import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { getServerUrl, setServerUrl, DEFAULT_SERVER_URL } from '../utils/api';

/**
 * SettingsScreen — налаштування URL сервера
 * Дозволяє технікам вказати адресу сервера без перебудови додатку
 */
export default function SettingsScreen({ navigation }) {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [lastTestResult, setLastTestResult] = useState(null);

  useEffect(() => {
    setUrl(getServerUrl());
  }, []);

  const handleSave = async () => {
    const trimmed = url.trim();
    if (!trimmed.startsWith('http')) {
      Alert.alert('Помилка', 'URL повинен починатися з http:// або https://');
      return;
    }
    await setServerUrl(trimmed);
    Alert.alert('Збережено', `Сервер: ${trimmed}`, [
      { text: 'OK', onPress: () => navigation?.goBack() },
    ]);
  };

  const handleTest = async () => {
    const trimmed = url.trim();
    if (!trimmed.startsWith('http')) {
      Alert.alert('Помилка', 'Введіть коректний URL');
      return;
    }
    setTesting(true);
    setLastTestResult(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const resp = await fetch(`${trimmed}/api/health`, { signal: controller.signal });
      clearTimeout(timeout);
      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setLastTestResult({ ok: true, msg: `✅ Сервер доступний! ${data.message || ''}` });
      } else {
        setLastTestResult({ ok: false, msg: `⚠️ Сервер відповів: HTTP ${resp.status}` });
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        setLastTestResult({ ok: false, msg: '❌ Таймаут — сервер не відповідає (8 сек)' });
      } else {
        setLastTestResult({ ok: false, msg: `❌ Не вдалося підключитися:\n${e.message}` });
      }
    } finally {
      setTesting(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Скинути налаштування',
      `Повернути до production URL?\n${DEFAULT_SERVER_URL}`,
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Скинути',
          onPress: () => {
            setUrl(DEFAULT_SERVER_URL);
            setLastTestResult(null);
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>

        {/* Заголовок */}
        <View style={styles.header}>
          <Text style={styles.title}>⚙️ Налаштування сервера</Text>
          <Text style={styles.subtitle}>
            Введіть адресу вашого сервера FestLift
          </Text>
        </View>

        {/* URL Input */}
        <View style={styles.section}>
          <Text style={styles.label}>URL сервера</Text>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={(t) => { setUrl(t); setLastTestResult(null); }}
            placeholder="https://festlift.pt"
            placeholderTextColor="#adb5bd"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Text style={styles.hint}>
            Приклади:{'\n'}
            • Production: https://festlift.pt{'\n'}
            • Локальна мережа: http://192.168.1.100:5000{'\n'}
            • Тест (ngrok): https://abc123.ngrok.io
          </Text>
        </View>

        {/* Результат тесту */}
        {lastTestResult && (
          <View style={[
            styles.testResult,
            { backgroundColor: lastTestResult.ok ? '#d4edda' : '#f8d7da' }
          ]}>
            <Text style={{ color: lastTestResult.ok ? '#155724' : '#721c24', fontSize: 14 }}>
              {lastTestResult.msg}
            </Text>
          </View>
        )}

        {/* Кнопки */}
        <TouchableOpacity
          style={[styles.btn, styles.btnTest]}
          onPress={handleTest}
          disabled={testing}
        >
          {testing
            ? <ActivityIndicator color="#007bff" />
            : <Text style={[styles.btnText, { color: '#007bff' }]}>🔌 Перевірити підключення</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleSave}>
          <Text style={styles.btnText}>💾 Зберегти</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.btnReset]} onPress={handleReset}>
          <Text style={[styles.btnText, { color: '#6c757d' }]}>↺ Повернути до production</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20 },
  header: { marginBottom: 24, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#212529', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6c757d', textAlign: 'center' },
  section: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#495057', marginBottom: 8 },
  input: {
    borderWidth: 1.5,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#fff',
    color: '#212529',
  },
  hint: { fontSize: 12, color: '#868e96', marginTop: 8, lineHeight: 18 },
  testResult: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  btn: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnTest: { backgroundColor: '#e7f3ff', borderWidth: 1.5, borderColor: '#007bff' },
  btnSave: { backgroundColor: '#007bff' },
  btnReset: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dee2e6' },
  btnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
