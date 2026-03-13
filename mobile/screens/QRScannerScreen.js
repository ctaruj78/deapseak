import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AuthContext } from '../utils/AuthContext';
import { scanQRCode, getLiftById } from '../utils/api';

export default function QRScannerScreen({ navigation }) {
  const { logout } = useContext(AuthContext);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [liftInfo, setLiftInfo] = useState(null);

  const handleBarcodeScanned = async ({ type, data }) => {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);

    try {
      // Відправляємо QR дані на сервер
      const response = await scanQRCode(data);
      const scanResult = response.data?.data;

      if (scanResult?.liftId) {
        // Отримуємо деталі ліфта
        const liftRes = await getLiftById(scanResult.liftId);
        const lift = liftRes.data?.data;
        if (lift) {
          setLiftInfo(lift);
          return;
        }
      }

      // Якщо QR просто містить ID або URL
      Alert.alert(
        '🔍 QR-код відсканований',
        `Дані: ${data.slice(0, 100)}${data.length > 100 ? '...' : ''}`,
        [
          { text: 'Скасувати', style: 'cancel', onPress: () => setScanned(false) },
          {
            text: 'Переглянути',
            onPress: () => {
              setScanned(false);
            },
          },
        ]
      );
    } catch (error) {
      if (error.response?.status === 401) {
        Alert.alert('Сесія закінчилася', 'Будь ласка, увійдіть знову', [
          { text: 'OK', onPress: logout },
        ]);
      } else if (error.response?.status === 404) {
        Alert.alert(
          '❓ Ліфт не знайдено',
          'QR-код не відповідає жодному ліфту в системі',
          [{ text: 'OK', onPress: () => setScanned(false) }]
        );
      } else {
        // Якщо сервер недоступний — показуємо дані з QR
        Alert.alert(
          'QR-код відсканований',
          `Вміст: ${data.slice(0, 150)}`,
          [{ text: 'OK', onPress: () => setScanned(false) }]
        );
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleLiftSelect = (lift) => {
    setLiftInfo(null);
    setScanned(false);
    // Переходимо до завдань і шукаємо пов'язані з цим ліфтом
    navigation.navigate('Tasks', { liftId: lift._id, liftAddress: lift.address });
    Alert.alert(
      '✅ Ліфт знайдено',
      `Адреса: ${typeof lift.address === 'object'
        ? [lift.address.street, lift.address.city].filter(Boolean).join(', ')
        : lift.address || 'Невідома'
      }\nМун. №: ${lift.municipalNumber || 'Не вказано'}`
    );
  };

  // Дозвіл на камеру не запрошено
  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  // Дозвіл відхилено
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionTitle}>Потрібен доступ до камери</Text>
        <Text style={styles.permissionText}>
          Для сканування QR-кодів ліфтів додаток потребує доступу до камери.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Надати дозвіл</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Показуємо деталі ліфта після сканування
  if (liftInfo) {
    const addr = liftInfo.address;
    const addressStr = typeof addr === 'object'
      ? [addr.street, addr.city, addr.country].filter(Boolean).join(', ')
      : (addr || 'Невідома адреса');

    return (
      <ScrollView style={styles.liftInfoContainer}>
        <View style={styles.liftInfoCard}>
          <Text style={styles.liftInfoTitle}>🏗️ Ліфт знайдено!</Text>

          <View style={styles.liftInfoRow}>
            <Text style={styles.liftInfoLabel}>Адреса</Text>
            <Text style={styles.liftInfoValue}>{addressStr}</Text>
          </View>

          {liftInfo.municipalNumber && (
            <View style={styles.liftInfoRow}>
              <Text style={styles.liftInfoLabel}>Муніципальний №</Text>
              <Text style={styles.liftInfoValue}>{liftInfo.municipalNumber}</Text>
            </View>
          )}

          {liftInfo.client && (
            <View style={styles.liftInfoRow}>
              <Text style={styles.liftInfoLabel}>Клієнт</Text>
              <Text style={styles.liftInfoValue}>{liftInfo.client}</Text>
            </View>
          )}

          {liftInfo.liftType && (
            <View style={styles.liftInfoRow}>
              <Text style={styles.liftInfoLabel}>Тип ліфта</Text>
              <Text style={styles.liftInfoValue}>{liftInfo.liftType}</Text>
            </View>
          )}

          {liftInfo.status && (
            <View style={styles.liftInfoRow}>
              <Text style={styles.liftInfoLabel}>Статус</Text>
              <Text style={[styles.liftInfoValue, { color: liftInfo.status === 'active' ? '#27ae60' : '#e74c3c' }]}>
                {liftInfo.status === 'active' ? '✅ Активний' :
                 liftInfo.status === 'maintenance' ? '🔧 На обслуговуванні' :
                 liftInfo.status === 'inactive' ? '⛔ Неактивний' : liftInfo.status}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.viewTasksButton}
            onPress={() => handleLiftSelect(liftInfo)}
          >
            <Text style={styles.viewTasksButtonText}>📋 Показати пов'язані завдання</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.scanAgainButton}
            onPress={() => { setLiftInfo(null); setScanned(false); }}
          >
            <Text style={styles.scanAgainButtonText}>🔄 Сканувати інший</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'pdf417', 'code128', 'code39', 'ean13'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      >
        {/* Затемнення по краях */}
        <View style={styles.overlay}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            {/* Рамка сканера */}
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              {processing && (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.processingText}>Обробка...</Text>
                </View>
              )}
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom}>
            <Text style={styles.instructionText}>
              {scanned && !processing
                ? 'Готово!'
                : 'Наведіть камеру на QR-код ліфта'}
            </Text>
            {scanned && !processing && (
              <TouchableOpacity
                style={styles.rescanButton}
                onPress={() => setScanned(false)}
              >
                <Text style={styles.rescanButtonText}>🔄 Сканувати знову</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const FRAME_SIZE = 250;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  camera: { flex: 1 },
  overlay: { flex: 1 },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: FRAME_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#007bff',
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    paddingTop: 24,
    gap: 12,
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  rescanButton: {
    backgroundColor: '#007bff',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  rescanButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  // Екран дозволів
  permissionContainer: {
    flex: 1,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionIcon: { fontSize: 56, marginBottom: 16 },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#007bff',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: '#007bff',
    fontWeight: '600',
    fontSize: 15,
  },
  // Деталі ліфта
  liftInfoContainer: {
    flex: 1,
    backgroundColor: '#f0f4ff',
  },
  liftInfoCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  liftInfoTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a237e',
    marginBottom: 20,
    textAlign: 'center',
  },
  liftInfoRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  liftInfoLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  liftInfoValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  viewTasksButton: {
    backgroundColor: '#007bff',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  viewTasksButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  scanAgainButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  scanAgainButtonText: {
    color: '#555',
    fontWeight: '600',
    fontSize: 15,
  },
});
