#!/usr/bin/env python3
"""
DeapSeaK Computer Vision Module
===============================

AI модуль для аналізу зображень та відео ліфтів:
• Детекція дефектів та поломок
• QR код розпізнавання  
• Аналіз стану обладнання
• Автоматична діагностика проблем
"""

import cv2
import numpy as np
import json
import base64
from typing import Dict, List, Any, Optional, Tuple
import logging
from dataclasses import dataclass
from datetime import datetime
import sqlite3

logger = logging.getLogger(__name__)

@dataclass
class DefectDetection:
    """Результат виявлення дефекту"""
    defect_type: str
    confidence: float
    location: Tuple[int, int, int, int]  # x, y, width, height
    severity: str
    description: str

@dataclass
class VisionAnalysis:
    """Результат аналізу зображення"""
    image_id: str
    timestamp: datetime
    defects: List[DefectDetection]
    overall_condition: str
    confidence_score: float
    recommendations: List[str]

class LiftVision:
    """Комп'ютерний зір для аналізу ліфтів"""
    
    def __init__(self):
        self.defect_classifiers = self._init_classifiers()
        self.qr_detector = cv2.QRCodeDetector()
        
        # База знань дефектів
        self.defect_patterns = {
            "rust": {
                "color_ranges": [
                    {"lower": np.array([5, 50, 50]), "upper": np.array([15, 255, 255])},
                    {"lower": np.array([15, 50, 50]), "upper": np.array([35, 255, 255])}
                ],
                "severity_mapping": {
                    "low": "Поверхневі сліди корозії",
                    "medium": "Помітна корозія, потребує уваги",
                    "high": "Серйозна корозія, потребує ремонту"
                }
            },
            "cracks": {
                "edge_threshold": 50,
                "line_threshold": 30,
                "severity_mapping": {
                    "low": "Мікротріщини",
                    "medium": "Помітні тріщини",
                    "high": "Критичні тріщини"
                }
            },
            "wear": {
                "texture_variance": 1000,
                "severity_mapping": {
                    "low": "Незначний знос",
                    "medium": "Помітний знос",
                    "high": "Критичний знос"
                }
            },
            "dirt": {
                "brightness_threshold": 80,
                "area_threshold": 0.1,
                "severity_mapping": {
                    "low": "Легке забруднення",
                    "medium": "Помітне забруднення", 
                    "high": "Сильне забруднення"
                }
            }
        }
        
    def _init_classifiers(self):
        """Ініціалізація класифікаторів для детекції"""
        return {
            "face_cascade": cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'),
            "edge_detector": cv2.Canny,
            "contour_detector": cv2.findContours
        }
    
    def analyze_image(self, image_data: bytes, image_id: str = None) -> VisionAnalysis:
        """Основний метод аналізу зображення"""
        try:
            # Декодування зображення
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                raise ValueError("Неможливо декодувати зображення")
            
            # Виконання різних типів аналізу
            defects = []
            
            # Детекція корозії
            rust_defects = self._detect_rust(image)
            defects.extend(rust_defects)
            
            # Детекція тріщин
            crack_defects = self._detect_cracks(image)
            defects.extend(crack_defects)
            
            # Детекція зносу
            wear_defects = self._detect_wear(image)
            defects.extend(wear_defects)
            
            # Детекція забруднення
            dirt_defects = self._detect_dirt(image)
            defects.extend(dirt_defects)
            
            # QR код розпізнавання
            qr_result = self._detect_qr_code(image)
            
            # Оцінка загального стану
            overall_condition = self._assess_overall_condition(defects)
            
            # Генерація рекомендацій
            recommendations = self._generate_recommendations(defects, qr_result)
            
            # Розрахунок загальної впевненості
            confidence_score = self._calculate_confidence(defects)
            
            return VisionAnalysis(
                image_id=image_id or f"img_{int(datetime.now().timestamp())}",
                timestamp=datetime.now(),
                defects=defects,
                overall_condition=overall_condition,
                confidence_score=confidence_score,
                recommendations=recommendations
            )
            
        except Exception as e:
            logger.error(f"Помилка аналізу зображення: {e}")
            return VisionAnalysis(
                image_id=image_id or "error",
                timestamp=datetime.now(),
                defects=[],
                overall_condition="unknown",
                confidence_score=0.0,
                recommendations=["Помилка аналізу зображення"]
            )
    
    def _detect_rust(self, image: np.ndarray) -> List[DefectDetection]:
        """Детекція корозії на зображенні"""
        defects = []
        
        # Конвертація в HSV для кращої детекції кольору
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        rust_mask = np.zeros(hsv.shape[:2], dtype=np.uint8)
        
        # Виявлення областей з кольором корозії
        for color_range in self.defect_patterns["rust"]["color_ranges"]:
            mask = cv2.inRange(hsv, color_range["lower"], color_range["upper"])
            rust_mask = cv2.bitwise_or(rust_mask, mask)
        
        # Морфологічні операції для очищення маски
        kernel = np.ones((5, 5), np.uint8)
        rust_mask = cv2.morphologyEx(rust_mask, cv2.MORPH_OPEN, kernel)
        rust_mask = cv2.morphologyEx(rust_mask, cv2.MORPH_CLOSE, kernel)
        
        # Знаходження контурів
        contours, _ = cv2.findContours(rust_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        for contour in contours:
            area = cv2.contourArea(contour)
            
            # Фільтрація маленьких областей
            if area > 500:  # мінімальна площа
                x, y, w, h = cv2.boundingRect(contour)
                
                # Оцінка серйозності на основі площі
                total_area = image.shape[0] * image.shape[1]
                severity_ratio = area / total_area
                
                if severity_ratio > 0.05:
                    severity = "high"
                elif severity_ratio > 0.02:
                    severity = "medium"
                else:
                    severity = "low"
                
                # Розрахунок впевненості
                confidence = min(0.95, area / 5000)
                
                defects.append(DefectDetection(
                    defect_type="rust",
                    confidence=confidence,
                    location=(x, y, w, h),
                    severity=severity,
                    description=self.defect_patterns["rust"]["severity_mapping"][severity]
                ))
        
        return defects
    
    def _detect_cracks(self, image: np.ndarray) -> List[DefectDetection]:
        """Детекція тріщин"""
        defects = []
        
        # Конвертація в сірий
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Застосування фільтра Гаусса
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Детекція країв
        edges = cv2.Canny(blurred, 50, 150, apertureSize=3)
        
        # Виявлення ліній (потенційних тріщин)
        lines = cv2.HoughLinesP(edges, 1, np.pi/180, 
                               threshold=30, minLineLength=50, maxLineGap=10)
        
        if lines is not None:
            # Групування близьких ліній
            crack_regions = self._group_lines(lines, image.shape)
            
            for region in crack_regions:
                x, y, w, h = region
                
                # Аналіз довжини та щільності тріщин в регіоні
                region_lines = [line for line in lines 
                               if self._line_in_region(line[0], region)]
                
                total_length = sum(self._line_length(line[0]) for line in region_lines)
                
                # Оцінка серйозності
                if total_length > 200:
                    severity = "high"
                elif total_length > 100:
                    severity = "medium"
                else:
                    severity = "low"
                
                confidence = min(0.9, len(region_lines) * 0.2)
                
                defects.append(DefectDetection(
                    defect_type="cracks",
                    confidence=confidence,
                    location=(x, y, w, h),
                    severity=severity,
                    description=self.defect_patterns["cracks"]["severity_mapping"][severity]
                ))
        
        return defects
    
    def _detect_wear(self, image: np.ndarray) -> List[DefectDetection]:
        """Детекція зносу поверхні"""
        defects = []
        
        # Конвертація в сірий
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Аналіз текстури через варіацію
        kernel_size = 15
        kernel = np.ones((kernel_size, kernel_size), np.float32) / (kernel_size ** 2)
        mean = cv2.filter2D(gray.astype(np.float32), -1, kernel)
        sqr_diff = (gray.astype(np.float32) - mean) ** 2
        variance = cv2.filter2D(sqr_diff, -1, kernel)
        
        # Області з низькою варіацією можуть вказувати на знос
        wear_mask = variance < self.defect_patterns["wear"]["texture_variance"]
        
        # Морфологічні операції
        kernel = np.ones((10, 10), np.uint8)
        wear_mask = cv2.morphologyEx(wear_mask.astype(np.uint8), cv2.MORPH_OPEN, kernel)
        
        # Знаходження контурів
        contours, _ = cv2.findContours(wear_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        for contour in contours:
            area = cv2.contourArea(contour)
            
            if area > 1000:  # мінімальна площа
                x, y, w, h = cv2.boundingRect(contour)
                
                # Оцінка серйозності
                total_area = image.shape[0] * image.shape[1]
                wear_ratio = area / total_area
                
                if wear_ratio > 0.15:
                    severity = "high"
                elif wear_ratio > 0.08:
                    severity = "medium"
                else:
                    severity = "low"
                
                confidence = min(0.8, area / 2000)
                
                defects.append(DefectDetection(
                    defect_type="wear",
                    confidence=confidence,
                    location=(x, y, w, h),
                    severity=severity,
                    description=self.defect_patterns["wear"]["severity_mapping"][severity]
                ))
        
        return defects
    
    def _detect_dirt(self, image: np.ndarray) -> List[DefectDetection]:
        """Детекція забруднення"""
        defects = []
        
        # Конвертація в сірий
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Виявлення темних областей
        _, dark_areas = cv2.threshold(gray, 
                                     self.defect_patterns["dirt"]["brightness_threshold"], 
                                     255, cv2.THRESH_BINARY_INV)
        
        # Морфологічні операції
        kernel = np.ones((8, 8), np.uint8)
        dark_areas = cv2.morphologyEx(dark_areas, cv2.MORPH_OPEN, kernel)
        
        # Знаходження контурів
        contours, _ = cv2.findContours(dark_areas, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        total_image_area = image.shape[0] * image.shape[1]
        
        for contour in contours:
            area = cv2.contourArea(contour)
            
            if area > 800:  # мінімальна площа
                x, y, w, h = cv2.boundingRect(contour)
                
                # Оцінка серйозності
                dirt_ratio = area / total_image_area
                
                if dirt_ratio > self.defect_patterns["dirt"]["area_threshold"] * 2:
                    severity = "high"
                elif dirt_ratio > self.defect_patterns["dirt"]["area_threshold"]:
                    severity = "medium"
                else:
                    severity = "low"
                
                confidence = min(0.85, area / 1500)
                
                defects.append(DefectDetection(
                    defect_type="dirt",
                    confidence=confidence,
                    location=(x, y, w, h),
                    severity=severity,
                    description=self.defect_patterns["dirt"]["severity_mapping"][severity]
                ))
        
        return defects
    
    def _detect_qr_code(self, image: np.ndarray) -> Optional[Dict[str, Any]]:
        """Розпізнавання QR кодів"""
        try:
            data, bbox, _ = self.qr_detector.detectAndDecode(image)
            
            if data:
                return {
                    "data": data,
                    "bbox": bbox.tolist() if bbox is not None else None,
                    "confidence": 0.95
                }
        except Exception as e:
            logger.error(f"Помилка QR детекції: {e}")
        
        return None
    
    def _group_lines(self, lines: np.ndarray, image_shape: Tuple[int, int]) -> List[Tuple[int, int, int, int]]:
        """Групування близьких ліній в регіони"""
        regions = []
        
        if lines is None:
            return regions
        
        # Спрощений алгоритм групування
        for line in lines:
            x1, y1, x2, y2 = line[0]
            
            # Створення bounding box навколо лінії з відступом
            margin = 20
            x = max(0, min(x1, x2) - margin)
            y = max(0, min(y1, y2) - margin)
            w = min(image_shape[1] - x, abs(x2 - x1) + 2 * margin)
            h = min(image_shape[0] - y, abs(y2 - y1) + 2 * margin)
            
            regions.append((x, y, w, h))
        
        return regions
    
    def _line_in_region(self, line: np.ndarray, region: Tuple[int, int, int, int]) -> bool:
        """Перевірка чи лінія в регіоні"""
        x1, y1, x2, y2 = line
        rx, ry, rw, rh = region
        
        return (rx <= x1 <= rx + rw and ry <= y1 <= ry + rh and
                rx <= x2 <= rx + rw and ry <= y2 <= ry + rh)
    
    def _line_length(self, line: np.ndarray) -> float:
        """Розрахунок довжини лінії"""
        x1, y1, x2, y2 = line
        return np.sqrt((x2 - x1)**2 + (y2 - y1)**2)
    
    def _assess_overall_condition(self, defects: List[DefectDetection]) -> str:
        """Оцінка загального стану на основі дефектів"""
        if not defects:
            return "excellent"
        
        severity_scores = {"low": 1, "medium": 3, "high": 5}
        total_score = sum(severity_scores.get(d.severity, 0) * d.confidence for d in defects)
        
        if total_score >= 10:
            return "critical"
        elif total_score >= 6:
            return "poor"
        elif total_score >= 3:
            return "fair"
        else:
            return "good"
    
    def _generate_recommendations(self, defects: List[DefectDetection], qr_result: Optional[Dict]) -> List[str]:
        """Генерація рекомендацій на основі аналізу"""
        recommendations = []
        
        # Рекомендації на основі дефектів
        defect_counts = {}
        for defect in defects:
            defect_type = defect.defect_type
            if defect_type not in defect_counts:
                defect_counts[defect_type] = {"count": 0, "max_severity": "low"}
            
            defect_counts[defect_type]["count"] += 1
            
            if defect.severity == "high":
                defect_counts[defect_type]["max_severity"] = "high"
            elif defect.severity == "medium" and defect_counts[defect_type]["max_severity"] != "high":
                defect_counts[defect_type]["max_severity"] = "medium"
        
        # Рекомендації по типам дефектів
        for defect_type, info in defect_counts.items():
            if defect_type == "rust":
                if info["max_severity"] == "high":
                    recommendations.append("🚨 ТЕРМІНОВО: Критична корозія потребує негайного ремонту")
                elif info["count"] > 2:
                    recommendations.append("⚠️ Множинні осередки корозії - запланувати антикорозійну обробку")
                else:
                    recommendations.append("🔧 Локальна корозія - провести точкове відновлення")
            
            elif defect_type == "cracks":
                if info["max_severity"] == "high":
                    recommendations.append("🚨 КРИТИЧНО: Серйозні тріщини - зупинити експлуатацію")
                else:
                    recommendations.append("🔍 Тріщини виявлені - провести детальну діагностику")
            
            elif defect_type == "wear":
                if info["max_severity"] == "high":
                    recommendations.append("🔄 Критичний знос - заміна компонентів")
                else:
                    recommendations.append("📅 Запланувати превентивне обслуговування")
            
            elif defect_type == "dirt":
                if info["count"] > 3:
                    recommendations.append("🧽 Загальне очищення та санітарна обробка")
                else:
                    recommendations.append("🧹 Локальне очищення забруднених ділянок")
        
        # Рекомендації по QR коду
        if qr_result:
            recommendations.append(f"📱 QR код виявлено: {qr_result['data']}")
        else:
            recommendations.append("❓ QR код не виявлено - перевірити наявність та читабельність")
        
        # Загальні рекомендації
        if len(defects) > 5:
            recommendations.append("📋 Множинні проблеми - провести комплексну перевірку")
        
        if not recommendations:
            recommendations.append("✅ Стан обладнання задовільний - продовжити планове обслуговування")
        
        return recommendations
    
    def _calculate_confidence(self, defects: List[DefectDetection]) -> float:
        """Розрахунок загальної впевненості аналізу"""
        if not defects:
            return 0.8  # базовий рівень впевненості для чистих зображень
        
        # Середня впевненість по всіх дефектах
        avg_confidence = sum(d.confidence for d in defects) / len(defects)
        
        # Корекція на основі кількості дефектів
        count_factor = min(1.0, len(defects) / 10)
        
        return min(0.95, avg_confidence * (0.7 + 0.3 * count_factor))

# API інтерфейс для Computer Vision
class VisionAPI:
    """API інтерфейс для комп'ютерного зору"""
    
    def __init__(self):
        self.vision = LiftVision()
        self.db_path = "vision_analysis.db"
        self._init_database()
    
    def _init_database(self):
        """Ініціалізація бази даних для зберігання результатів"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS vision_analysis (
                id INTEGER PRIMARY KEY,
                image_id TEXT UNIQUE,
                lift_id TEXT,
                timestamp TIMESTAMP,
                overall_condition TEXT,
                confidence_score REAL,
                defects_json TEXT,
                recommendations_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def analyze_image_base64(self, base64_data: str, lift_id: str = None) -> Dict[str, Any]:
        """Аналіз зображення з base64 даних"""
        try:
            # Декодування base64
            image_data = base64.b64decode(base64_data)
            
            # Аналіз зображення
            analysis = self.vision.analyze_image(image_data)
            
            # Збереження результатів
            self._save_analysis(analysis, lift_id)
            
            # Повернення результатів
            return {
                "success": True,
                "image_id": analysis.image_id,
                "timestamp": analysis.timestamp.isoformat(),
                "overall_condition": analysis.overall_condition,
                "confidence_score": analysis.confidence_score,
                "defects": [
                    {
                        "type": d.defect_type,
                        "confidence": d.confidence,
                        "location": d.location,
                        "severity": d.severity,
                        "description": d.description
                    } for d in analysis.defects
                ],
                "recommendations": analysis.recommendations
            }
            
        except Exception as e:
            logger.error(f"Помилка аналізу зображення: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _save_analysis(self, analysis: VisionAnalysis, lift_id: str = None):
        """Збереження результатів аналізу"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            defects_json = json.dumps([
                {
                    "type": d.defect_type,
                    "confidence": d.confidence,
                    "location": d.location,
                    "severity": d.severity,
                    "description": d.description
                } for d in analysis.defects
            ])
            
            recommendations_json = json.dumps(analysis.recommendations)
            
            cursor.execute('''
                INSERT OR REPLACE INTO vision_analysis 
                (image_id, lift_id, timestamp, overall_condition, confidence_score, 
                 defects_json, recommendations_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                analysis.image_id,
                lift_id,
                analysis.timestamp,
                analysis.overall_condition,
                analysis.confidence_score,
                defects_json,
                recommendations_json
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Помилка збереження аналізу: {e}")
    
    def get_analysis_history(self, lift_id: str = None) -> List[Dict[str, Any]]:
        """Отримання історії аналізів"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            if lift_id:
                cursor.execute('''
                    SELECT * FROM vision_analysis 
                    WHERE lift_id = ? 
                    ORDER BY timestamp DESC 
                    LIMIT 10
                ''', (lift_id,))
            else:
                cursor.execute('''
                    SELECT * FROM vision_analysis 
                    ORDER BY timestamp DESC 
                    LIMIT 20
                ''')
            
            results = cursor.fetchall()
            conn.close()
            
            history = []
            for row in results:
                history.append({
                    "id": row[0],
                    "image_id": row[1],
                    "lift_id": row[2],
                    "timestamp": row[3],
                    "overall_condition": row[4],
                    "confidence_score": row[5],
                    "defects": json.loads(row[6]) if row[6] else [],
                    "recommendations": json.loads(row[7]) if row[7] else [],
                    "created_at": row[8]
                })
            
            return history
            
        except Exception as e:
            logger.error(f"Помилка отримання історії: {e}")
            return []

# Тестування модуля
if __name__ == "__main__":
    print("🔍 Тестування Computer Vision модуля DeapSeaK")
    
    vision_api = VisionAPI()
    
    # Симуляція тестового зображення (1x1 пиксель в base64)
    test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    
    print("\n📸 Аналіз тестового зображення...")
    result = vision_api.analyze_image_base64(test_image_base64, "lift_001")
    
    print(f"✅ Успішність: {result.get('success')}")
    print(f"🎯 Загальний стан: {result.get('overall_condition')}")
    print(f"📊 Впевненість: {result.get('confidence_score', 0):.2f}")
    print(f"🔍 Дефектів знайдено: {len(result.get('defects', []))}")
    print(f"💡 Рекомендацій: {len(result.get('recommendations', []))}")
    
    for i, rec in enumerate(result.get('recommendations', []), 1):
        print(f"   {i}. {rec}")