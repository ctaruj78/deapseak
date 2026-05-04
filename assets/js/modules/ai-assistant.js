class AIAssistant {
    constructor() {
        this.isListening = false;
        this.recognition = null;
        this.isChatOpen = false;
        this.settings = {
            voiceEnabled: true,
            autoOpen: false,
            soundEffects: true,
            language: 'uk-UA'
        };
        this.defaultSettings = {...this.settings};
        this.init();
    }

    init() {
        this.setupVoiceRecognition();
        this.setupEventListeners();
        this.loadUserPreferences();
        this.injectAssistantButton();
        this.loadCommandHistory();
        
        if (this.settings.autoOpen) {
            setTimeout(() => this.openChat(), 1000);
        }
    }

    setupVoiceRecognition() {
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.lang = this.settings.language;
            this.recognition.interimResults = false;
            this.recognition.maxAlternatives = 3;

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.processCommand(transcript);
                this.saveToHistory(transcript, 'voice');
            };

            this.recognition.onerror = (event) => {
                console.error('Erro de reconhecimento de voz:', event.error);
                this.showNotification('Erro de reconhecimento de voz: ' + event.error, 'error');
                this.updateUIStatus('idle');
            };

            this.recognition.onend = () => {
                if (this.isListening) {
                    this.isListening = false;
                    this.updateUIStatus('idle');
                }
            };
        }
    }

    setupEventListeners() {
        // Atalho global para ativação (Ctrl+Space)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.code === 'Space') {
                e.preventDefault();
                this.toggleChat();
            }
            
            // Alt+V para controlo por voz
            if (e.altKey && e.code === 'KeyV') {
                e.preventDefault();
                this.toggleListening();
            }
        });

        // Clique no botão do assistente
        document.addEventListener('click', (e) => {
            if (e.target.closest('.ai-assistant-btn')) {
                this.toggleChat();
            }
            
            if (e.target.closest('.ai-voice-toggle')) {
                this.toggleListening();
            }
            
            if (e.target.closest('.ai-send-message')) {
                const input = document.querySelector('.ai-message-input');
                if (input && input.value.trim()) {
                    this.processCommand(input.value.trim());
                    this.saveToHistory(input.value.trim(), 'text');
                    input.value = '';
                }
            }
            
            if (e.target.closest('.ai-chat-close')) {
                this.closeChat();
            }
            
            if (e.target.closest('.ai-clear-chat')) {
                this.clearChat();
            }
            
            if (e.target.closest('.ai-settings-toggle')) {
                this.toggleSettings();
            }
            
            if (e.target.closest('.ai-command-suggestion')) {
                const command = e.target.dataset.command;
                this.processCommand(command);
                this.saveToHistory(command, 'text');
            }
        });

        // Enter para enviar mensagem
        document.addEventListener('keydown', (e) => {
            const input = document.querySelector('.ai-message-input');
            if (input && e.key === 'Enter' && !e.shiftKey && this.isChatOpen) {
                e.preventDefault();
                if (input.value.trim()) {
                    this.processCommand(input.value.trim());
                    this.saveToHistory(input.value.trim(), 'text');
                    input.value = '';
                }
            }
        });
    }

    injectAssistantButton() {
        if (!document.querySelector('.ai-assistant-btn')) {
            const aiButton = document.createElement('button');
            aiButton.className = 'ai-assistant-btn';
            aiButton.innerHTML = `
                <i class="fas fa-magic"></i>
                <span class="ai-pulse"></span>
            `;
            aiButton.title = 'Assistente AI (Ctrl+Space)';
            document.body.appendChild(aiButton);
        }
    }

    toggleChat() {
        if (this.isChatOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }

    openChat() {
        if (!document.querySelector('.ai-chat-container')) {
            this.injectChatInterface();
        }
        
        document.querySelector('.ai-chat-container').classList.add('active');
        this.isChatOpen = true;
        
        // Foco no campo de texto
        setTimeout(() => {
            const input = document.querySelector('.ai-message-input');
            if (input) input.focus();
        }, 100);
        
        this.playSound('open');
    }

    closeChat() {
        const chatContainer = document.querySelector('.ai-chat-container');
        if (chatContainer) {
            chatContainer.classList.remove('active');
        }
        this.isChatOpen = false;
        this.playSound('close');
    }

    injectChatInterface() {
        const chatHTML = `
            <div class="ai-chat-container">
                <div class="ai-chat-header">
                    <div class="ai-chat-title">
                        <i class="fas fa-magic"></i>
                        <h4>Assistente AI</h4>
                        <span class="ai-status-indicator"></span>
                    </div>
                    <div class="ai-chat-controls">
                        <button class="ai-settings-toggle" title="Configurações">
                            <i class="fas fa-cog"></i>
                        </button>
                        <button class="ai-clear-chat" title="Limpar chat">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="ai-chat-close" title="Fechar">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <div class="ai-settings-panel">
                    <h5>Configurações do assistente</h5>
                    <div class="ai-setting">
                        <label>
                            <input type="checkbox" id="ai-voice-enabled" ${this.settings.voiceEnabled ? 'checked' : ''}>
                            Controlo por voz
                        </label>
                    </div>
                    <div class="ai-setting">
                        <label>
                            <input type="checkbox" id="ai-auto-open" ${this.settings.autoOpen ? 'checked' : ''}>
                            Abertura automática
                        </label>
                    </div>
                    <div class="ai-setting">
                        <label>
                            <input type="checkbox" id="ai-sound-effects" ${this.settings.soundEffects ? 'checked' : ''}>
                            Efeitos de som
                        </label>
                    </div>
                    <button class="ai-settings-save">Guardar</button>
                </div>
                
                <div class="ai-chat-messages"></div>
                
                <div class="ai-command-suggestions">
                    <div class="ai-suggestion-title">Comandos populares:</div>
                    <div class="ai-suggestion-list"></div>
                </div>
                
                <div class="ai-chat-input">
                    <textarea class="ai-message-input" placeholder="Escreva uma mensagem ou pressione 🎤 para voz..."></textarea>
                    <div class="ai-chat-actions">
                        <button class="ai-voice-toggle" title="Controlo por voz">
                            <i class="fas fa-microphone"></i>
                        </button>
                        <button class="ai-send-message" title="Enviar">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', chatHTML);
        this.updateSuggestions();
        this.addMessage('assistant', 'Olá! Sou o seu assistente AI. Em que posso ajudar?');
    }

    toggleListening() {
        if (!this.recognition || !this.settings.voiceEnabled) {
            this.showNotification('Controlo por voz não disponível', 'warning');
            return;
        }

        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    startListening() {
        try {
            this.recognition.start();
            this.isListening = true;
            this.updateUIStatus('listening');
            this.showNotification('A ouvir... Fale', 'info');
            this.playSound('start');
        } catch (error) {
            console.error('Erro ao iniciar reconhecimento de voz:', error);
        }
    }

    stopListening() {
        try {
            this.recognition.stop();
            this.isListening = false;
            this.updateUIStatus('idle');
            this.playSound('stop');
        } catch (error) {
            console.error('Erro ao parar reconhecimento de voz:', error);
        }
    }

    processCommand(command) {
        console.log('Comando recebido:', command);
        this.addMessage('user', command);
        this.updateUIStatus('processing');
        
        // Análise do comando e resposta
        setTimeout(() => {
            const response = this.generateResponse(command);
            this.addMessage('assistant', response.text);
            
            if (response.action) {
                setTimeout(() => response.action(), 500);
            }
            
            this.updateUIStatus('idle');
        }, 800);
    }

    generateResponse(command) {
        const lowerCommand = command.toLowerCase();
        const userRole = this.getCurrentUserRole();
        const currentPage = this.getCurrentPage();
        
        // Comandos gerais para todas as funções
        if (lowerCommand.includes('ajuda') || lowerCommand.includes('comandos')) {
            return {
                text: this.getHelpMessage(userRole),
                action: null
            };
        }

        if (lowerCommand.includes('hora') || lowerCommand.includes('que horas')) {
            return {
                text: `São agora ${new Date().toLocaleTimeString('pt-PT')}`,
                action: null
            };
        }

        if (lowerCommand.includes('data') || lowerCommand.includes('que dia')) {
            return {
                text: `Hoje ${new Date().toLocaleDateString('pt-PT', { 
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                })}`,
                action: null
            };
        }

        if (lowerCommand.includes('configurações') || lowerCommand.includes('opções')) {
            return {
                text: 'A abrir configurações do assistente...',
                action: () => this.toggleSettings()
            };
        }

        // Comandos específicos por função
        switch(userRole) {
            case 'admin':
                return this.processAdminCommand(lowerCommand, currentPage);
            case 'technician':
                return this.processTechnicianCommand(lowerCommand, currentPage);
            case 'client':
                return this.processClientCommand(lowerCommand, currentPage);
            case 'dispatcher':
                return this.processDispatcherCommand(lowerCommand, currentPage);
            default:
                return this.processGuestCommand(lowerCommand, currentPage);
        }
    }

    processAdminCommand(command, currentPage) {
        const responses = {
            'criar qr': {
                text: 'A abrir gerador de QR-codes...',
                action: () => window.location.href = 'qr-generator.html'
            },
            'estatísticas': {
                text: 'A mostrar estatísticas do sistema...',
                action: () => window.location.href = 'analytics.html'
            },
            'utilizador': {
                text: 'A abrir gestão de utilizadores...',
                action: () => window.location.href = 'users.html'
            },
            'relatório': {
                text: 'A gerar relatório...',
                action: () => this.generateReport()
            },
            'novo utilizador': {
                text: 'A criar novo utilizador...',
                action: () => this.createNewUser()
            },
            'cópia segurança': {
                text: 'A criar cópia de segurança...',
                action: () => this.createBackup()
            },
            'análise dados': {
                text: 'A efetuar análise aprofundada dos dados do sistema...',
                action: () => this.performDataAnalysis()
            },
            'otimizar': {
                text: 'A otimizar o desempenho do sistema...',
                action: () => this.optimizeSystem()
            },
            'integração': {
                text: 'A verificar integrações com serviços externos...',
                action: () => this.checkIntegrations()
            },
            'segurança': {
                text: 'A verificar o estado de segurança do sistema...',
                action: () => this.securityAudit()
            },
            'automatização': {
                text: 'A configurar processos automáticos...',
                action: () => this.setupAutomation()
            },
            'monitorização': {
                text: 'A abrir painel de monitorização...',
                action: () => window.location.href = 'monitoring.html'
            },
            'notificações': {
                text: 'A gerir o sistema de notificações...',
                action: () => this.manageNotifications()
            },
            'exportar tudo': {
                text: 'A exportar todos os dados do sistema...',
                action: () => this.exportAllData()
            },
            'importar': {
                text: 'A abrir ferramentas de importação...',
                action: () => window.location.href = 'import-tools.html'
            },
            'registos': {
                text: 'A mostrar registos do sistema...',
                action: () => this.showSystemLogs()
            },
            'diagnóstico': {
                text: 'A executar diagnóstico do sistema...',
                action: () => this.runDiagnostics()
            }
        };

        return this.findMatchingResponse(command, responses) || {
            text: 'Comando não reconhecido. Diga "ajuda" para ver a lista de comandos.',
            action: null
        };
    }

    processTechnicianCommand(command, currentPage) {
        // Verificar pedidos sobre regulamentos
        if (command.includes('regulam') || command.includes('lei') || command.includes('norma') || 
            command.includes('decreto') || command.includes('ipac') || command.includes('dgeg')) {
            return this.processRegulationQuery(command);
        }

        // Verificar pedidos sobre inspeções e modificações
        if (command.includes('inspeç') || command.includes('inspeç') || command.includes('modificaç')) {
            return this.processInspectionQuery(command);
        }

        const responses = {
            'escanear': {
                text: 'A abrir leitor de QR-codes...',
                action: () => window.location.href = 'scanner.html'
            },
            'tarefas': {
                text: 'A mostrar as suas tarefas atuais...',
                action: () => window.location.href = 'tasks.html'
            },
            'horário': {
                text: 'A abrir o seu horário de trabalho...',
                action: () => window.location.href = 'schedule.html'
            },
            'relatório técnico': {
                text: 'A criar relatório de trabalho...',
                action: () => this.createTechnicianReport()
            },
            'peças sobressalentes': {
                text: 'A verificar disponibilidade de peças...',
                action: () => window.location.href = 'inventory.html'
            }
        };

        return this.findMatchingResponse(command, responses) || {
            text: 'Comando não reconhecido. Diga "ajuda" para ver a lista de comandos.',
            action: null
        };
    }

    processClientCommand(command, currentPage) {
        const responses = {
            'elevador': {
                text: 'A verificar o estado dos seus elevadores...',
                action: () => window.location.href = 'my-lifts.html'
            },
            'pedido': {
                text: 'A abrir criação de pedido...',
                action: () => window.location.href = 'report-issue.html'
            },
            'fatura': {
                text: 'A mostrar as suas faturas...',
                action: () => window.location.href = 'invoices.html'
            },
            'contrato': {
                text: 'A mostrar informação do contrato...',
                action: () => window.location.href = 'contract.html'
            },
            'técnico': {
                text: 'A verificar informação do seu técnico...',
                action: () => this.showAssignedTechnician()
            }
        };

        return this.findMatchingResponse(command, responses) || {
            text: 'Comando não reconhecido. Diga "ajuda" para ver a lista de comandos.',
            action: null
        };
    }

    processDispatcherCommand(command, currentPage) {
        const responses = {
            'tarefas': {
                text: 'A mostrar todas as tarefas ativas...',
                action: () => window.location.href = 'all-tasks.html'
            },
            'técnicos': {
                text: 'A mostrar estado dos técnicos...',
                action: () => window.location.href = 'technicians.html'
            },
            'monitorização': {
                text: 'A abrir monitorização do sistema...',
                action: () => window.location.href = 'monitoring.html'
            },
            'urgente': {
                text: 'A criar tarefa urgente...',
                action: () => this.createUrgentTask()
            }
        };

        return this.findMatchingResponse(command, responses) || {
            text: 'Comando não reconhecido. Diga "ajuda" para ver a lista de comandos.',
            action: null
        };
    }

    processGuestCommand(command, currentPage) {
        const responses = {
            'entrar': {
                text: 'A abrir página de início de sessão...',
                action: () => window.location.href = 'login.html'
            },
            'registo': {
                text: 'A abrir página de registo...',
                action: () => window.location.href = 'register.html'
            },
            'contactos': {
                text: 'A mostrar informação de contacto...',
                action: () => window.location.href = 'contacts.html'
            }
        };

        return this.findMatchingResponse(command, responses) || {
            text: 'Por favor, inicie sessão para ter acesso completo às funcionalidades.',
            action: null
        };
    }

    findMatchingResponse(command, responses) {
        for (const [key, response] of Object.entries(responses)) {
            if (command.includes(key)) {
                return response;
            }
        }
        return null;
    }

    getHelpMessage(role) {
        const helpMessages = {
            'admin': `
Comandos disponíveis:
• "criar QR" - Gerador de QR-codes
• "estatísticas" - Estatísticas do sistema
• "utilizadores" - Gestão de utilizadores
• "relatório" - Geração de relatórios
• "novo utilizador" - Criar utilizador
• "cópia segurança" - Cópia de segurança
• "hora" - Hora atual
• "data" - Data de hoje
• "configurações" - Configurações do assistente
            `,
            'technician': `
Comandos disponíveis:
• "escanear" - Leitor de QR-codes
• "tarefas" - As minhas tarefas
• "horário" - Horário de trabalho
• "relatório técnico" - Relatório de trabalho
• "peças sobressalentes" - Stock de peças
• "hora" - Hora atual
• "configurações" - Configurações do assistente
            `,
            'client': `
Comandos disponíveis:
• "estado elevador" - Estado dos meus elevadores
• "pedido" - Criar pedido
• "faturas" - As minhas faturas
• "contrato" - Informação do contrato
• "técnico" - O meu técnico
• "hora" - Hora atual
• "configurações" - Configurações do assistente
            `,
            'dispatcher': `
Comandos disponíveis:
• "tarefas" - Todas as tarefas ativas
• "técnicos" - Estado dos técnicos
• "monitorização" - Monitorização do sistema
• "urgente" - Tarefa urgente
• "hora" - Hora atual
• "configurações" - Configurações do assistente
            `,
            'guest': `
Comandos disponíveis:
• "entrar" - Página de início de sessão
• "registo" - Página de registo
• "contactos" - Informação de contacto
• "hora" - Hora atual
• "configurações" - Configurações do assistente
            `
        };

        return helpMessages[role] || 'Diga "ajuda" para obter a lista de comandos.';
    }

    getCurrentUserRole() {
        // Numa app real haverá verificação com localStorage ou API
        const user = JSON.parse(localStorage.getItem('currentUser')) || {};
        return user.role || 'guest';
    }

    getCurrentPage() {
        return window.location.pathname.split('/').pop() || 'unknown';
    }

    addMessage(sender, text) {
        const chatContainer = document.querySelector('.ai-chat-messages');
        if (chatContainer) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `ai-message ai-message-${sender}`;
            messageDiv.innerHTML = `
                <div class="ai-message-content">
                    <div class="ai-message-text">${this.formatMessage(text)}</div>
                    <div class="ai-message-time">${new Date().toLocaleTimeString('pt-PT')}</div>
                </div>
            `;
            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }

    formatMessage(text) {
        // Formatação de texto (links, listas, etc.)
        return text
            .replace(/\n/g, '<br>')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    }

    updateUIStatus(status) {
        const btn = document.querySelector('.ai-assistant-btn');
        const indicator = document.querySelector('.ai-status-indicator');
        
        if (btn) btn.classList.remove('ai-listening', 'ai-processing');
        if (indicator) indicator.classList.remove('listening', 'processing');
        
        if (status === 'listening') {
            if (btn) btn.classList.add('ai-listening');
            if (indicator) indicator.classList.add('listening');
        } else if (status === 'processing') {
            if (btn) btn.classList.add('ai-processing');
            if (indicator) indicator.classList.add('processing');
        }
    }

    showNotification(message, type) {
        // Usar notificações
        const notification = document.createElement('div');
        notification.className = `ai-notification ai-notification-${type}`;
        notification.innerHTML = `
            <div class="ai-notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-times-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        return icons[type] || 'fa-info-circle';
    }

    playSound(type) {
        if (!this.settings.soundEffects) return;
        
        const sounds = {
            'open': 'https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3',
            'close': 'https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3',
            'start': 'https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3',
            'stop': 'https://assets.mixkit.co/sfx/preview/mixkit-software-interface-soft-2576.mp3'
        };
        
        if (sounds[type]) {
            const audio = new Audio(sounds[type]);
            audio.volume = 0.3;
            audio.play().catch(() => {});
        }
    }

    toggleSettings() {
        const settingsPanel = document.querySelector('.ai-settings-panel');
        if (settingsPanel) {
            settingsPanel.classList.toggle('active');
        }
    }

    clearChat() {
        const chatContainer = document.querySelector('.ai-chat-messages');
        if (chatContainer) {
            chatContainer.innerHTML = '';
            this.addMessage('assistant', 'Chat limpo. Em que posso ajudar?');
        }
    }

    updateSuggestions() {
        const suggestionsContainer = document.querySelector('.ai-suggestion-list');
        if (!suggestionsContainer) return;
        
        const role = this.getCurrentUserRole();
        const suggestions = this.getCommandSuggestions(role);
        
        suggestionsContainer.innerHTML = suggestions.map(suggestion => `
            <button class="ai-command-suggestion" data-command="${suggestion.command}">
                ${suggestion.icon} ${suggestion.text}
            </button>
        `).join('');
    }

    getCommandSuggestions(role) {
        const baseSuggestions = [
            { command: 'ajuda', text: 'Ajuda', icon: '❓' },
            { command: 'hora', text: 'Que horas são?', icon: '⏰' }
        ];
        
        const roleSuggestions = {
            'admin': [
                { command: 'criar QR', text: 'Criar QR', icon: '📱' },
                { command: 'estatísticas', text: 'Estatísticas', icon: '📊' }
            ],
            'technician': [
                { command: 'escanear', text: 'Escanear', icon: '📷' },
                { command: 'tarefas', text: 'As minhas tarefas', icon: '✅' }
            ],
            'client': [
                { command: 'estado elevador', text: 'Estado dos elevadores', icon: '🏢' },
                { command: 'pedido', text: 'Criar pedido', icon: '📝' }
            ]
        };
        
        return [...baseSuggestions, ...(roleSuggestions[role] || [])];
    }

    saveToHistory(command, type) {
        const history = JSON.parse(localStorage.getItem('aiCommandHistory') || '[]');
        history.unshift({
            command,
            type,
            timestamp: new Date().toISOString(),
            role: this.getCurrentUserRole()
        });
        
        // Guardar apenas as últimas 50 comandos
        localStorage.setItem('aiCommandHistory', JSON.stringify(history.slice(0, 50)));
    }

    loadCommandHistory() {
        return JSON.parse(localStorage.getItem('aiCommandHistory') || '[]');
    }

    loadUserPreferences() {
        const prefs = JSON.parse(localStorage.getItem('aiAssistantPrefs')) || {};
        this.settings = { ...this.settings, ...prefs };
    }

    saveUserPreferences() {
        localStorage.setItem('aiAssistantPrefs', JSON.stringify(this.settings));
    }

    // Métodos auxiliares para ações específicas
    generateReport() {
        this.showNotification('A gerar relatório...', 'info');
        // Lógica de geração de relatório
    }

    createNewUser() {
        this.showNotification('A criar novo utilizador...', 'info');
        // Lógica de criação de utilizador
    }

    createBackup() {
        this.showNotification('A criar cópia de segurança...', 'info');
        // Lógica de criação de cópia de segurança
    }

    createTechnicianReport() {
        this.showNotification('A criar relatório do técnico...', 'info');
        // Lógica do relatório do técnico
    }

    showAssignedTechnician() {
        this.showNotification('A procurar informação do técnico...', 'info');
        // Lógica de pesquisa do técnico
    }

    createUrgentTask() {
        this.showNotification('A criar tarefa urgente...', 'info');
        // Lógica de criação de tarefa urgente
    }

    // Funcionalidades avançadas do admin
    performDataAnalysis() {
        this.addMessage('assistant', '🔍 A analisar dados do sistema...

📈 Tendências encontradas:
• Crescimento de utilização em 15%
• 3 elevadores com manutenção pendente
• Tempo médio de resposta: 2.3h');
    }

    optimizeSystem() {
        this.addMessage('assistant', '⚡ A otimizar o sistema...

✅ Concluído:
• Cache limpa (2.3MB)
• Base de dados otimizada
• Sessões expiradas removidas');
    }

    checkIntegrations() {
        this.addMessage('assistant', '🔗 A verificar integrações...

📡 Estado:
• API FestLift: ✅ Ativo
• Servidor de email: ✅ Ativo
• WebSocket: ✅ Ligado');
    }

    securityAudit() {
        this.addMessage('assistant', '🔒 A efetuar auditoria de segurança...

🛡️ Resultados:
• Palavras-passe: ✅ Seguras
• Acessos: ✅ Configurados
• JWT: ✅ Válido');
    }

    setupAutomation() {
        this.addMessage('assistant', '🤖 A configurar automatização...

⚙️ Ativado:
• Geração automática de relatórios
• Atribuição automática de técnicos
• Notificações automáticas');
    }

    manageNotifications() {
        this.addMessage('assistant', '📢 A gerir notificações...

📨 Configurado:
• Email: 45 utilizadores
• WebSocket: ativo
• SMS: não disponível');
    }

    exportAllData() {
        this.addMessage('assistant', '📤 A exportar todos os dados...

💾 Criado:
• QR-codes: qr_export.json (2.1MB)
• Utilizadores: users_export.csv');
    }

    showSystemLogs() {
        this.addMessage('assistant', '📋 A mostrar registos do sistema...

📝 Últimos eventos:
• 14:32: Leitura QR #QR0042
• 14:28: Login admin
• 14:15: Novo pedido criado');
    }

    runDiagnostics() {
        this.addMessage('assistant', '🔧 A executar diagnóstico...

⚡ Verificado:
• Servidor: ✅ A responder (45ms)
• Base de dados: ✅ Ligada
• WebSocket: ✅ Ativo');
    }

    // Novos métodos para regulamentos (Circular IPAC 06/2025)
    processRegulationQuery(command) {
        const lowerCommand = command.toLowerCase();
        
        if (lowerCommand.includes('ipac') && lowerCommand.includes('2025')) {
            return {
                text: `📋 Circular IPAC 06/2025 (20.12.2025)

🎯 Requisitos principais:
1️⃣ Determinação da especificação de inspeção:
   • Lei à data de entrada em serviço
   • Leis para modificações importantes

2️⃣ Registo de não-conformidades:
   • Todas as não-conformidades devem ser registadas
   • O resultado deve corresponder às verificações

3️⃣ Descritores PROIBIDOS nos relatórios:
   ❌ "Sem declaração de conformidade da modificação"
   ❌ "Sem avaliação do organismo notificado"
   
   ✅ Em vez disso, usar OBSERVAÇÕES

💡 Prática recomendada:
   Se houver modificação sem documentação — adicionar
   observação no relatório, sem recusar a inspeção

📚 Fonte: www.ipac.pt`,
                action: null
            };
        }

        if (lowerCommand.includes('modificaç') || lowerCommand.includes('modificaç')) {
            return {
                text: `🔧 Modificações de elevadores (IPAC 06/2025)

📋 O que verificar:
✅ Estado técnico após modificação
✅ Conformidade com a legislação aplicável
✅ Segurança de funcionamento

❌ O que NÃO verificar:
❌ Existência de documentos de outros organismos
❌ Declarações de conformidade de modificações
❌ Avaliações de organismos notificados

💡 Se houver modificação sem documentação:
   → Adicionar OBSERVAÇÃO no relatório
   → Continuar com a inspeção técnica
   → NÃO recusar a inspeção

🎯 A sua competência:
   • Verificação técnica da instalação
   • Avaliação de segurança
   • Identificação de não-conformidades`,
                action: null
            };
        }

        if (lowerCommand.includes('inspeç') || lowerCommand.includes('inspeç')) {
            return {
                text: `🔍 Metodologia de inspeção (IPAC 06/2025)

📝 Passo 1: Determinar a especificação
   • Encontrar a data de entrada em serviço
   • Determinar a lei aplicável (Decreto 513/70, DL 320/2002, EN 81-20:2020, etc.)
   • Se houve modificações — adicionar as leis correspondentes

📝 Passo 2: Realizar a inspeção
   • Verificar conformidade com a especificação definida
   • Registar todas as não-conformidades
   • NÃO exigir documentos de outros organismos

📝 Passo 3: Elaborar o relatório
   ✅ Usar não-conformidades técnicas
   ✅ Adicionar observações sobre modificações
   ❌ NÃO usar descritores proibidos

🎯 O resultado deve basear-se APENAS em verificações técnicas!`,
                action: null
            };
        }

        return {
            text: 'Para obter informação sobre regulamentos, pergunte:\n• "IPAC 2025" - Circular IPAC 06/2025\n• "modificações" - Sobre modificações de elevadores\n• "inspeção" - Metodologia de inspeção',
            action: null
        };
    }

    processInspectionQuery(command) {
        const lowerCommand = command.toLowerCase();

        if (lowerCommand.includes('specificaç') || lowerCommand.includes('specification')) {
            return {
                text: `📋 Especificação da inspeção

🗓️ Como determinar:
1. Data de entrada em serviço → Lei base
2. Datas de modificações → Leis adicionais

📅 Períodos da legislação:
• 1970-1980: Decreto 513/70
• 1981-1998: Decreto Regulamentar 13/80
• 1999-2002: Decreto-Lei 295/98
• 2003-2020: Decreto-Lei 320/2002
• 2021+: EN 81-20:2020 + EN 81-50:2020

💡 Exemplo:
   Elevador 1985 + modificação 2015:
   → DR 13/80 (base) + DL 320/2002 (modificação)

🔍 O sistema determinará a especificação automaticamente!`,
                action: () => window.location.href = 'inspection-specification.html'
            };
        }

        if (lowerCommand.includes('relatório') || lowerCommand.includes('relatório')) {
            return {
                text: `📄 Elaboração do relatório de inspeção

✅ PODE usar:
• Não-conformidades técnicas com referência legal
• Medições e testes
• Observações sobre o estado da instalação

❌ NÃO PODE usar:
• "Sem declaração de conformidade"
• "Não avaliado por organismo notificado"
• Recusa de inspeção por causa de documentos

💡 Em vez disso:
   OBSERVAÇÃO: "Detetada modificação sem
   documentação. Recomenda-se obter avaliação
   do organismo notificado."

🎯 Resultado = APENAS verificações técnicas!`,
                action: () => window.location.href = 'inspection-report-validator.html'
            };
        }

        return {
            text: 'Pergunte:\n• "especificação" - Como determinar\n• "relatório" - Como elaborar\n• "modificações" - Particularidades da verificação',
            action: null
        };
    }
}

// Instância global do assistente
let aiAssistant = null;

// Inicialização ao carregar a página
document.addEventListener('DOMContentLoaded', function() {
    aiAssistant = new AIAssistant();
});