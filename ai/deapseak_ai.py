#!/usr/bin/env python3
"""
DeapSeaK AI Assistant - Core Intelligence Module
================================================

Повноцінний AI асистент з розширеними можливостями:
• Природне розуміння мови (NLP)
• Прогностична аналітика
• Автоматизація рішень
• Персоналізація
• Машинне навчання
"""

import json
import re
import datetime
from typing import Dict, List, Any, Optional
import sqlite3
import logging
from dataclasses import dataclass
from enum import Enum

# Налаштування логування
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AICapability(Enum):
    """AI можливості системи"""
    NLP_PROCESSING = "nlp_processing"
    PREDICTIVE_ANALYTICS = "predictive_analytics" 
    AUTO_ASSIGNMENT = "auto_assignment"
    SMART_SCHEDULING = "smart_scheduling"
    ANOMALY_DETECTION = "anomaly_detection"
    PERSONALIZATION = "personalization"
    VOICE_INTERFACE = "voice_interface"
    COMPUTER_VISION = "computer_vision"

@dataclass
class UserIntent:
    """Визначення наміру користувача"""
    intent: str
    confidence: float
    entities: Dict[str, Any]
    context: Dict[str, Any]

@dataclass
class AIResponse:
    """Відповідь AI асистента"""
    response: str
    action: Optional[str]
    data: Optional[Dict[str, Any]]
    confidence: float
    suggestions: List[str]

class DeapSeakAI:
    """Головний клас AI асистента DeapSeaK"""
    
    def __init__(self, db_path: str = "ai_memory.db"):
        self.db_path = db_path
        self.capabilities = [c.value for c in AICapability]
        self.user_contexts = {}
        self.learning_data = {}
        
        # Ініціалізація бази знань
        self._init_knowledge_base()
        self._init_nlp_patterns()
        self._init_prediction_models()
        
        logger.info("🤖 DeapSeaK AI Assistant ініціалізовано")
    
    def _init_knowledge_base(self):
        """Ініціалізація бази знань"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Таблиця знань про ліфти
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS lift_knowledge (
                id INTEGER PRIMARY KEY,
                lift_id TEXT,
                issue_pattern TEXT,
                solution TEXT,
                success_rate REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Таблиця користувацьких переваг
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_preferences (
                user_id TEXT PRIMARY KEY,
                role TEXT,
                preferences TEXT,
                behavior_patterns TEXT,
                learning_data TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Таблиця передбачень
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY,
                prediction_type TEXT,
                input_data TEXT,
                prediction TEXT,
                actual_result TEXT,
                accuracy REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Таблиця діалогів
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY,
                user_id TEXT,
                message TEXT,
                response TEXT,
                intent TEXT,
                confidence REAL,
                feedback INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def _init_nlp_patterns(self):
        """Ініціалізація NLP паттернів для розуміння мови"""
        self.intents = {
            "створити_заявку": {
                "patterns": [
                    r"створ.*заявк",
                    r"додат.*заявк", 
                    r"нов.*заявк",
                    r"ліфт.*не.*працює",
                    r"проблем.*ліфт",
                    r"поломк",
                    r"ремонт.*потрібен"
                ],
                "entities": ["lift_id", "issue_type", "urgency"]
            },
            "статус_ліфта": {
                "patterns": [
                    r"стат.*ліфт",
                    r"як.*справ.*ліфт", 
                    r"чи.*працює.*ліфт",
                    r"інформаці.*ліфт",
                    r"перевір.*ліфт"
                ],
                "entities": ["lift_id", "location"]
            },
            "призначити_техніка": {
                "patterns": [
                    r"признач.*технік",
                    r"відправ.*технік",
                    r"техні.*на.*заявк",
                    r"хто.*поїде"
                ],
                "entities": ["request_id", "technician_id", "urgency"]
            },
            "прогноз_поломки": {
                "patterns": [
                    r"прогно.*поломк",
                    r"передбач.*проблем",
                    r"коли.*ремонт",
                    r"скільк.*буде.*працювати"
                ],
                "entities": ["lift_id", "timeframe"]
            },
            "аналітика": {
                "patterns": [
                    r"статистик",
                    r"аналітик", 
                    r"звіт",
                    r"дашборд",
                    r"показ.*дан"
                ],
                "entities": ["report_type", "period", "metrics"]
            },
            "допомога": {
                "patterns": [
                    r"допомог",
                    r"як.*робить",
                    r"що.*можеш",
                    r"команди",
                    r"функці"
                ],
                "entities": []
            }
        }
    
    def _init_prediction_models(self):
        """Ініціалізація моделей передбачення"""
        self.prediction_models = {
            "failure_prediction": {
                "factors": ["usage_hours", "maintenance_delay", "age", "load_factor"],
                "weights": [0.3, 0.25, 0.2, 0.25]
            },
            "maintenance_optimization": {
                "factors": ["current_status", "usage_pattern", "seasonal_factor"],
                "weights": [0.4, 0.35, 0.25]
            },
            "technician_assignment": {
                "factors": ["distance", "expertise", "workload", "availability"],
                "weights": [0.25, 0.35, 0.2, 0.2]
            }
        }
    
    def process_message(self, user_id: str, message: str, context: Dict = None) -> AIResponse:
        """Основний метод обробки повідомлень"""
        try:
            # Розпізнавання наміру
            intent = self._detect_intent(message)
            
            # Оновлення контексту користувача
            if user_id not in self.user_contexts:
                self.user_contexts[user_id] = {}
            
            if context:
                self.user_contexts[user_id].update(context)
            
            # Генерація відповіді на основі наміру
            response = self._generate_response(intent, user_id, message)
            
            # Збереження діалогу
            self._save_conversation(user_id, message, response)
            
            return response
            
        except Exception as e:
            logger.error(f"Помилка обробки повідомлення: {e}")
            return AIResponse(
                response="Вибачте, виникла помилка. Спробуйте ще раз або перефразуйте питання.",
                action=None,
                data=None,
                confidence=0.0,
                suggestions=["Перезавантажити сторінку", "Зв'язатися з підтримкою"]
            )
    
    def _detect_intent(self, message: str) -> UserIntent:
        """Розпізнавання наміру користувача"""
        message_lower = message.lower()
        best_intent = None
        best_confidence = 0.0
        
        for intent_name, intent_data in self.intents.items():
            confidence = 0.0
            
            # Перевірка паттернів
            for pattern in intent_data["patterns"]:
                if re.search(pattern, message_lower):
                    confidence += 0.2
            
            # Перевірка ключових слів
            words = message_lower.split()
            intent_words = intent_name.replace("_", " ").split()
            
            for word in intent_words:
                if word in words:
                    confidence += 0.1
            
            if confidence > best_confidence:
                best_confidence = confidence
                best_intent = intent_name
        
        # Витягнення сутностей
        entities = self._extract_entities(message, best_intent)
        
        return UserIntent(
            intent=best_intent or "невідомий",
            confidence=min(best_confidence, 1.0),
            entities=entities,
            context={}
        )
    
    def _extract_entities(self, message: str, intent: str) -> Dict[str, Any]:
        """Витягнення сутностей з повідомлення"""
        entities = {}
        
        # ID ліфта
        lift_id_match = re.search(r"ліфт.*?(\d+)", message.lower())
        if lift_id_match:
            entities["lift_id"] = lift_id_match.group(1)
        
        # Номер заявки
        request_id_match = re.search(r"заявк.*?(\d+)", message.lower())
        if request_id_match:
            entities["request_id"] = request_id_match.group(1)
        
        # Рівень терміновості
        urgency_patterns = {
            "критично": ["критич", "терміново", "негайно", "аварійн"],
            "високо": ["швидк", "скоро", "важливо"],
            "середньо": ["звичайн", "планов"],
            "низько": ["коли.*встиг", "не.*поспішай"]
        }
        
        for urgency, patterns in urgency_patterns.items():
            for pattern in patterns:
                if re.search(pattern, message.lower()):
                    entities["urgency"] = urgency
                    break
        
        # Тип проблеми
        issue_types = {
            "не_працює": ["не працює", "зламався", "стоїт"],
            "повільно": ["повільн", "гальмує", "тормозить"],
            "шум": ["шум", "скрип", "гуде"],
            "двері": ["двер", "не закрив", "не відкрив"],
            "кнопки": ["кнопк", "не натискає", "не реагує"]
        }
        
        for issue_type, patterns in issue_types.items():
            for pattern in patterns:
                if pattern in message.lower():
                    entities["issue_type"] = issue_type
                    break
        
        return entities
    
    def _generate_response(self, intent: UserIntent, user_id: str, original_message: str) -> AIResponse:
        """Генерація відповіді на основі наміру"""
        
        if intent.intent == "створити_заявку":
            return self._handle_create_request(intent, user_id)
        
        elif intent.intent == "статус_ліфта":
            return self._handle_lift_status(intent, user_id)
        
        elif intent.intent == "призначити_техніка":
            return self._handle_assign_technician(intent, user_id)
        
        elif intent.intent == "прогноз_поломки":
            return self._handle_failure_prediction(intent, user_id)
        
        elif intent.intent == "аналітика":
            return self._handle_analytics(intent, user_id)
        
        elif intent.intent == "допомога":
            return self._handle_help(intent, user_id)
        
        else:
            return self._handle_general_conversation(intent, user_id, original_message)
    
    def _handle_create_request(self, intent: UserIntent, user_id: str) -> AIResponse:
        """Обробка створення заявки"""
        entities = intent.entities
        
        response_text = "🔧 Допоможу створити заявку на ремонт!\n\n"
        
        if "lift_id" in entities:
            response_text += f"🏢 Ліфт: #{entities['lift_id']}\n"
        else:
            response_text += "❓ Будь ласка, вкажіть номер ліфта\n"
        
        if "issue_type" in entities:
            issue_descriptions = {
                "не_працює": "Повна зупинка роботи",
                "повільно": "Повільна робота",
                "шум": "Незвичні звуки",
                "двері": "Проблеми з дверима",
                "кнопки": "Несправність кнопок"
            }
            response_text += f"⚠️ Проблема: {issue_descriptions.get(entities['issue_type'], entities['issue_type'])}\n"
        
        if "urgency" in entities:
            urgency_emojis = {
                "критично": "🚨", "високо": "⚡", 
                "середньо": "⏰", "низько": "📅"
            }
            emoji = urgency_emojis.get(entities['urgency'], '❗')
            response_text += f"{emoji} Терміновість: {entities['urgency']}\n"
        
        # Автоматичне призначення техніка якщо можливо
        suggested_tech = self._suggest_technician(entities)
        if suggested_tech:
            response_text += f"\n👨‍🔧 Рекомендований технік: {suggested_tech['name']}"
            response_text += f"\n📍 Відстань: {suggested_tech['distance']} км"
            response_text += f"\n⏱️ Час прибуття: ~{suggested_tech['eta']} хв"
        
        return AIResponse(
            response=response_text,
            action="create_request",
            data={
                "lift_id": entities.get("lift_id"),
                "issue_type": entities.get("issue_type"),
                "urgency": entities.get("urgency", "середньо"),
                "suggested_technician": suggested_tech
            },
            confidence=intent.confidence,
            suggestions=[
                "Створити заявку автоматично",
                "Вибрати іншого техніка", 
                "Змінити рівень терміновості"
            ]
        )
    
    def _handle_lift_status(self, intent: UserIntent, user_id: str) -> AIResponse:
        """Обробка запиту статусу ліфта"""
        entities = intent.entities
        
        if "lift_id" not in entities:
            return AIResponse(
                response="🤔 Вкажіть, будь ласка, номер ліфта для перевірки статусу.",
                action="request_lift_id",
                data=None,
                confidence=intent.confidence,
                suggestions=["Ліфт #1", "Ліфт #2", "Всі ліфти"]
            )
        
        lift_id = entities["lift_id"]
        
        # Симуляція отримання статусу ліфта
        lift_status = self._get_lift_status_simulation(lift_id)
        
        status_emojis = {
            "активний": "🟢", "обслуговування": "🟡", 
            "поломка": "🔴", "неактивний": "⚫"
        }
        
        emoji = status_emojis.get(lift_status["status"], "❓")
        
        response_text = f"📊 Статус ліфта #{lift_id}:\n\n"
        response_text += f"{emoji} Стан: {lift_status['status'].title()}\n"
        response_text += f"🏢 Адреса: {lift_status['address']}\n"
        response_text += f"📅 Останнє ТО: {lift_status['last_maintenance']}\n"
        response_text += f"🔧 Наступне ТО: {lift_status['next_maintenance']}\n"
        response_text += f"📈 Використання: {lift_status['usage']}%\n"
        
        # Прогноз на основі AI
        prediction = self._predict_maintenance_need(lift_status)
        if prediction:
            response_text += f"\n🤖 AI Прогноз: {prediction}"
        
        return AIResponse(
            response=response_text,
            action="show_lift_details",
            data=lift_status,
            confidence=intent.confidence,
            suggestions=[
                "Показати історію заявок",
                "Запланувати ТО",
                "Створити заявку на ремонт"
            ]
        )
    
    def _suggest_technician(self, entities: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """AI підбір найкращого техніка"""
        # Симуляція AI алгоритму призначення
        technicians = [
            {"id": "tech1", "name": "Іван Петренко", "distance": 2.5, "expertise": 0.9, "workload": 0.3},
            {"id": "tech2", "name": "Олександр Сидоров", "distance": 5.1, "expertise": 0.8, "workload": 0.7},
            {"id": "tech3", "name": "Марія Коваленко", "distance": 3.2, "expertise": 0.95, "workload": 0.5}
        ]
        
        # AI оцінка на основі факторів
        urgency_factor = 1.0 if entities.get("urgency") == "критично" else 0.5
        
        best_tech = None
        best_score = 0.0
        
        for tech in technicians:
            # Складна AI оцінка
            distance_score = max(0, 1 - tech["distance"] / 10)  # Ближче = краще
            expertise_score = tech["expertise"]
            workload_score = 1 - tech["workload"]  # Менше навантаження = краще
            
            total_score = (
                distance_score * 0.3 * urgency_factor +
                expertise_score * 0.4 +
                workload_score * 0.3
            )
            
            if total_score > best_score:
                best_score = total_score
                best_tech = tech
        
        if best_tech:
            # Розрахунок ETA
            eta = max(15, int(best_tech["distance"] * 8))  # ~8 хв на км
            best_tech["eta"] = eta
            
        return best_tech
    
    def _get_lift_status_simulation(self, lift_id: str) -> Dict[str, Any]:
        """Симуляція отримання статусу ліфта"""
        import random
        
        statuses = ["активний", "обслуговування", "поломка", "неактивний"]
        addresses = [
            "вул. Хрещатик, 22",
            "вул. Спортивна, 1А", 
            "пр. Перемоги, 15",
            "вул. Жилянська, 75"
        ]
        
        return {
            "lift_id": lift_id,
            "status": random.choice(statuses),
            "address": random.choice(addresses),
            "last_maintenance": "15.09.2024",
            "next_maintenance": "15.11.2024", 
            "usage": random.randint(60, 95)
        }
    
    def _predict_maintenance_need(self, lift_status: Dict[str, Any]) -> Optional[str]:
        """AI передбачення потреби в обслуговуванні"""
        usage = lift_status.get("usage", 0)
        
        if usage > 90:
            return "Рекомендується позачергове ТО протягом тижня"
        elif usage > 80:
            return "Підвищене навантаження, моніторинг стану"
        elif usage < 50:
            return "Низьке навантаження, ТО за планом"
        
        return "Стан в межах норми"
    
    def _handle_general_conversation(self, intent: UserIntent, user_id: str, message: str) -> AIResponse:
        """Обробка загального діалогу"""
        
        # Прості розмовні відповіді
        greetings = ["привіт", "добро", "день", "вітаю"]
        thanks = ["дякую", "спасибі", "вдячний"]
        goodbyes = ["до побачення", "бувай", "все", "дякую"]
        
        message_lower = message.lower()
        
        if any(greet in message_lower for greet in greetings):
            return AIResponse(
                response="👋 Привіт! Я AI асистент DeapSeaK. Чим можу допомогти з ліфтами?",
                action=None,
                data=None,
                confidence=0.9,
                suggestions=[
                    "Перевірити статус ліфта",
                    "Створити заявку",
                    "Показати аналітику"
                ]
            )
        
        elif any(thank in message_lower for thank in thanks):
            return AIResponse(
                response="😊 Будь ласка! Завжди радий допомогти. Ще щось потрібно?",
                action=None,
                data=None,
                confidence=0.9,
                suggestions=[
                    "Показати всі ліфти",
                    "Актуальні заявки", 
                    "Завершити діалог"
                ]
            )
        
        elif any(bye in message_lower for bye in goodbyes):
            return AIResponse(
                response="👋 До побачення! Звертайтесь, якщо потрібна допомога з ліфтами.",
                action="end_conversation",
                data=None,
                confidence=0.9,
                suggestions=[]
            )
        
        else:
            return AIResponse(
                response="🤔 Вибачте, не зовсім зрозумів. Можете перефразувати або скористатися підказками нижче:",
                action=None,
                data=None,
                confidence=0.2,
                suggestions=[
                    "Статус ліфта",
                    "Створити заявку", 
                    "Призначити техніка",
                    "Показати допомогу"
                ]
            )
    
    def _save_conversation(self, user_id: str, message: str, response: AIResponse):
        """Збереження діалогу для навчання"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO conversations (user_id, message, response, intent, confidence)
                VALUES (?, ?, ?, ?, ?)
            ''', (user_id, message, response.response, 
                  getattr(response, 'intent', 'unknown'), response.confidence))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Помилка збереження діалогу: {e}")
    
    def get_capabilities(self) -> List[str]:
        """Отримання списку можливостей AI"""
        return self.capabilities
    
    def get_statistics(self) -> Dict[str, Any]:
        """Статистика роботи AI асистента"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Загальна кількість діалогів
            cursor.execute("SELECT COUNT(*) FROM conversations")
            total_conversations = cursor.fetchone()[0]
            
            # Середня точність
            cursor.execute("SELECT AVG(confidence) FROM conversations WHERE confidence > 0")
            avg_confidence = cursor.fetchone()[0] or 0.0
            
            # Популярні наміри
            cursor.execute("""
                SELECT intent, COUNT(*) as count 
                FROM conversations 
                GROUP BY intent 
                ORDER BY count DESC 
                LIMIT 5
            """)
            popular_intents = cursor.fetchall()
            
            conn.close()
            
            return {
                "total_conversations": total_conversations,
                "average_confidence": round(avg_confidence, 2),
                "popular_intents": dict(popular_intents),
                "capabilities_count": len(self.capabilities),
                "active_since": "2024-10-12"
            }
            
        except Exception as e:
            logger.error(f"Помилка отримання статистики: {e}")
            return {"error": str(e)}

# Додаткові AI модулі
class PredictiveAnalytics:
    """Модуль прогностичної аналітики"""
    
    @staticmethod
    def predict_failure_probability(lift_data: Dict) -> float:
        """Передбачення ймовірності поломки"""
        # Спрощений алгоритм машинного навчання
        age_factor = min(lift_data.get("age", 0) / 20, 1.0)
        usage_factor = lift_data.get("usage_hours", 0) / 8760  # години в році
        maintenance_delay = lift_data.get("maintenance_delay_days", 0) / 365
        
        failure_probability = (
            age_factor * 0.3 +
            usage_factor * 0.4 + 
            maintenance_delay * 0.3
        )
        
        return min(failure_probability, 1.0)
    
    @staticmethod
    def optimize_maintenance_schedule(lifts_data: List[Dict]) -> List[Dict]:
        """Оптимізація графіку обслуговування"""
        optimized_schedule = []
        
        for lift in lifts_data:
            priority_score = PredictiveAnalytics.predict_failure_probability(lift)
            
            if priority_score > 0.8:
                urgency = "критично"
            elif priority_score > 0.6:
                urgency = "високо"
            elif priority_score > 0.3:
                urgency = "середньо"
            else:
                urgency = "низько"
            
            optimized_schedule.append({
                "lift_id": lift["id"],
                "priority_score": priority_score,
                "urgency": urgency,
                "recommended_date": datetime.datetime.now() + datetime.timedelta(
                    days=int((1 - priority_score) * 30)
                )
            })
        
        return sorted(optimized_schedule, key=lambda x: x["priority_score"], reverse=True)

# Експорт основного класу
if __name__ == "__main__":
    # Тестування AI асистента
    ai = DeapSeakAI()
    
    # Тестові діалоги
    test_messages = [
        "Привіт! Не працює ліфт номер 3",
        "Який статус ліфта 1?", 
        "Призначте техніка на заявку 15",
        "Покажіть аналітику за останній місяць",
        "Дякую за допомогу!"
    ]
    
    print("🤖 Тестування AI асистента DeapSeaK\n")
    print("=" * 50)
    
    for i, message in enumerate(test_messages, 1):
        print(f"\n👤 Користувач: {message}")
        response = ai.process_message(f"test_user_{i}", message)
        print(f"🤖 AI: {response.response}")
        
        if response.suggestions:
            print(f"💡 Підказки: {', '.join(response.suggestions)}")
    
    print(f"\n📊 Статистика AI: {ai.get_statistics()}")