#!/usr/bin/env python3
"""
DeapSeaK Personalized AI Assistant
==================================

Персоналізований AI асистент який:
• Адаптується під кожного користувача
• Навчається на поведінці та перевагах
• Надає контекстні рекомендації
• Оптимізує інтерфейс під роль
"""

import json
import sqlite3
import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class UserRole(Enum):
    ADMIN = "admin"
    DISPATCHER = "dispatcher"
    TECHNICIAN = "technician"
    CLIENT = "client"

class PreferenceType(Enum):
    UI_LAYOUT = "ui_layout"
    NOTIFICATION_SETTINGS = "notification_settings"
    DASHBOARD_WIDGETS = "dashboard_widgets"
    WORKFLOW_PATTERNS = "workflow_patterns"
    COMMUNICATION_STYLE = "communication_style"

@dataclass
class UserBehavior:
    """Аналіз поведінки користувача"""
    user_id: str
    action_type: str
    timestamp: datetime.datetime
    context: Dict[str, Any]
    success: bool
    duration: float  # в секундах

@dataclass
class PersonalizedRecommendation:
    """Персоналізована рекомендація"""
    recommendation_id: str
    user_id: str
    type: str
    title: str
    description: str
    confidence: float
    priority: int  # 1-5, де 5 найвищий
    context: Dict[str, Any]
    expires_at: Optional[datetime.datetime]

@dataclass
class AdaptiveInterface:
    """Адаптивний інтерфейс користувача"""
    user_id: str
    role: UserRole
    preferred_layout: Dict[str, Any]
    widget_configuration: List[Dict[str, Any]]
    color_theme: str
    accessibility_settings: Dict[str, Any]
    shortcuts: Dict[str, str]

class PersonalizedAI:
    """Персоналізований AI асистент"""
    
    def __init__(self, db_path: str = "personalized_ai.db"):
        self.db_path = db_path
        self._init_database()
        
        # Параметри навчання
        self.learning_window_days = 30
        self.min_interactions_for_learning = 10
        self.confidence_threshold = 0.7
        
        # Шаблони для ролей
        self.role_templates = self._init_role_templates()
        
        logger.info("🎯 Персоналізований AI ініціалізовано")
    
    def _init_database(self):
        """Ініціалізація бази даних"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Таблиця поведінки користувачів
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_behavior (
                id INTEGER PRIMARY KEY,
                user_id TEXT,
                action_type TEXT,
                timestamp TIMESTAMP,
                context_json TEXT,
                success BOOLEAN,
                duration REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Таблиця персональних налаштувань
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_preferences (
                id INTEGER PRIMARY KEY,
                user_id TEXT,
                preference_type TEXT,
                value_json TEXT,
                confidence REAL,
                last_updated TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Таблиця рекомендацій
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS personalized_recommendations (
                id INTEGER PRIMARY KEY,
                recommendation_id TEXT UNIQUE,
                user_id TEXT,
                type TEXT,
                title TEXT,
                description TEXT,
                confidence REAL,
                priority INTEGER,
                context_json TEXT,
                expires_at TIMESTAMP,
                shown BOOLEAN DEFAULT FALSE,
                clicked BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Таблиця адаптивного інтерфейсу
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS adaptive_interface (
                user_id TEXT PRIMARY KEY,
                role TEXT,
                preferred_layout_json TEXT,
                widget_configuration_json TEXT,
                color_theme TEXT,
                accessibility_settings_json TEXT,
                shortcuts_json TEXT,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def _init_role_templates(self) -> Dict[UserRole, Dict[str, Any]]:
        """Ініціалізація шаблонів для ролей"""
        return {
            UserRole.ADMIN: {
                "default_widgets": ["system_stats", "user_management", "reports", "analytics"],
                "color_theme": "admin_dark",
                "communication_style": "formal_detailed",
                "key_metrics": ["total_lifts", "total_users", "system_uptime", "revenue"],
                "default_layout": {"sidebar": "expanded", "density": "compact"},
                "priority_notifications": ["system_alerts", "user_registrations", "critical_issues"]
            },
            UserRole.DISPATCHER: {
                "default_widgets": ["active_requests", "technician_status", "emergency_alerts", "map_view"],
                "color_theme": "dispatcher_blue",
                "communication_style": "concise_actionable",
                "key_metrics": ["pending_requests", "response_time", "technician_utilization"],
                "default_layout": {"sidebar": "collapsed", "density": "normal"},
                "priority_notifications": ["emergency_calls", "technician_updates", "assignment_confirmations"]
            },
            UserRole.TECHNICIAN: {
                "default_widgets": ["my_assignments", "route_planner", "tools_checklist", "photo_upload"],
                "color_theme": "technician_green",
                "communication_style": "simple_practical",
                "key_metrics": ["today_assignments", "completion_rate", "travel_time"],
                "default_layout": {"sidebar": "mobile_friendly", "density": "large"},
                "priority_notifications": ["new_assignments", "urgent_requests", "location_updates"]
            },
            UserRole.CLIENT: {
                "default_widgets": ["my_requests", "lift_status", "contact_support", "feedback"],
                "color_theme": "client_light",
                "communication_style": "friendly_simple",
                "key_metrics": ["request_status", "response_time", "satisfaction_score"],
                "default_layout": {"sidebar": "hidden", "density": "comfortable"},
                "priority_notifications": ["request_updates", "maintenance_schedule", "completion_notices"]
            }
        }
    
    def track_user_behavior(self, behavior: UserBehavior):
        """Відстеження поведінки користувача"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO user_behavior 
                (user_id, action_type, timestamp, context_json, success, duration)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                behavior.user_id,
                behavior.action_type,
                behavior.timestamp,
                json.dumps(behavior.context),
                behavior.success,
                behavior.duration
            ))
            
            conn.commit()
            conn.close()
            
            # Автоматичне навчання після накопичення даних
            self._trigger_learning(behavior.user_id)
            
        except Exception as e:
            logger.error(f"Помилка відстеження поведінки: {e}")
    
    def get_personalized_interface(self, user_id: str, role: UserRole) -> AdaptiveInterface:
        """Отримання персоналізованого інтерфейсу"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM adaptive_interface WHERE user_id = ?
            ''', (user_id,))
            
            result = cursor.fetchone()
            conn.close()
            
            if result:
                return AdaptiveInterface(
                    user_id=result[0],
                    role=UserRole(result[1]),
                    preferred_layout=json.loads(result[2]),
                    widget_configuration=json.loads(result[3]),
                    color_theme=result[4],
                    accessibility_settings=json.loads(result[5]),
                    shortcuts=json.loads(result[6])
                )
            else:
                # Створення інтерфейсу за замовчуванням
                return self._create_default_interface(user_id, role)
                
        except Exception as e:
            logger.error(f"Помилка отримання інтерфейсу: {e}")
            return self._create_default_interface(user_id, role)
    
    def _create_default_interface(self, user_id: str, role: UserRole) -> AdaptiveInterface:
        """Створення інтерфейсу за замовчуванням"""
        template = self.role_templates[role]
        
        interface = AdaptiveInterface(
            user_id=user_id,
            role=role,
            preferred_layout=template["default_layout"],
            widget_configuration=[
                {"widget": widget, "position": i, "enabled": True} 
                for i, widget in enumerate(template["default_widgets"])
            ],
            color_theme=template["color_theme"],
            accessibility_settings={
                "high_contrast": False,
                "large_fonts": False,
                "keyboard_navigation": False
            },
            shortcuts={}
        )
        
        self._save_interface(interface)
        return interface
    
    def _save_interface(self, interface: AdaptiveInterface):
        """Збереження налаштувань інтерфейсу"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO adaptive_interface 
                (user_id, role, preferred_layout_json, widget_configuration_json, 
                 color_theme, accessibility_settings_json, shortcuts_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                interface.user_id,
                interface.role.value,
                json.dumps(interface.preferred_layout),
                json.dumps(interface.widget_configuration),
                interface.color_theme,
                json.dumps(interface.accessibility_settings),
                json.dumps(interface.shortcuts)
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Помилка збереження інтерфейсу: {e}")
    
    def get_personalized_recommendations(self, user_id: str, limit: int = 5) -> List[PersonalizedRecommendation]:
        """Отримання персоналізованих рекомендацій"""
        try:
            # Генерація нових рекомендацій
            self._generate_recommendations(user_id)
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM personalized_recommendations 
                WHERE user_id = ? 
                AND (expires_at IS NULL OR expires_at > ?) 
                AND shown = FALSE
                ORDER BY priority DESC, confidence DESC
                LIMIT ?
            ''', (user_id, datetime.datetime.now(), limit))
            
            results = cursor.fetchall()
            conn.close()
            
            recommendations = []
            for row in results:
                recommendations.append(PersonalizedRecommendation(
                    recommendation_id=row[1],
                    user_id=row[2],
                    type=row[3],
                    title=row[4],
                    description=row[5],
                    confidence=row[6],
                    priority=row[7],
                    context=json.loads(row[8]) if row[8] else {},
                    expires_at=datetime.datetime.fromisoformat(row[9]) if row[9] else None
                ))
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Помилка отримання рекомендацій: {e}")
            return []
    
    def _generate_recommendations(self, user_id: str):
        """Генерація персоналізованих рекомендацій"""
        try:
            # Аналіз поведінки користувача
            behavior_patterns = self._analyze_user_patterns(user_id)
            
            # Генерація рекомендацій на основі патернів
            recommendations = []
            
            # Рекомендації по оптимізації workflow
            if behavior_patterns.get("frequent_actions"):
                for action, frequency in behavior_patterns["frequent_actions"].items():
                    if frequency > 10:  # часто використовувана дія
                        rec_id = f"shortcut_{user_id}_{action}_{int(datetime.datetime.now().timestamp())}"
                        recommendations.append(PersonalizedRecommendation(
                            recommendation_id=rec_id,
                            user_id=user_id,
                            type="workflow_optimization",
                            title=f"Створити ярлик для '{action}'",
                            description=f"Ви часто використовуєте '{action}'. Створити швидкий доступ?",
                            confidence=min(0.9, frequency / 20),
                            priority=3,
                            context={"action": action, "frequency": frequency},
                            expires_at=datetime.datetime.now() + datetime.timedelta(days=7)
                        ))
            
            # Рекомендації по часу використання
            if behavior_patterns.get("usage_times"):
                peak_hour = max(behavior_patterns["usage_times"], key=behavior_patterns["usage_times"].get)
                if behavior_patterns["usage_times"][peak_hour] > 5:
                    rec_id = f"schedule_{user_id}_{peak_hour}_{int(datetime.datetime.now().timestamp())}"
                    recommendations.append(PersonalizedRecommendation(
                        recommendation_id=rec_id,
                        user_id=user_id,
                        type="schedule_optimization",
                        title="Оптимізувати розклад роботи",
                        description=f"Ви найактивніші о {peak_hour}:00. Налаштувати нагадування?",
                        confidence=0.7,
                        priority=2,
                        context={"peak_hour": peak_hour},
                        expires_at=datetime.datetime.now() + datetime.timedelta(days=3)
                    ))
            
            # Рекомендації по помилках
            if behavior_patterns.get("error_patterns"):
                for error_type, count in behavior_patterns["error_patterns"].items():
                    if count > 3:
                        rec_id = f"help_{user_id}_{error_type}_{int(datetime.datetime.now().timestamp())}"
                        recommendations.append(PersonalizedRecommendation(
                            recommendation_id=rec_id,
                            user_id=user_id,
                            type="help_suggestion",
                            title=f"Допомога з '{error_type}'",
                            description=f"Помічені труднощі з '{error_type}'. Показати інструкцію?",
                            confidence=0.8,
                            priority=4,
                            context={"error_type": error_type, "count": count},
                            expires_at=datetime.datetime.now() + datetime.timedelta(days=5)
                        ))
            
            # Збереження рекомендацій
            self._save_recommendations(recommendations)
            
        except Exception as e:
            logger.error(f"Помилка генерації рекомендацій: {e}")
    
    def _analyze_user_patterns(self, user_id: str) -> Dict[str, Any]:
        """Аналіз патернів поведінки користувача"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Отримання даних за останні 30 днів
            cutoff_date = datetime.datetime.now() - datetime.timedelta(days=self.learning_window_days)
            
            cursor.execute('''
                SELECT action_type, timestamp, context_json, success, duration
                FROM user_behavior 
                WHERE user_id = ? AND timestamp > ?
                ORDER BY timestamp DESC
            ''', (user_id, cutoff_date))
            
            behaviors = cursor.fetchall()
            conn.close()
            
            if not behaviors:
                return {}
            
            # Аналіз частоти дій
            action_frequency = {}
            usage_times = {}
            error_patterns = {}
            session_durations = []
            
            for behavior in behaviors:
                action_type = behavior[0]
                timestamp = datetime.datetime.fromisoformat(behavior[1])
                success = behavior[3]
                duration = behavior[4]
                
                # Частота дій
                action_frequency[action_type] = action_frequency.get(action_type, 0) + 1
                
                # Час використання
                hour = timestamp.hour
                usage_times[hour] = usage_times.get(hour, 0) + 1
                
                # Патерни помилок
                if not success:
                    error_patterns[action_type] = error_patterns.get(action_type, 0) + 1
                
                # Тривалість сесій
                if duration > 0:
                    session_durations.append(duration)
            
            return {
                "frequent_actions": action_frequency,
                "usage_times": usage_times,
                "error_patterns": error_patterns,
                "avg_session_duration": sum(session_durations) / len(session_durations) if session_durations else 0,
                "total_interactions": len(behaviors)
            }
            
        except Exception as e:
            logger.error(f"Помилка аналізу патернів: {e}")
            return {}
    
    def _save_recommendations(self, recommendations: List[PersonalizedRecommendation]):
        """Збереження рекомендацій"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            for rec in recommendations:
                cursor.execute('''
                    INSERT OR IGNORE INTO personalized_recommendations
                    (recommendation_id, user_id, type, title, description, 
                     confidence, priority, context_json, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    rec.recommendation_id,
                    rec.user_id,
                    rec.type,
                    rec.title,
                    rec.description,
                    rec.confidence,
                    rec.priority,
                    json.dumps(rec.context),
                    rec.expires_at
                ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Помилка збереження рекомендацій: {e}")
    
    def _trigger_learning(self, user_id: str):
        """Запуск процесу навчання для користувача"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Перевірка кількості взаємодій
            cursor.execute('''
                SELECT COUNT(*) FROM user_behavior WHERE user_id = ?
            ''', (user_id,))
            
            interaction_count = cursor.fetchone()[0]
            conn.close()
            
            if interaction_count >= self.min_interactions_for_learning:
                # Запуск адаптації інтерфейсу
                self._adapt_interface(user_id)
                
        except Exception as e:
            logger.error(f"Помилка навчання: {e}")
    
    def _adapt_interface(self, user_id: str):
        """Адаптація інтерфейсу на основі поведінки"""
        try:
            patterns = self._analyze_user_patterns(user_id)
            
            if not patterns:
                return
            
            # Отримання поточного інтерфейсу
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT role FROM adaptive_interface WHERE user_id = ?
            ''', (user_id,))
            
            result = cursor.fetchone()
            if not result:
                conn.close()
                return
                
            role = UserRole(result[0])
            interface = self.get_personalized_interface(user_id, role)
            
            # Адаптація на основі патернів
            adapted = False
            
            # Адаптація віджетів
            frequent_actions = patterns.get("frequent_actions", {})
            for action, frequency in frequent_actions.items():
                if frequency > 15:  # дуже часто використовується
                    # Перемістити віджет вгору або додати ярлик
                    widget_name = self._action_to_widget(action)
                    if widget_name:
                        # Знайти віджет і перемістити на початок
                        for widget_config in interface.widget_configuration:
                            if widget_config["widget"] == widget_name:
                                widget_config["position"] = 0
                                widget_config["priority"] = "high"
                                adapted = True
                                break
            
            # Адаптація щільності інтерфейсу
            avg_duration = patterns.get("avg_session_duration", 0)
            if avg_duration > 3600:  # більше години
                interface.preferred_layout["density"] = "compact"
                adapted = True
            elif avg_duration < 600:  # менше 10 хвилин
                interface.preferred_layout["density"] = "comfortable"
                adapted = True
            
            # Збереження адаптованого інтерфейсу
            if adapted:
                self._save_interface(interface)
                
            conn.close()
            
        except Exception as e:
            logger.error(f"Помилка адаптації інтерфейсу: {e}")
    
    def _action_to_widget(self, action: str) -> Optional[str]:
        """Мапінг дії на віджет"""
        action_widget_map = {
            "create_request": "request_form",
            "view_lifts": "lifts_overview",
            "assign_technician": "assignment_panel",
            "view_reports": "reports_widget",
            "check_status": "status_monitor",
            "upload_photo": "photo_upload",
            "update_location": "location_tracker"
        }
        
        return action_widget_map.get(action)
    
    def mark_recommendation_shown(self, recommendation_id: str):
        """Позначити рекомендацію як показану"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE personalized_recommendations 
                SET shown = TRUE 
                WHERE recommendation_id = ?
            ''', (recommendation_id,))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Помилка позначення рекомендації: {e}")
    
    def get_user_analytics(self, user_id: str) -> Dict[str, Any]:
        """Отримання аналітики користувача"""
        try:
            patterns = self._analyze_user_patterns(user_id)
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Статистика рекомендацій
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_recommendations,
                    COUNT(CASE WHEN shown = TRUE THEN 1 END) as shown_recommendations,
                    COUNT(CASE WHEN clicked = TRUE THEN 1 END) as clicked_recommendations
                FROM personalized_recommendations 
                WHERE user_id = ?
            ''', (user_id,))
            
            rec_stats = cursor.fetchone()
            
            # Останні дії
            cursor.execute('''
                SELECT action_type, timestamp, success
                FROM user_behavior 
                WHERE user_id = ?
                ORDER BY timestamp DESC
                LIMIT 10
            ''', (user_id,))
            
            recent_actions = cursor.fetchall()
            
            conn.close()
            
            return {
                "behavior_patterns": patterns,
                "recommendation_stats": {
                    "total": rec_stats[0] if rec_stats else 0,
                    "shown": rec_stats[1] if rec_stats else 0,
                    "clicked": rec_stats[2] if rec_stats else 0,
                    "engagement_rate": (rec_stats[2] / rec_stats[1] * 100) if rec_stats and rec_stats[1] > 0 else 0
                },
                "recent_actions": [
                    {
                        "action": action[0],
                        "timestamp": action[1],
                        "success": action[2]
                    } for action in recent_actions
                ],
                "personalization_level": min(100, patterns.get("total_interactions", 0) * 2),  # 0-100%
                "learning_status": "active" if patterns.get("total_interactions", 0) >= self.min_interactions_for_learning else "learning"
            }
            
        except Exception as e:
            logger.error(f"Помилка аналітики користувача: {e}")
            return {}

# Експорт основного класу
if __name__ == "__main__":
    # Тестування персоналізованого AI
    print("🎯 Тестування Персоналізованого AI асистента")
    
    ai = PersonalizedAI()
    test_user_id = "test_user_123"
    
    # Симуляція поведінки користувача
    behaviors = [
        UserBehavior(test_user_id, "create_request", datetime.datetime.now(), {"lift_id": "1"}, True, 45.2),
        UserBehavior(test_user_id, "view_lifts", datetime.datetime.now(), {}, True, 12.5),
        UserBehavior(test_user_id, "create_request", datetime.datetime.now(), {"lift_id": "2"}, True, 38.7),
        UserBehavior(test_user_id, "assign_technician", datetime.datetime.now(), {"request_id": "1"}, False, 95.3),
        UserBehavior(test_user_id, "view_reports", datetime.datetime.now(), {}, True, 156.8)
    ]
    
    print(f"\n📊 Відстеження {len(behaviors)} дій користувача...")
    for behavior in behaviors:
        ai.track_user_behavior(behavior)
    
    # Отримання персоналізованого інтерфейсу
    interface = ai.get_personalized_interface(test_user_id, UserRole.DISPATCHER)
    print(f"\n🎨 Персоналізований інтерфейс:")
    print(f"   Роль: {interface.role.value}")
    print(f"   Тема: {interface.color_theme}")
    print(f"   Віджетів: {len(interface.widget_configuration)}")
    
    # Отримання рекомендацій
    recommendations = ai.get_personalized_recommendations(test_user_id)
    print(f"\n💡 Персоналізовані рекомендації: {len(recommendations)}")
    for i, rec in enumerate(recommendations[:3], 1):
        print(f"   {i}. {rec.title} (впевненість: {rec.confidence:.2f})")
    
    # Аналітика користувача
    analytics = ai.get_user_analytics(test_user_id)
    print(f"\n📈 Аналітика користувача:")
    print(f"   Рівень персоналізації: {analytics.get('personalization_level', 0)}%")
    print(f"   Статус навчання: {analytics.get('learning_status', 'unknown')}")
    print(f"   Всього взаємодій: {analytics.get('behavior_patterns', {}).get('total_interactions', 0)}")