/**
 * 🤖 Universal AI Assistant Widget
 * 
 * Універсальний віджет AI асистента для всіх ролей
 * Автоматично визначає роль користувача та адаптує функціонал
 * 
 * Використання: просто додайте <script src="/components/ai-widget-universal.js"></script>
 * 
 * @version 2.0.0
 * @author DeapSeaK Team
 */

(function() {
    'use strict';

    // ============================================
    // 🎨 КОНФІГУРАЦІЯ
    // ============================================
    
    const CONFIG = {
        // API endpoints
        API_BASE: '/api',
        AI_CHAT_ENDPOINT: '/api/ai/chat',
        
        // Позиція віджету
        position: {
            bottom: '24px',
            right: '24px'
        },
        
        // Кольори для різних ролей
        colors: {
            admin: '#3a86ff',
            dispatcher: '#06d6a0',
            technician: '#f77f00',
            client: '#8338ec',
            default: '#3a86ff'
        },
        
        // Іконки для різних ролей
        icons: {
            admin: 'fa-user-shield',
            dispatcher: 'fa-headset',
            technician: 'fa-wrench',
            client: 'fa-user',
            default: 'fa-robot'
        },
        
        // Текст привітання для ролей
        greetings: {
            admin: '👨‍💼 Привіт, Адмін! Я допоможу з аналітикою та управлінням системою.',
            dispatcher: '📞 Привіт! Допоможу з призначенням техніків та моніторингом.',
            technician: '🔧 Привіт! Готовий допомогти з технічними питаннями та інструкціями.',
            client: '👤 Привіт! Чим можу допомогти? Запити, історія обслуговування?',
            default: '🤖 Привіт! Я ваш AI асистент. Чим можу допомогти?'
        }
    };

    // ============================================
    // 🔐 JWT ДЕКОДЕР
    // ============================================
    
    function decodeJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error('❌ Error decoding JWT:', e);
            return null;
        }
    }

    function getUserRole() {
        const token = localStorage.getItem('token');
        if (!token) return 'default';
        
        const decoded = decodeJWT(token);
        return decoded?.role || 'default';
    }

    function isAuthenticated() {
        const token = localStorage.getItem('token');
        if (!token) return false;
        
        const decoded = decodeJWT(token);
        if (!decoded || !decoded.exp) return false;
        
        // Перевірка терміну дії
        const now = Math.floor(Date.now() / 1000);
        return decoded.exp > now;
    }

    // ============================================
    // 🎨 СТИЛІ
    // ============================================
    
    function injectStyles(role) {
        const color = CONFIG.colors[role] || CONFIG.colors.default;
        
        const styles = `
            /* AI Widget Universal Styles */
            #ai-widget-universal {
                position: fixed;
                bottom: ${CONFIG.position.bottom};
                right: ${CONFIG.position.right};
                z-index: 9999;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }

            .ai-fab-button {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%);
                border: none;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 28px;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
            }

            .ai-fab-button::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 0;
                height: 0;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.3);
                transform: translate(-50%, -50%);
                transition: width 0.6s, height 0.6s;
            }

            .ai-fab-button:hover::before {
                width: 100%;
                height: 100%;
            }

            .ai-fab-button:hover {
                transform: translateY(-3px) scale(1.05);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2), 0 3px 6px rgba(0, 0, 0, 0.15);
            }

            .ai-fab-button:active {
                transform: translateY(-1px) scale(1.02);
            }

            .ai-fab-button i {
                position: relative;
                z-index: 1;
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0%, 100% {
                    transform: scale(1);
                }
                50% {
                    transform: scale(1.1);
                }
            }

            /* Notification Badge */
            .ai-notification-badge {
                position: absolute;
                top: -2px;
                right: -2px;
                background: #ff3b3b;
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                font-size: 11px;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid white;
                animation: bounce 0.5s ease-in-out;
            }

            @keyframes bounce {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.2); }
            }

            /* Chat Modal */
            .ai-chat-modal {
                display: none;
                position: fixed;
                bottom: 100px;
                right: ${CONFIG.position.right};
                width: 380px;
                max-width: calc(100vw - 48px);
                height: 550px;
                max-height: calc(100vh - 140px);
                background: white;
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                overflow: hidden;
                flex-direction: column;
                z-index: 99999;
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .ai-chat-modal.visible {
                display: flex;
                animation: slideUp 0.3s ease-out;
            }

            .ai-chat-header {
                background: linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%);
                color: white;
                padding: 16px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .ai-chat-header h4 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .ai-chat-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }

            .ai-chat-close:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            .ai-chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                background: #f8f9fa;
            }

            .ai-message {
                margin-bottom: 16px;
                animation: messageSlide 0.3s ease-out;
            }

            @keyframes messageSlide {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .ai-message-content {
                display: inline-block;
                max-width: 85%;
                padding: 12px 16px;
                border-radius: 12px;
                word-wrap: break-word;
            }

            .ai-message-assistant .ai-message-content {
                background: white;
                color: #333;
                border: 1px solid #e0e0e0;
            }

            .ai-message-user {
                text-align: right;
            }

            .ai-message-user .ai-message-content {
                background: ${color};
                color: white;
            }

            .ai-message-time {
                font-size: 11px;
                color: #999;
                margin-top: 4px;
            }

            .ai-message-user .ai-message-time {
                color: rgba(255, 255, 255, 0.8);
            }

            .ai-typing {
                display: inline-flex;
                gap: 4px;
                padding: 12px 16px;
            }

            .ai-typing span {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #999;
                animation: typing 1.4s infinite;
            }

            .ai-typing span:nth-child(2) {
                animation-delay: 0.2s;
            }

            .ai-typing span:nth-child(3) {
                animation-delay: 0.4s;
            }

            @keyframes typing {
                0%, 60%, 100% {
                    transform: translateY(0);
                    opacity: 0.7;
                }
                30% {
                    transform: translateY(-10px);
                    opacity: 1;
                }
            }

            .ai-chat-input {
                padding: 16px;
                background: white;
                border-top: 1px solid #e0e0e0;
            }

            .ai-input-wrapper {
                display: flex;
                gap: 8px;
                margin-bottom: 8px;
            }

            .ai-message-input {
                flex: 1;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 10px 12px;
                font-size: 14px;
                resize: none;
                font-family: inherit;
                transition: border-color 0.2s;
            }

            .ai-message-input:focus {
                outline: none;
                border-color: ${color};
            }

            .ai-send-btn {
                background: ${color};
                color: white;
                border: none;
                border-radius: 8px;
                padding: 0 16px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
            }

            .ai-send-btn:hover {
                background: ${adjustColor(color, -15)};
                transform: translateY(-1px);
            }

            .ai-send-btn:disabled {
                background: #ccc;
                cursor: not-allowed;
                transform: none;
            }

            .ai-quick-actions {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }

            .ai-quick-btn {
                background: #f0f0f0;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                padding: 6px 12px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .ai-quick-btn:hover {
                background: ${color};
                color: white;
                border-color: ${color};
            }

            /* Mobile Responsive */
            @media (max-width: 480px) {
                .ai-chat-modal {
                    width: calc(100vw - 32px);
                    height: calc(100vh - 120px);
                    right: 16px;
                    bottom: 90px;
                }

                #ai-widget-universal {
                    bottom: 16px;
                    right: 16px;
                }
            }

            /* Scrollbar */
            .ai-chat-messages::-webkit-scrollbar {
                width: 6px;
            }

            .ai-chat-messages::-webkit-scrollbar-track {
                background: #f1f1f1;
            }

            .ai-chat-messages::-webkit-scrollbar-thumb {
                background: #ccc;
                border-radius: 3px;
            }

            .ai-chat-messages::-webkit-scrollbar-thumb:hover {
                background: #999;
            }
        `;

        const styleElement = document.createElement('style');
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    }

    // Допоміжна функція для зміни яскравості кольору
    function adjustColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255))
            .toString(16).slice(1);
    }

    // ============================================
    // 🏗️ HTML СТРУКТУРА
    // ============================================
    
    function createWidget(role) {
        const icon = CONFIG.icons[role] || CONFIG.icons.default;
        const greeting = CONFIG.greetings[role] || CONFIG.greetings.default;
        
        const widgetHTML = `
            <div id="ai-widget-universal">
                <!-- Floating Button -->
                <button class="ai-fab-button" id="ai-fab-btn" title="AI Асистент">
                    <i class="fas ${icon}"></i>
                </button>

                <!-- Chat Modal -->
                <div class="ai-chat-modal" id="ai-chat-modal">
                    <div class="ai-chat-header">
                        <h4>
                            <i class="fas ${icon}"></i>
                            AI Асистент
                        </h4>
                        <button class="ai-chat-close" id="ai-chat-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="ai-chat-messages" id="ai-chat-messages">
                        <div class="ai-message ai-message-assistant">
                            <div class="ai-message-content">
                                ${greeting}
                                <div class="ai-message-time">Зараз</div>
                            </div>
                        </div>
                    </div>

                    <div class="ai-chat-input">
                        <div class="ai-input-wrapper">
                            <textarea 
                                class="ai-message-input" 
                                id="ai-message-input" 
                                placeholder="Напишіть повідомлення..."
                                rows="1"
                            ></textarea>
                            <button class="ai-send-btn" id="ai-send-btn">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                        <div class="ai-quick-actions" id="ai-quick-actions">
                            ${getQuickActionsForRole(role)}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', widgetHTML);
    }

    function getQuickActionsForRole(role) {
        const actions = {
            admin: [
                '<button class="ai-quick-btn" data-query="Показати статистику системи">📊 Статистика</button>',
                '<button class="ai-quick-btn" data-query="Аналіз ризиків">⚠️ Ризики</button>',
                '<button class="ai-quick-btn" data-query="Звіт за тиждень">📈 Звіт</button>'
            ],
            dispatcher: [
                '<button class="ai-quick-btn" data-query="Доступні техніки">👷 Техніки</button>',
                '<button class="ai-quick-btn" data-query="Активні запити">📋 Запити</button>',
                '<button class="ai-quick-btn" data-query="Термінові завдання">🚨 Терміново</button>'
            ],
            technician: [
                '<button class="ai-quick-btn" data-query="Мої завдання">📝 Завдання</button>',
                '<button class="ai-quick-btn" data-query="Діагностика проблеми">🔧 Діагностика</button>',
                '<button class="ai-quick-btn" data-query="Інструкції безпеки">⚠️ Безпека</button>'
            ],
            client: [
                '<button class="ai-quick-btn" data-query="Мої ліфти">🏢 Мої ліфти</button>',
                '<button class="ai-quick-btn" data-query="Історія обслуговування">📜 Історія</button>',
                '<button class="ai-quick-btn" data-query="Створити запит">➕ Запит</button>'
            ],
            default: [
                '<button class="ai-quick-btn" data-query="Допомога">❓ Допомога</button>',
                '<button class="ai-quick-btn" data-query="Що ти вмієш?">💡 Функції</button>'
            ]
        };

        return (actions[role] || actions.default).join('');
    }

    // ============================================
    // 💬 CHAT ФУНКЦІОНАЛ
    // ============================================
    
    class AIChat {
        constructor() {
            this.messages = [];
            this.isTyping = false;
        }

        init() {
            this.messagesContainer = document.getElementById('ai-chat-messages');
            this.input = document.getElementById('ai-message-input');
            this.sendBtn = document.getElementById('ai-send-btn');

            // Event listeners
            this.sendBtn.addEventListener('click', () => this.sendMessage());
            this.input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // Quick actions
            document.querySelectorAll('.ai-quick-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const query = btn.getAttribute('data-query');
                    this.input.value = query;
                    this.sendMessage();
                });
            });

            // Auto-resize textarea
            this.input.addEventListener('input', () => {
                this.input.style.height = 'auto';
                this.input.style.height = Math.min(this.input.scrollHeight, 100) + 'px';
            });
        }

        async sendMessage() {
            const text = this.input.value.trim();
            if (!text || this.isTyping) return;

            // Перевірка автентифікації
            if (!isAuthenticated()) {
                this.addMessage('Будь ласка, увійдіть в систему для використання AI асистента.', 'assistant');
                setTimeout(() => {
                    window.location.href = '/pages/auth/login.html';
                }, 2000);
                return;
            }

            // Додати повідомлення користувача
            this.addMessage(text, 'user');
            this.input.value = '';
            this.input.style.height = 'auto';

            // Показати typing indicator
            this.showTyping();

            try {
                // Відправити на сервер
                const response = await fetch(CONFIG.AI_CHAT_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        message: text,
                        history: this.messages.slice(-5) // Останні 5 повідомлень для контексту
                    })
                });

                this.hideTyping();

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                this.addMessage(data.reply || data.message || 'Вибачте, сталася помилка.', 'assistant');

            } catch (error) {
                console.error('❌ AI Chat Error:', error);
                this.hideTyping();
                this.addMessage('❌ Не вдалося отримати відповідь. Спробуйте пізніше.', 'assistant');
            }
        }

        addMessage(text, sender) {
            const time = new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
            const messageClass = sender === 'user' ? 'ai-message-user' : 'ai-message-assistant';
            
            const messageHTML = `
                <div class="ai-message ${messageClass}">
                    <div class="ai-message-content">
                        ${this.formatMessage(text)}
                        <div class="ai-message-time">${time}</div>
                    </div>
                </div>
            `;

            this.messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
            this.scrollToBottom();

            // Зберегти в історію
            this.messages.push({ sender, text, time });
        }

        formatMessage(text) {
            // Базове форматування
            return text
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`(.*?)`/g, '<code>$1</code>')
                .replace(/\n/g, '<br>');
        }

        showTyping() {
            this.isTyping = true;
            this.sendBtn.disabled = true;
            
            const typingHTML = `
                <div class="ai-message ai-message-assistant" id="ai-typing">
                    <div class="ai-typing">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            `;
            
            this.messagesContainer.insertAdjacentHTML('beforeend', typingHTML);
            this.scrollToBottom();
        }

        hideTyping() {
            this.isTyping = false;
            this.sendBtn.disabled = false;
            
            const typingElement = document.getElementById('ai-typing');
            if (typingElement) {
                typingElement.remove();
            }
        }

        scrollToBottom() {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }

    // ============================================
    // 🚀 ІНІЦІАЛІЗАЦІЯ
    // ============================================
    
    function init() {
        // ⚠️ НЕ показувати на сторінках авторизації
        const currentPath = window.location.pathname.toLowerCase();
        const authPages = ['/login', '/register', '/reset-password', '/forgot-password', 'auth/login', 'auth/register'];
        
        if (authPages.some(page => currentPath.includes(page))) {
            console.log('🚫 AI Widget: пропускаємо на сторінці авторизації');
            return; // ⚠️ ВИХОДИМО - не створюємо віджет на логін сторінці
        }
        
        // Перевірка Font Awesome
        if (!document.querySelector('link[href*="font-awesome"]') && !document.querySelector('link[href*="fontawesome"]')) {
            const faLink = document.createElement('link');
            faLink.rel = 'stylesheet';
            faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            document.head.appendChild(faLink);
        }

        // Визначити роль
        const role = getUserRole();
        console.log(`🤖 AI Widget Universal: роль користувача - ${role}`);

        // Додати стилі
        injectStyles(role);

        // Створити віджет
        createWidget(role);

        // Ініціалізувати chat
        const chat = new AIChat();
        chat.init();

        // Event listeners для відкриття/закриття
        const fabBtn = document.getElementById('ai-fab-btn');
        const modal = document.getElementById('ai-chat-modal');
        const closeBtn = document.getElementById('ai-chat-close');

        // ✅ Відкривати ТІЛЬКИ по кліку на кнопку
        fabBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            modal.classList.toggle('visible');
            if (modal.classList.contains('visible')) {
                document.getElementById('ai-message-input').focus();
            }
        });

        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            modal.classList.remove('visible');
        });

        // Закрити при кліку поза модалкою
        document.addEventListener('click', (e) => {
            if (modal.classList.contains('visible') && 
                !modal.contains(e.target) && 
                !fabBtn.contains(e.target)) {
                modal.classList.remove('visible');
            }
        });

        // Закрити на Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('visible')) {
                modal.classList.remove('visible');
            }
        });

        console.log('✅ AI Widget Universal: ініціалізовано успішно!');
    }

    // Запуск після завантаження DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
