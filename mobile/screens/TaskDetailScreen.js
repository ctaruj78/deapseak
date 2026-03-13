import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { AuthContext } from '../utils/AuthContext';
import { updateRequestStatus, addComment, completeRequest, getRequestById, getTaskById } from '../utils/api';
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, formatDate } from '../utils/helpers';

const AVAILABLE_STATUSES = [
  { key: 'new', label: 'Нова' },
  { key: 'in-progress', label: 'В роботі' },
  { key: 'completed', label: 'Виконано' },
  { key: 'cancelled', label: 'Скасовано' },
];

export default function TaskDetailScreen({ route, navigation }) {
  const { item: initialItem } = route.params;
  const { logout } = useContext(AuthContext);

  const [item, setItem] = useState(initialItem);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [workDescription, setWorkDescription] = useState('');
  const [workDuration, setWorkDuration] = useState('');

  useEffect(() => {
    navigation.setOptions({
      title: item.requestNumber || item.title || 'Деталі',
    });
  }, [item, navigation]);

  const refreshItem = async () => {
    try {
      const isRequest = item._type === 'request';
      const res = isRequest
        ? await getRequestById(item._id)
        : await getTaskById(item._id);
      if (res.data?.data) {
        setItem({ ...res.data.data, _type: item._type });
      }
    } catch {
      // тихо ігноруємо помилку оновлення
    }
  };

  const handleChangeStatus = async (newStatus) => {
    setStatusModalVisible(false);
    if (newStatus === item.status) return;

    if (newStatus === 'completed') {
      setCompleteModalVisible(true);
      return;
    }

    setLoading(true);
    try {
      await updateRequestStatus(item._id, newStatus);
      setItem((prev) => ({ ...prev, status: newStatus }));
      Alert.alert('✅ Успішно', `Статус змінено на "${STATUS_LABELS[newStatus]}"`);
    } catch (error) {
      if (error.response?.status === 401) {
        Alert.alert('Сесія закінчилася', 'Будь ласка, увійдіть знову', [
          { text: 'OK', onPress: logout },
        ]);
      } else {
        Alert.alert('Помилка', error.response?.data?.message || 'Не вдалося змінити статус');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!workDescription.trim()) {
      Alert.alert('Помилка', 'Опишіть виконану роботу');
      return;
    }
    setCompleteModalVisible(false);
    setLoading(true);
    try {
      await completeRequest(item._id, {
        workDescription: workDescription.trim(),
        workDuration: workDuration ? parseFloat(workDuration) : undefined,
      });
      setItem((prev) => ({ ...prev, status: 'completed' }));
      setWorkDescription('');
      setWorkDuration('');
      Alert.alert('✅ Завдання завершено', 'Дякуємо за роботу!');
    } catch (error) {
      if (error.response?.status === 401) {
        Alert.alert('Сесія закінчилася', 'Будь ласка, увійдіть знову', [
          { text: 'OK', onPress: logout },
        ]);
      } else {
        Alert.alert('Помилка', error.response?.data?.message || 'Не вдалося завершити завдання');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setAddingComment(true);
    try {
      await addComment(item._id, commentText.trim());
      setCommentText('');
      await refreshItem();
      Alert.alert('✅ Коментар додано');
    } catch (error) {
      Alert.alert('Помилка', error.response?.data?.message || 'Не вдалося додати коментар');
    } finally {
      setAddingComment(false);
    }
  };

  const statusColor = STATUS_COLORS[item.status] || '#95a5a6';
  const priorityColor = PRIORITY_COLORS[item.priority] || '#95a5a6';

  const InfoRow = ({ icon, label, value }) => {
    if (!value) return null;
    return (
      <View style={styles.infoRow}>
        <Text style={styles.infoIcon}>{icon}</Text>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Статус + пріоритет */}
        <View style={styles.statusBar}>
          <View style={[styles.statusBadgeLarge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
            <Text style={[styles.statusTextLarge, { color: statusColor }]}>
              {STATUS_LABELS[item.status] || item.status || 'Невідомо'}
            </Text>
          </View>
          {item.priority && (
            <View style={[styles.priorityBadgeLarge, { backgroundColor: priorityColor + '20' }]}>
              <Text style={[styles.priorityTextLarge, { color: priorityColor }]}>
                ⚡ {PRIORITY_LABELS[item.priority] || item.priority}
              </Text>
            </View>
          )}
        </View>

        {/* Назва */}
        <View style={styles.section}>
          <Text style={styles.titleText}>
            {item.title || item.description || 'Без назви'}
          </Text>
          {item.requestNumber && (
            <Text style={styles.requestNo}>#{item.requestNumber}</Text>
          )}
        </View>

        {/* Деталі */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Деталі</Text>
          <InfoRow icon="📍" label="Адреса ліфта" value={item.liftAddress || item.address} />
          <InfoRow icon="🏢" label="Клієнт" value={item.liftClient || item.client} />
          <InfoRow icon="🔢" label="Муніципальний №" value={item.liftMunicipalNumber} />
          <InfoRow icon="👤" label="Призначено" value={item.assignedTechName || item.assignedTo} />
          <InfoRow icon="📅" label="Дата створення" value={formatDate(item.createdAt)} />
          <InfoRow icon="⏰" label="Термін виконання" value={formatDate(item.dueDate || item.scheduledDate)} />
          <InfoRow icon="✏️" label="Створив" value={item.createdBy} />
        </View>

        {/* Опис проблеми */}
        {(item.description || item.problem) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔍 Опис проблеми</Text>
            <Text style={styles.descriptionText}>{item.description || item.problem}</Text>
          </View>
        )}

        {/* Виконана робота */}
        {item.workDescription && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔧 Виконана робота</Text>
            <Text style={styles.descriptionText}>{item.workDescription}</Text>
            {item.workDuration && (
              <Text style={styles.workDuration}>⏱️ Тривалість: {item.workDuration} год.</Text>
            )}
          </View>
        )}

        {/* Коментарі */}
        {item.comments?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💬 Коментарі ({item.comments.length})</Text>
            {item.comments.map((c, i) => (
              <View key={i} style={styles.commentItem}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>{c.author || c.createdBy || 'Невідомий'}</Text>
                  <Text style={styles.commentDate}>{formatDate(c.createdAt || c.date)}</Text>
                </View>
                <Text style={styles.commentText}>{c.text || c.message || c.comment}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Додати коментар */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✏️ Додати коментар</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Введіть коментар..."
            placeholderTextColor="#aaa"
            value={commentText}
            onChangeText={setCommentText}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity
            style={[styles.commentButton, (!commentText.trim() || addingComment) && styles.buttonDisabled]}
            onPress={handleAddComment}
            disabled={!commentText.trim() || addingComment}
          >
            {addingComment ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.commentButtonText}>Відправити коментар</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Кнопка зміни статусу */}
      {item.status !== 'completed' && item.status !== 'cancelled' && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.actionButton, loading && styles.buttonDisabled]}
            onPress={() => setStatusModalVisible(true)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>🔄 Змінити статус</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Модальне вікно вибору статусу */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setStatusModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Змінити статус</Text>
            {AVAILABLE_STATUSES.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[
                  styles.statusOption,
                  item.status === s.key && styles.statusOptionActive,
                ]}
                onPress={() => handleChangeStatus(s.key)}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: STATUS_COLORS[s.key] || '#aaa' },
                  ]}
                />
                <Text
                  style={[
                    styles.statusOptionText,
                    item.status === s.key && styles.statusOptionTextActive,
                  ]}
                >
                  {s.label}
                </Text>
                {item.status === s.key && <Text style={styles.currentMark}>✓ Поточний</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setStatusModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Скасувати</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Модальне вікно завершення роботи */}
      <Modal
        visible={completeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCompleteModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCompleteModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>✅ Завершити завдання</Text>
            <Text style={styles.completeLabel}>Опис виконаної роботи *</Text>
            <TextInput
              style={styles.completeInput}
              placeholder="Що було зроблено?"
              placeholderTextColor="#aaa"
              value={workDescription}
              onChangeText={setWorkDescription}
              multiline
              numberOfLines={4}
            />
            <Text style={styles.completeLabel}>Тривалість (год., необов'язково)</Text>
            <TextInput
              style={[styles.completeInput, { height: 44 }]}
              placeholder="Наприклад: 2.5"
              placeholderTextColor="#aaa"
              value={workDuration}
              onChangeText={setWorkDuration}
              keyboardType="decimal-pad"
            />
            <View style={styles.completeButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setCompleteModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Скасувати</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.completeConfirmButton, !workDescription.trim() && styles.buttonDisabled]}
                onPress={handleComplete}
                disabled={!workDescription.trim()}
              >
                <Text style={styles.completeConfirmButtonText}>✅ Завершити</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  scroll: { flex: 1 },
  statusBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    flexWrap: 'wrap',
  },
  statusBadgeLarge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1.5,
  },
  statusTextLarge: {
    fontSize: 14,
    fontWeight: '700',
  },
  priorityBadgeLarge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  priorityTextLarge: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a237e',
    lineHeight: 28,
  },
  requestNo: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 1,
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 21,
  },
  workDuration: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
  },
  commentItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#007bff',
    paddingLeft: 12,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007bff',
  },
  commentDate: {
    fontSize: 11,
    color: '#aaa',
  },
  commentText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  commentInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: 10,
  },
  commentButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  commentButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  bottomSpace: { height: 20 },
  actionBar: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e6ff',
  },
  actionButton: {
    backgroundColor: '#007bff',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  statusOptionActive: {
    backgroundColor: '#f0f8ff',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusOptionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  statusOptionTextActive: {
    fontWeight: '700',
    color: '#007bff',
  },
  currentMark: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    color: '#555',
    fontWeight: '700',
    fontSize: 15,
  },
  completeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  completeInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: 12,
  },
  completeButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  completeConfirmButton: {
    flex: 1,
    backgroundColor: '#28a745',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  completeConfirmButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
