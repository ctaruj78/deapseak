import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// =====================================================================
// SERVER URL CONFIG
// Пріоритет: AsyncStorage (налаштовано в додатку) → дефолт
// В production: встановити URL один раз в Settings екрані додатку
// =====================================================================
export const DEFAULT_SERVER_URL = 'https://festlift.pt'; // production domain
export const SERVER_URL_KEY = 'server_url';

let _serverUrl = DEFAULT_SERVER_URL;

// Завантажити збережений URL при старті додатку
export const loadServerUrl = async () => {
  try {
    const saved = await AsyncStorage.getItem(SERVER_URL_KEY);
    if (saved && saved.startsWith('http')) {
      _serverUrl = saved;
    }
  } catch {}
  return _serverUrl;
};

export const getServerUrl = () => _serverUrl;

export const setServerUrl = async (url) => {
  const clean = url.replace(/\/$/, ''); // прибираємо завершальний /
  _serverUrl = clean;
  await AsyncStorage.setItem(SERVER_URL_KEY, clean);
  api.defaults.baseURL = clean; // оновлюємо axios одразу
};

const api = axios.create({
  baseURL: _serverUrl,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// Автоматично додаємо JWT токен до кожного запиту
api.interceptors.request.use(
  async (config) => {
    config.baseURL = _serverUrl; // завжди актуальний URL
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 401 → автоматично виходимо з системи
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('auth_user');
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────
export const loginUser = (login, password) =>
  api.post('/api/auth/login', { login, password });

export const getProfile = () =>
  api.get('/api/auth/profile');

// ─── Заявки ───────────────────────────────────────────────────────────
export const getRequests = (params) =>
  api.get('/api/requests', { params });

export const getRequestById = (id) =>
  api.get(`/api/requests/${id}`);

export const updateRequestStatus = (id, status) =>
  api.patch(`/api/requests/${id}/status`, { status });

export const addComment = (id, text) =>
  api.post(`/api/requests/${id}/comment`, { text });

export const completeRequest = (id, workDetails) =>
  api.post(`/api/requests/${id}/complete`, workDetails);

// ─── Завдання ─────────────────────────────────────────────────────────
export const getTasks = () =>
  api.get('/api/tasks');

export const getTaskById = (id) =>
  api.get(`/api/tasks/${id}`);

// ─── QR ───────────────────────────────────────────────────────────────
export const scanQRCode = (qrData) =>
  api.post('/api/qr/scan', { qrCode: qrData });

export const getQRCodes = () =>
  api.get('/api/qr/codes');

// ─── Ліфти ────────────────────────────────────────────────────────────
export const getLiftById = (id) =>
  api.get(`/api/lifts/${id}`);

export const getLiftBySerial = (serial) =>
  api.get(`/api/lifts/serial/${serial}`);

export default api;
