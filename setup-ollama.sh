#!/bin/bash
# ═══════════════════════════════════════════════════════════
# 🦙 FestLift — Ollama / Gemma 3 Setup (One-Shot)
# ═══════════════════════════════════════════════════════════
# Встановлює Ollama і завантажує gemma3:12b для автономного AI
# Запуск: bash setup-ollama.sh [4b|12b|27b]
# ═══════════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

MODEL_SIZE="${1:-12b}"
MODEL="gemma3:${MODEL_SIZE}"

echo -e "${CYAN}"
cat << "EOF"
╔══════════════════════════════════════════╗
║   🦙 FestLift — Ollama + Gemma 3 Setup   ║
║   Автономний AI без хмари і API ключів   ║
╚══════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${BLUE}📦 Модель: ${MODEL}${NC}"
case "$MODEL_SIZE" in
    4b)  echo -e "${BLUE}💾 Розмір: ~3 GB RAM${NC}" ;;
    12b) echo -e "${BLUE}💾 Розмір: ~8 GB RAM${NC}" ;;
    27b) echo -e "${BLUE}💾 Розмір: ~18 GB RAM${NC}" ;;
    *)   echo -e "${YELLOW}⚠️  Невідомий розмір, використовую 12b${NC}"; MODEL="gemma3:12b" ;;
esac
echo ""

# 1 ─── Ollama install ────────────────────────────────────────────────────────
echo -e "${YELLOW}━━━━ Крок 1/4: Перевірка Ollama ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if command -v ollama &> /dev/null; then
    OLLAMA_VERSION=$(ollama --version 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✅ Ollama вже встановлено: ${OLLAMA_VERSION}${NC}"
else
    echo -e "${YELLOW}📥 Встановлюю Ollama...${NC}"
    curl -fsSL https://ollama.com/install.sh | sh
    echo -e "${GREEN}✅ Ollama встановлено${NC}"
fi

# 2 ─── Start Ollama service ──────────────────────────────────────────────────
echo -e "\n${YELLOW}━━━━ Крок 2/4: Запуск Ollama сервісу ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Ollama вже запущено на порту 11434${NC}"
else
    echo -e "${YELLOW}⚙️  Запускаю Ollama в фоні...${NC}"
    nohup ollama serve > /tmp/ollama.log 2>&1 &
    OLLAMA_PID=$!
    echo -e "${BLUE}📝 Ollama PID: ${OLLAMA_PID}${NC}"

    # Wait for Ollama to start
    echo -e "${YELLOW}⏳ Очікую запуску (до 15 сек)...${NC}"
    for i in $(seq 1 15); do
        sleep 1
        if curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Ollama готова${NC}"
            break
        fi
        if [ "$i" -eq 15 ]; then
            echo -e "${RED}❌ Ollama не відповіла за 15 секунд${NC}"
            echo -e "${YELLOW}📋 Логи: tail /tmp/ollama.log${NC}"
            exit 1
        fi
    done
fi

# 3 ─── Pull model ────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}━━━━ Крок 3/4: Завантаження моделі ${MODEL} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if ollama list 2>/dev/null | grep -q "${MODEL}"; then
    echo -e "${GREEN}✅ Модель ${MODEL} вже завантажена${NC}"
else
    echo -e "${YELLOW}📥 Завантажую ${MODEL}... (може зайняти кілька хвилин)${NC}"
    echo -e "${BLUE}💡 Прогрес відображається нижче — НЕ переривайте!${NC}\n"
    ollama pull "${MODEL}"
    echo -e "\n${GREEN}✅ Модель ${MODEL} завантажена${NC}"
fi

# 4 ─── Quick smoke test ──────────────────────────────────────────────────────
echo -e "\n${YELLOW}━━━━ Крок 4/4: Тест моделі ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🧪 Надсилаю тестовий запит до ${MODEL}...${NC}"

TEST_RESPONSE=$(curl -s http://localhost:11434/api/generate \
    -H "Content-Type: application/json" \
    -d "{\"model\": \"${MODEL}\", \"prompt\": \"Responde em uma frase: o que é FestLift?\", \"stream\": false}" \
    | node -e "process.stdin.resume(); let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{ try{ console.log(JSON.parse(d).response||'(sem resposta)') }catch(e){ console.log('Erro JSON: '+d.substring(0,200)) } })" 2>/dev/null \
    || echo "(teste falhou — mas modelo está instalado)")

echo -e "${GREEN}Resposta do modelo:${NC}"
echo -e "${CYAN}${TEST_RESPONSE}${NC}"

# 5 ─── Update .env ───────────────────────────────────────────────────────────
if [ -f ".env" ]; then
    ENV_FILE=".env"
elif [ -f "/workspaces/deapseak/.env" ]; then
    ENV_FILE="/workspaces/deapseak/.env"
else
    ENV_FILE=""
fi

if [ -n "$ENV_FILE" ]; then
    # Update OLLAMA_MODEL if different
    if grep -q "^OLLAMA_MODEL=" "$ENV_FILE"; then
        sed -i "s|^OLLAMA_MODEL=.*|OLLAMA_MODEL=${MODEL}|" "$ENV_FILE"
    fi
    echo -e "\n${GREEN}✅ .env actualizado com OLLAMA_MODEL=${MODEL}${NC}"
fi

# ─── Final summary ─────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ OLLAMA CONFIGURADO!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📋 Resumo:${NC}"
echo -e "  ${CYAN}Modelo activo:${NC}  ${MODEL}"
echo -e "  ${CYAN}Endpoint:${NC}       http://127.0.0.1:11434"
echo -e "  ${CYAN}AI_PROVIDER:${NC}    auto (detecção automática no FestLift)"
echo ""
echo -e "${BLUE}💡 Como usar:${NC}"
echo -e "  1. Ollama já está a correr → reinicia o servidor FestLift: ${CYAN}./autostart.sh${NC}"
echo -e "  2. Sistema usa Gemma 3 automaticamente (AI_PROVIDER=auto)"
echo -e "  3. Se Ollama parar → sistema faz fallback para Gemini automaticamente"
echo ""
echo -e "${YELLOW}⚡ Para manter Ollama no próximo boot (opcional):${NC}"
echo -e "  sudo systemctl enable ollama   # se instalado como serviço systemd"
echo -e "  # OU adicionar ao autostart.sh: nohup ollama serve > /tmp/ollama.log 2>&1 &"
echo ""
echo -e "${CYAN}🎯 Pronto! Reinicia o servidor: ${GREEN}./autostart.sh${NC}"
