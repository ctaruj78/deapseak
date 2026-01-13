#!/bin/bash

# ═══════════════════════════════════════════════════════════════
#  ТЕСТ ВСІХ ПОСИЛАНЬ У ВСІХ ПАНЕЛЯХ
#  Перевіряє що кожна панель веде тільки на свої сторінки
# ═══════════════════════════════════════════════════════════════

BASE_DIR="/workspaces/deapseak"
REPORT_FILE="$BASE_DIR/panel-links-report.txt"

# Кольори
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  ПЕРЕВІРКА ПОСИЛАНЬ У ВСІХ ПАНЕЛЯХ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Очистити звіт
> "$REPORT_FILE"

# Функція для аналізу посилань у файлі
analyze_file_links() {
    local file=$1
    local panel=$2
    local filename=$(basename "$file")
    
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}📄 Аналіз: $filename (панель: $panel)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Записати в звіт
    echo "" >> "$REPORT_FILE"
    echo "═══════════════════════════════════════════════════════════════" >> "$REPORT_FILE"
    echo "📄 Файл: $filename" >> "$REPORT_FILE"
    echo "📁 Панель: $panel" >> "$REPORT_FILE"
    echo "═══════════════════════════════════════════════════════════════" >> "$REPORT_FILE"
    
    # Витягти всі href="/pages/..."
    local links=$(grep -oE 'href="(/pages/[^"]+)"' "$file" | sed 's/href="//;s/"//' | sort -u)
    
    if [ -z "$links" ]; then
        echo -e "${YELLOW}⚠️  Посилань не знайдено${NC}"
        echo "⚠️  Посилань не знайдено" >> "$REPORT_FILE"
        return
    fi
    
    local total_links=$(echo "$links" | wc -l)
    local bad_links=0
    local good_links=0
    
    echo -e "\n${CYAN}📊 Знайдено посилань: $total_links${NC}\n"
    echo "" >> "$REPORT_FILE"
    echo "📊 Знайдено посилань: $total_links" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # Перевірити кожне посилання
    while IFS= read -r link; do
        local target_file="$BASE_DIR$link"
        local exists="❌"
        
        # Перевірка існування файлу
        if [ -f "$target_file" ]; then
            exists="✅"
        fi
        
        # Визначити до якої панелі веде посилання
        local cross_panel=""
        case "$panel" in
            "admin")
                if [[ "$link" == *"/pages/client/"* ]]; then
                    cross_panel="${RED}🚨 КЛІЄНТ${NC}"
                    bad_links=$((bad_links + 1))
                elif [[ "$link" == *"/pages/dispatcher/"* ]]; then
                    cross_panel="${RED}🚨 ДИСПЕТЧЕР${NC}"
                    bad_links=$((bad_links + 1))
                elif [[ "$link" == *"/pages/tech/"* ]]; then
                    cross_panel="${RED}🚨 ТЕХНІК${NC}"
                    bad_links=$((bad_links + 1))
                elif [[ "$link" == *"/pages/admin/"* ]] || [[ "$link" == *"/pages/ai-assistant/"* ]]; then
                    cross_panel="${GREEN}✅ OK${NC}"
                    good_links=$((good_links + 1))
                else
                    cross_panel="${YELLOW}⚠️  ІНШЕ${NC}"
                    good_links=$((good_links + 1))
                fi
                ;;
            "client")
                if [[ "$link" == *"/pages/admin/"* ]]; then
                    cross_panel="${RED}🚨 АДМІН${NC}"
                    bad_links=$((bad_links + 1))
                elif [[ "$link" == *"/pages/dispatcher/"* ]]; then
                    cross_panel="${RED}🚨 ДИСПЕТЧЕР${NC}"
                    bad_links=$((bad_links + 1))
                elif [[ "$link" == *"/pages/tech/"* ]]; then
                    cross_panel="${RED}🚨 ТЕХНІК${NC}"
                    bad_links=$((bad_links + 1))
                elif [[ "$link" == *"/pages/client/"* ]] || [[ "$link" == *"/pages/ai-assistant/"* ]]; then
                    cross_panel="${GREEN}✅ OK${NC}"
                    good_links=$((good_links + 1))
                else
                    cross_panel="${YELLOW}⚠️  ІНШЕ${NC}"
                    good_links=$((good_links + 1))
                fi
                ;;
            "dispatcher")
                if [[ "$link" == *"/pages/admin/"* ]]; then
                    cross_panel="${RED}🚨 АДМІН${NC}"
                    bad_links=$((bad_links + 1))
                elif [[ "$link" == *"/pages/client/"* ]]; then
                    cross_panel="${RED}🚨 КЛІЄНТ${NC}"
                    bad_links=$((bad_links + 1))
                elif [[ "$link" == *"/pages/tech/"* ]]; then
                    cross_panel="${RED}🚨 ТЕХНІК${NC}"
                    bad_links=$((bad_links + 1))
                elif [[ "$link" == *"/pages/dispatcher/"* ]] || [[ "$link" == *"/pages/ai-assistant/"* ]]; then
                    cross_panel="${GREEN}✅ OK${NC}"
                    good_links=$((good_links + 1))
                else
                    cross_panel="${YELLOW}⚠️  ІНШЕ${NC}"
                    good_links=$((good_links + 1))
                fi
                ;;
            "tech")
                if [[ "$link" == *"/pages/admin/"* ]]; then
                    cross_panel="${RED}🚨 АДМІН${NC}"
                    bad_links=$((bad_links + 1))
                elif [[ "$link" == *"/pages/client/"* ]]; then
                    cross_panel="${RED}🚨 КЛІЄНТ${NC}"
                    bad_links=$((bad_links + 1))
                elif [[ "$link" == *"/pages/dispatcher/"* ]]; then
                    cross_panel="${RED}🚨 ДИСПЕТЧЕР${NC}"
                    bad_links=$((bad_links + 1))
                elif [[ "$link" == *"/pages/tech/"* ]] || [[ "$link" == *"/pages/ai-assistant/"* ]]; then
                    cross_panel="${GREEN}✅ OK${NC}"
                    good_links=$((good_links + 1))
                else
                    cross_panel="${YELLOW}⚠️  ІНШЕ${NC}"
                    good_links=$((good_links + 1))
                fi
                ;;
        esac
        
        # Вивести результат
        echo -e "  $exists $cross_panel  $link"
        
        # Записати в звіт
        if [[ "$cross_panel" == *"🚨"* ]]; then
            echo "  ❌ ПРОБЛЕМА: $link → $(echo "$cross_panel" | sed 's/\x1b\[[0-9;]*m//g')" >> "$REPORT_FILE"
        elif [[ "$exists" == "❌" ]]; then
            echo "  ❌ НЕ ІСНУЄ: $link" >> "$REPORT_FILE"
        else
            echo "  ✅ OK: $link" >> "$REPORT_FILE"
        fi
    done <<< "$links"
    
    # Підсумок для файлу
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    if [ $bad_links -gt 0 ]; then
        echo -e "${RED}❌ ПОМИЛКИ: $bad_links посилань ведуть на чужі панелі!${NC}"
        echo -e "${GREEN}✅ OK: $good_links${NC}"
    else
        echo -e "${GREEN}✅ Всі посилання коректні ($good_links)${NC}"
    fi
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    echo "" >> "$REPORT_FILE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$REPORT_FILE"
    echo "❌ ПРОБЛЕМНІ: $bad_links" >> "$REPORT_FILE"
    echo "✅ КОРЕКТНІ: $good_links" >> "$REPORT_FILE"
    echo "📊 ВСЬОГО: $total_links" >> "$REPORT_FILE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$REPORT_FILE"
}

# ═══════════════════════════════════════════════════════════════
#  АНАЛІЗ ПАНЕЛЕЙ
# ═══════════════════════════════════════════════════════════════

TOTAL_BAD_LINKS=0
TOTAL_GOOD_LINKS=0
TOTAL_FILES=0

# 1. АДМІН ПАНЕЛЬ
echo -e "\n${YELLOW}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║                      👨‍💼 АДМІН ПАНЕЛЬ                          ║${NC}"
echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════════╝${NC}"

echo "" >> "$REPORT_FILE"
echo "╔═══════════════════════════════════════════════════════════════╗" >> "$REPORT_FILE"
echo "║                      👨‍💼 АДМІН ПАНЕЛЬ                          ║" >> "$REPORT_FILE"
echo "╚═══════════════════════════════════════════════════════════════╝" >> "$REPORT_FILE"

for file in $BASE_DIR/pages/admin/*.html; do
    if [ -f "$file" ]; then
        TOTAL_FILES=$((TOTAL_FILES + 1))
        analyze_file_links "$file" "admin"
    fi
done

# 2. КЛІЄНТСЬКА ПАНЕЛЬ
echo -e "\n${YELLOW}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║                      👤 КЛІЄНТСЬКА ПАНЕЛЬ                      ║${NC}"
echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════════╝${NC}"

echo "" >> "$REPORT_FILE"
echo "╔═══════════════════════════════════════════════════════════════╗" >> "$REPORT_FILE"
echo "║                      👤 КЛІЄНТСЬКА ПАНЕЛЬ                      ║" >> "$REPORT_FILE"
echo "╚═══════════════════════════════════════════════════════════════╝" >> "$REPORT_FILE"

for file in $BASE_DIR/pages/client/*.html; do
    if [ -f "$file" ]; then
        TOTAL_FILES=$((TOTAL_FILES + 1))
        analyze_file_links "$file" "client"
    fi
done

# 3. ДИСПЕТЧЕРСЬКА ПАНЕЛЬ
echo -e "\n${YELLOW}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║                    📞 ДИСПЕТЧЕРСЬКА ПАНЕЛЬ                    ║${NC}"
echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════════╝${NC}"

echo "" >> "$REPORT_FILE"
echo "╔═══════════════════════════════════════════════════════════════╗" >> "$REPORT_FILE"
echo "║                    📞 ДИСПЕТЧЕРСЬКА ПАНЕЛЬ                    ║" >> "$REPORT_FILE"
echo "╚═══════════════════════════════════════════════════════════════╝" >> "$REPORT_FILE"

for file in $BASE_DIR/pages/dispatcher/*.html; do
    if [ -f "$file" ]; then
        TOTAL_FILES=$((TOTAL_FILES + 1))
        analyze_file_links "$file" "dispatcher"
    fi
done

# 4. ТЕХНІЧНА ПАНЕЛЬ
echo -e "\n${YELLOW}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║                      🔧 ТЕХНІЧНА ПАНЕЛЬ                        ║${NC}"
echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════════╝${NC}"

echo "" >> "$REPORT_FILE"
echo "╔═══════════════════════════════════════════════════════════════╗" >> "$REPORT_FILE"
echo "║                      🔧 ТЕХНІЧНА ПАНЕЛЬ                        ║" >> "$REPORT_FILE"
echo "╚═══════════════════════════════════════════════════════════════╝" >> "$REPORT_FILE"

for file in $BASE_DIR/pages/tech/*.html; do
    if [ -f "$file" ]; then
        TOTAL_FILES=$((TOTAL_FILES + 1))
        analyze_file_links "$file" "tech"
    fi
done

# 5. AI АСИСТЕНТ (СПІЛЬНА ЗОНА)
echo -e "\n${YELLOW}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║                      🤖 AI АСИСТЕНТ                            ║${NC}"
echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════════╝${NC}"

echo "" >> "$REPORT_FILE"
echo "╔═══════════════════════════════════════════════════════════════╗" >> "$REPORT_FILE"
echo "║                      🤖 AI АСИСТЕНТ                            ║" >> "$REPORT_FILE"
echo "╚═══════════════════════════════════════════════════════════════╝" >> "$REPORT_FILE"

for file in $BASE_DIR/pages/ai-assistant/*.html; do
    if [ -f "$file" ]; then
        TOTAL_FILES=$((TOTAL_FILES + 1))
        # AI асистент може посилатися на будь-які панелі (спільна зона)
        echo -e "${CYAN}📄 $file (спільна зона)${NC}" | tee -a "$REPORT_FILE"
    fi
done

# ═══════════════════════════════════════════════════════════════
#  ФІНАЛЬНИЙ ЗВІТ
# ═══════════════════════════════════════════════════════════════

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}                       📊 ФІНАЛЬНИЙ ЗВІТ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📁 Перевірено файлів: $TOTAL_FILES${NC}"
echo -e "${GREEN}✅ Коректних посилань: $TOTAL_GOOD_LINKS${NC}"
echo -e "${RED}❌ Проблемних посилань: $TOTAL_BAD_LINKS${NC}"
echo ""

if [ $TOTAL_BAD_LINKS -eq 0 ]; then
    echo -e "${GREEN}🎉 ПЕРЕМОГА! Всі посилання коректні!${NC}"
else
    echo -e "${RED}⚠️  УВАГА! Знайдено $TOTAL_BAD_LINKS проблемних посилань!${NC}"
    echo -e "${YELLOW}📋 Детальний звіт: $REPORT_FILE${NC}"
fi

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Записати фінальний звіт
echo "" >> "$REPORT_FILE"
echo "═══════════════════════════════════════════════════════════════" >> "$REPORT_FILE"
echo "                       📊 ФІНАЛЬНИЙ ЗВІТ" >> "$REPORT_FILE"
echo "═══════════════════════════════════════════════════════════════" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "📁 Перевірено файлів: $TOTAL_FILES" >> "$REPORT_FILE"
echo "✅ Коректних посилань: $TOTAL_GOOD_LINKS" >> "$REPORT_FILE"
echo "❌ Проблемних посилань: $TOTAL_BAD_LINKS" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ $TOTAL_BAD_LINKS -eq 0 ]; then
    echo "🎉 ПЕРЕМОГА! Всі посилання коректні!" >> "$REPORT_FILE"
else
    echo "⚠️  УВАГА! Знайдено $TOTAL_BAD_LINKS проблемних посилань!" >> "$REPORT_FILE"
fi

echo "═══════════════════════════════════════════════════════════════" >> "$REPORT_FILE"

# Exit code
if [ $TOTAL_BAD_LINKS -gt 0 ]; then
    exit 1
else
    exit 0
fi
