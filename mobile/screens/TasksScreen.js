import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { AuthContext } from '../utils/AuthContext';
import { getTasks, getRequests } from '../utils/api';
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, formatDateOnly } from '../utils/helpers';

export default function TasksScreen({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const FILTERS = [
    { key: 'all', label: 'Всі' },
    { key: 'new', label: 'Нові' },
    { key: 'in-progress', label: 'В роботі' },
    { key: 'completed', label: 'Виконані' },
  ];

  const fetchTasks = useCallback(async () => {
    try {
      // Завантажуємо і tasks, і requests (заявки призначені техніку)
      const [tasksRes, requestsRes] = await Promise.allSettled([
        getTasks(),
        getRequests(),
      ]);

      const taskData = tasksRes.status === 'fulfilled'
        ? (tasksRes.value.data?.data || [])
        : [];
      const requestData = requestsRes.status === 'fulfilled'
        ? (requestsRes.value.data?.data || [])
        : [];

      // Об'єднуємо і позначаємо тип
      const allItems = [
        ...taskData.map((t) => ({ ...t, _type: 'task' })),
        ...requestData.map((r) => ({ ...r, _type: 'request' })),
      ];

      // Сортуємо: спочатку нові/термінові, потім за датою
      allItems.sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        const pa = priorityOrder[a.priority] ?? 2;
        const pb = priorityOrder[b.priority] ?? 2;
        if (pa !== pb) return pa - pb;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });

      setTasks(allItems);
    } catch (error) {
      if (error.response?.status === 401) {
        Alert.alert('Сесія закінчилася', 'Будь ласка, увійдіть знову', [
          { text: 'OK', onPress: logout },
        ]);
      } else {
        Alert.alert('Помилка', 'Не вдалося завантажити завдання');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [logout]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Фокус на задачах при поверненні
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchTasks);
    return unsubscribe;
  }, [navigation, fetchTasks]);

  // Фільтрація та пошук
  useEffect(() => {
    let result = [...tasks];

    if (activeFilter !== 'all') {
      result = result.filter((item) => item.status === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.liftAddress?.toLowerCase().includes(q) ||
          item.requestNumber?.toLowerCase().includes(q)
      );
    }

    setFilteredTasks(result);
  }, [tasks, activeFilter, searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const renderTaskItem = ({ item }) => {
    const statusColor = STATUS_COLORS[item.status] || '#95a5a6';
    const priorityColor = PRIORITY_COLORS[item.priority] || '#95a5a6';
    const statusLabel = STATUS_LABELS[item.status] || item.status || 'Невідомо';
    const priorityLabel = PRIORITY_LABELS[item.priority] || '';

    return (
      <TouchableOpacity
        style={styles.taskCard}
        onPress={() => navigation.navigate('TaskDetail', { item })}
        activeOpacity={0.7}
      >
        {/* Тип та номер */}
        <View style={styles.cardHeader}>
          <View style={styles.typeTag}>
            <Text style={styles.typeTagText}>
              {item._type === 'task' ? '📋 Завдання' : '🔧 Заявка'}
            </Text>
          </View>
          {item.requestNumber && (
            <Text style={styles.requestNumber}>{item.requestNumber}</Text>
          )}
        </View>

        {/* Назва */}
        <Text style={styles.taskTitle} numberOfLines={2}>
          {item.title || item.description || 'Без назви'}
        </Text>

        {/* Адреса */}
        {(item.liftAddress || item.address) && (
          <Text style={styles.taskAddress} numberOfLines={1}>
            📍 {item.liftAddress || item.address}
          </Text>
        )}

        {/* Нижня частина: статус + пріоритет + дата */}
        <View style={styles.cardFooter}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>

          {item.priority && (
            <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
              <Text style={[styles.priorityText, { color: priorityColor }]}>
                {priorityLabel}
              </Text>
            </View>
          )}

          <Text style={styles.dateText}>
            {formatDateOnly(item.dueDate || item.scheduledDate || item.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={styles.emptyText}>Немає завдань</Text>
      <Text style={styles.emptySubtext}>
        {searchQuery ? 'Спробуйте інший пошуковий запит' : 'Потягніть вниз для оновлення'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Завантаження завдань...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Привітання */}
      <View style={styles.greetingBar}>
        <View>
          <Text style={styles.greetingText}>
            Привіт, {user?.firstName || user?.username || 'Технік'}! 👋
          </Text>
          <Text style={styles.greetingSubtext}>
            {filteredTasks.length} завдань сьогодні
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.qrButton}
            onPress={() => navigation.navigate('QRScanner')}
          >
            <Text style={styles.qrButtonText}>QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutIcon}>⏻</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Пошук */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Пошук завдань..."
          placeholderTextColor="#aaa"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Фільтри */}
      <View style={styles.filtersRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, activeFilter === f.key && styles.filterTabActive]}
            onPress={() => setActiveFilter(f.key)}
          >
            <Text style={[styles.filterTabText, activeFilter === f.key && styles.filterTabTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Список завдань */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => String(item._id)}
        renderItem={renderTaskItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007bff']} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4ff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 15,
  },
  greetingBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 18,
  },
  greetingText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  greetingSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qrButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  qrButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  logoutIcon: {
    fontSize: 16,
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e6ff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  filterTabActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  filterTabText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeTag: {
    backgroundColor: '#e8f0fe',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeTagText: {
    fontSize: 11,
    color: '#1a73e8',
    fontWeight: '600',
  },
  requestNumber: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
    lineHeight: 21,
    marginBottom: 6,
  },
  taskAddress: {
    fontSize: 13,
    color: '#555',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusBadge: {
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  priorityBadge: {
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 11,
    color: '#888',
    marginLeft: 'auto',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#555',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
});
