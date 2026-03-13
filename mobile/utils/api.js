import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// =====================================================================
// НАЛАШТУВАННЯ: змініть IP на адресу вашого сервера у мережі
// Щоб знайти IP: на комп'ютері виконайте "ipconfig" (Windows) або "ip addr" (Linux)
// Приклад: 'http://192.168.1.100:5000'
// =====================================================================
export const SERVER_URL = 'http://192.168.1.100:5000';

const api = axios.create({
  baseURL: SERVER_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Автоматично додаємо токен до кожного запиту
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth
export const loginUser = (login, password) =>
  api.post('/api/auth/login', { login, password });

export const getProfile = () =>
  api.get('/api/users/me');

// Завдання
export const getTasks = () =>
  api.get('/api/tasks');

export const getTaskById = (id) =>
  api.get(`/api/tasks/${id}`);

// Заявки (requests)
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

// QR-коди
export const scanQRCode = (qrData) =>
  api.post('/api/qr/scan', { qrData });

export const getQRCodes = () =>
  api.get('/api/qr/codes');

// Ліфти
export const getLiftById = (id) =>
  api.get(`/api/lifts/${id}`);

export default api;
