// Кольори статусів заявок
export const STATUS_COLORS = {
  new: '#3498db',
  pending: '#f39c12',
  'in-progress': '#9b59b6',
  completed: '#27ae60',
  cancelled: '#e74c3c',
  closed: '#95a5a6',
};

// Назви статусів українською
export const STATUS_LABELS = {
  new: 'Нова',
  pending: 'Очікує',
  'in-progress': 'В роботі',
  completed: 'Виконано',
  cancelled: 'Скасовано',
  closed: 'Закрито',
};

// Кольори пріоритетів
export const PRIORITY_COLORS = {
  high: '#e74c3c',
  medium: '#f39c12',
  low: '#27ae60',
  urgent: '#c0392b',
};

// Назви пріоритетів
export const PRIORITY_LABELS = {
  high: 'Високий',
  medium: 'Середній',
  low: 'Низький',
  urgent: 'Терміново',
};

// Форматування дати
export const formatDate = (dateStr) => {
  if (!dateStr) return 'Не вказано';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

// Форматування дати без часу
export const formatDateOnly = (dateStr) => {
  if (!dateStr) return 'Не вказано';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};
