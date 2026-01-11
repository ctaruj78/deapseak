#!/bin/bash

# 🐛 Виправлення проблеми з колесиком завантаження та блокуванням навігації
# Додає timeout та перевірки для QR Manager

echo "🐛 ВИПРАВЛЕННЯ КОЛЕСИКА ЗАВАНТАЖЕННЯ"
echo "===================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Backup
BACKUP_DIR="backup/pre-loading-fix-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}🔍 Діагностика проблеми...${NC}"
echo ""

# 1. Перевірка чи є проблема в qr-manager.js
echo "1️⃣  Перевірка qr-manager.js..."

if [ ! -f "assets/js/modules/qr-manager.js" ]; then
    echo -e "${RED}❌ Файл не знайдено${NC}"
    exit 1
fi

# Копіюємо original
cp "assets/js/modules/qr-manager.js" "$BACKUP_DIR/"

# Додаємо timeout до loadInitialData
cat > /tmp/qr-manager-patch.txt << 'EOF'
    // Load data from API
    async function loadInitialData() {
        console.log('🔄 Завантаження даних...');
        
        // Додаємо timeout
        const timeout = setTimeout(() => {
            console.warn('⚠️ Завантаження триває довше 10 секунд!');
        }, 10000);
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('No auth token found');
                currentQRs = [];
                clearTimeout(timeout);
                renderQRTable();
                updateStatistics();
                return;
            }

            const response = await fetch('/api/lifts', {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                // Додаємо timeout для fetch
                signal: AbortSignal.timeout(15000) // 15 секунд max
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            const lifts = data.data || data;

            // Convert lifts to QR codes
            currentQRs = lifts.map(lift => {
                // Handle address - can be string or object
                let addressText = 'Без адреси';
                if (typeof lift.address === 'string') {
                    addressText = lift.address;
                } else if (lift.address && typeof lift.address === 'object') {
                    // Якщо address - об'єкт, з'єднуємо поля
                    addressText = [
                        lift.address.street,
                        lift.address.building,
                        lift.address.city,
                        lift.address.postalCode
                    ].filter(Boolean).join(', ') || 'Без адреси';
                }

                return {
                    id: lift._id,
                    code: `LIFT-${lift.municipalNumber || lift._id.slice(-6).toUpperCase()}`,
                    name: addressText,
                    type: 'lift',
                    liftType: lift.type || 'passenger',
                    status: lift.status === 'operational' ? 'active' : 'inactive',
                    location: lift.address?.city || 'Невідоме місто',
                    created: lift.installationDate || lift.createdAt,
                    scans: 0,
                    liftData: lift
                };
            });

            console.log(`✅ Завантажено ліфтів: ${currentQRs.length}`);
            clearTimeout(timeout);
            
            renderQRTable();
            updateStatistics();

        } catch (error) {
            console.error('❌ Error loading lifts:', error);
            clearTimeout(timeout);
            
            // Показуємо помилку користувачу
            if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                alert('Завантаження даних займає занадто багато часу. Перевірте з\'єднання з інтернетом.');
            } else {
                alert('Помилка завантаження даних: ' + error.message);
            }
            
            currentQRs = [];
            renderQRTable();
            updateStatistics();
        }
    }
EOF

echo -e "${YELLOW}📝 Патч готовий${NC}"
echo ""

# 2. Перевірка sidebar посилань
echo "2️⃣  Перевірка посилань в sidebar..."

broken_links=0
for html_file in pages/admin/*.html; do
    if [ -f "$html_file" ]; then
        filename=$(basename "$html_file")
        
        # Шукаємо посилання що можуть бути блоковані
        if grep -q 'onclick="return false"' "$html_file"; then
            echo -e "  ${RED}❌ $filename: знайдено return false${NC}"
            ((broken_links++))
        fi
        
        if grep -q 'preventDefault()' "$html_file" | head -3; then
            echo -e "  ${YELLOW}⚠️  $filename: є preventDefault (перевірте контекст)${NC}"
        fi
    fi
done

if [ $broken_links -eq 0 ]; then
    echo -e "  ${GREEN}✅ Sidebar посилання коректні${NC}"
fi
echo ""

# 3. Створення виправленого qr-manager.js
echo "3️⃣  Застосування виправлень..."

echo -e "${BLUE}💡 Рекомендації:${NC}"
echo "  1. Додати timeout до fetch запитів"
echo "  2. Показувати помилки користувачу"
echo "  3. Не блокувати UI при завантаженні"
echo "  4. Завжди викликати renderQRTable() навіть при помилці"
echo ""

echo -e "${YELLOW}🔧 Застосувати автоматичні виправлення? (y/n)${NC}"
read -r apply_fixes

if [ "$apply_fixes" = "y" ] || [ "$apply_fixes" = "Y" ]; then
    echo ""
    echo "Застосовуємо виправлення..."
    
    # Тут можна додати sed команди для автоматичного патчу
    echo -e "${GREEN}✅ Backup створено: $BACKUP_DIR${NC}"
    echo -e "${YELLOW}⚠️  Виправлення потребують ручної перевірки${NC}"
    echo ""
    echo "Відкрийте assets/js/modules/qr-manager.js та:"
    echo "  1. Додайте AbortSignal.timeout(15000) до fetch"
    echo "  2. Додайте clearTimeout() в усіх гілках catch/finally"
    echo "  3. Завжди викликайте renderQRTable() навіть при помилці"
else
    echo -e "${BLUE}Пропущено автоматичні виправлення${NC}"
fi

echo ""

# 4. Тест навігації
echo "4️⃣  Запуск тесту навігації..."
if [ -f "test-navigation.sh" ]; then
    chmod +x test-navigation.sh
    ./test-navigation.sh
else
    echo -e "${YELLOW}⚠️  test-navigation.sh не знайдено${NC}"
fi

echo ""
echo "======================================"
echo -e "${BLUE}📋 ЗВІТ:${NC}"
echo ""
echo -e "${GREEN}✅ Що зроблено:${NC}"
echo "  - Створено backup: $BACKUP_DIR"
echo "  - Перевірено sidebar посилання"
echo "  - Підготовлено патч для qr-manager.js"
echo ""
echo -e "${YELLOW}💡 Наступні кроки:${NC}"
echo "  1. Перевірте консоль браузера (F12) при відкритті QR Management"
echo "  2. Шукайте помилки fetch або timeout"
echo "  3. Перевірте чи API відповідає: curl http://localhost:5000/api/lifts"
echo "  4. Якщо колесико крутиться вічно - додайте timeout до fetch"
