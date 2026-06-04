/**
 * 🎛️ Universal Settings Page Component
 */

class SettingsPage {
    constructor() {
        this.user = AuthManager.getCurrentUser();
        this.settings = null;
    }

    async init() {
        try {
            this.settings = await settingsManager.loadSettings();
            this.render();
            this.attachEventListeners();
            console.log('✅ Settings page initialized');
        } catch (error) {
            console.error('❌ Failed to initialize settings page:', error);
            this.showError('Não foi possível carregar as definições');
        }
    }

    render() {
        const container = document.getElementById('settings-content');
        if (!container) return;

        const isAdmin = this.user && this.user.role === 'admin';

        container.innerHTML = `
            <div class="row">
                ${this.renderGeneralSettings()}
                ${this.renderNotificationSettings()}
                ${isAdmin ? this.renderAdminSystemSettings() : ''}
            </div>
            ${isAdmin ? `<div class="row mt-3">${this.renderAdminBackupSettings()}</div>` : ''}
            <div class="row mt-4">
                <div class="col-12">
                    <button class="btn btn-primary btn-lg" id="save-settings">
                        <i class="fas fa-save"></i> Guardar
                    </button>
                    <button class="btn btn-secondary btn-lg ml-2" id="reset-settings">
                        <i class="fas fa-undo"></i> Repor
                    </button>
                </div>
            </div>
        `;
    }

    renderGeneralSettings() {
        const currentLang = (this.settings && this.settings.language)
            || localStorage.getItem('app_language') || 'pt';

        const languages = [
            { code: 'uk', flag: '🇺🇦', name: 'Ucraniano' },
            { code: 'en', flag: '🇬🇧', name: 'English' },
            { code: 'pt', flag: '🇵🇹', name: 'Português' }
        ];

        return `
            <div class="col-md-6">
                <div class="card card-primary">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-globe"></i> Definições gerais</h3>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label><i class="fas fa-language mr-1"></i> Idioma da interface</label>
                            <select class="form-control" id="language-select">
                                ${languages.map(lang =>
                                    '<option value="' + lang.code + '"' + (currentLang === lang.code ? ' selected' : '') + '>' +
                                    lang.flag + ' ' + lang.name + '</option>'
                                ).join('')}
                            </select>
                            <small class="form-text text-muted">A tradução está disponível parcialmente. A versão completa será adicionada em breve.</small>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-sun mr-1"></i> Tema</label>
                            <div class="alert alert-light border mb-0 py-2">
                                <i class="fas fa-check-circle text-success mr-1"></i>
                                <strong>Tema claro</strong> &mdash; único tema disponível
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderNotificationSettings() {
        const notif = (this.settings && this.settings.notifications) || {};

        return `
            <div class="col-md-6">
                <div class="card card-info">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-bell"></i> Notificações</h3>
                    </div>
                    <div class="card-body">
                        <div class="custom-control custom-switch mb-3">
                            <input type="checkbox" class="custom-control-input" id="notif-email"
                                ${notif.email !== false ? 'checked' : ''}>
                            <label class="custom-control-label" for="notif-email">Notificações por email</label>
                        </div>
                        <div class="custom-control custom-switch mb-3">
                            <input type="checkbox" class="custom-control-input" id="notif-push"
                                ${notif.push !== false ? 'checked' : ''}>
                            <label class="custom-control-label" for="notif-push">Notificações push</label>
                        </div>
                        <hr>
                        <h6 class="text-muted">Tipos de notificações:</h6>
                        <div class="custom-control custom-switch mb-2">
                            <input type="checkbox" class="custom-control-input" id="notif-new-request"
                                ${notif.newRequest !== false ? 'checked' : ''}>
                            <label class="custom-control-label" for="notif-new-request">Novo pedido</label>
                        </div>
                        <div class="custom-control custom-switch mb-2">
                            <input type="checkbox" class="custom-control-input" id="notif-status-change"
                                ${notif.statusChange !== false ? 'checked' : ''}>
                            <label class="custom-control-label" for="notif-status-change">Alteração de estado</label>
                        </div>
                        <div class="custom-control custom-switch mb-2">
                            <input type="checkbox" class="custom-control-input" id="notif-assignment"
                                ${notif.assignment !== false ? 'checked' : ''}>
                            <label class="custom-control-label" for="notif-assignment">Atribuição</label>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderAdminSystemSettings() {
        const s = this.settings || {};
        return `
            <div class="col-md-6">
                <div class="card card-warning">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-server"></i> Definições do sistema</h3>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label for="sessionTimeout">Tempo limite de sessão (minutos)</label>
                            <input type="number" class="form-control" id="sessionTimeout"
                                value="${s.sessionTimeout || 60}" min="5" max="480">
                        </div>
                        <div class="form-group">
                            <label for="apiRateLimit">Limite de pedidos API (por minuto)</label>
                            <input type="number" class="form-control" id="apiRateLimit"
                                value="${s.apiRateLimit || 100}" min="10" max="1000">
                        </div>
                        <div class="custom-control custom-switch mb-2">
                            <input type="checkbox" class="custom-control-input" id="maintenanceMode"
                                ${s.maintenanceMode ? 'checked' : ''}>
                            <label class="custom-control-label" for="maintenanceMode">
                                Modo de manutenção
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderAdminBackupSettings() {
        return `
            <div class="col-12">
                <div class="card card-danger">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-database"></i> Backups reais</h3>
                    </div>
                    <div class="card-body">
                        <div class="d-flex flex-wrap align-items-center mb-3" style="gap:8px;">
                            <button class="btn btn-outline-primary" id="create-server-backup">
                                <i class="fas fa-plus-circle"></i> Criar backup agora
                            </button>
                            <button class="btn btn-outline-secondary" id="refresh-backup-list">
                                <i class="fas fa-sync"></i> Atualizar lista
                            </button>
                            <span class="text-muted small" id="backup-status-text">Sem dados carregados</span>
                        </div>

                        <div class="form-row">
                            <div class="form-group col-md-6">
                                <label for="server-backup-select">Backup disponível</label>
                                <select class="form-control" id="server-backup-select">
                                    <option value="">A carregar...</option>
                                </select>
                            </div>
                            <div class="form-group col-md-6 d-flex align-items-end" style="gap:8px;">
                                <button class="btn btn-outline-success" id="download-server-backup">
                                    <i class="fas fa-download"></i> Transferir
                                </button>
                                <button class="btn btn-danger" id="restore-server-backup">
                                    <i class="fas fa-history"></i> Restaurar backup
                                </button>
                            </div>
                        </div>

                        <small class="text-danger d-block">
                            Restaurar substitui os dados atuais nas coleções principais. Será criado um backup automático antes da restauração.
                        </small>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        $('#language-select').on('change', async function() {
            const lang = $(this).val();
            try {
                await settingsManager.updateLanguage(lang);
                toastr.success('Idioma alterado. A página será atualizada...');
                setTimeout(function() { location.reload(); }, 1500);
            } catch (error) {
                toastr.error('Erro ao alterar o idioma');
            }
        });

        $('#save-settings').on('click', function() {
            window._settingsPageInstance.saveAllSettings();
        });

        $('#reset-settings').on('click', function() {
            window._settingsPageInstance.resetSettings();
        });

        if (this.user && this.user.role === 'admin') {
            $('#create-server-backup').on('click', function() {
                window._settingsPageInstance.createServerBackup();
            });

            $('#refresh-backup-list').on('click', function() {
                window._settingsPageInstance.loadBackupList();
            });

            $('#download-server-backup').on('click', function() {
                window._settingsPageInstance.downloadSelectedBackup();
            });

            $('#restore-server-backup').on('click', function() {
                window._settingsPageInstance.restoreSelectedBackup();
            });

            this.loadBackupList();
        }

        window._settingsPageInstance = this;
    }

    async loadBackupList() {
        const select = document.getElementById('server-backup-select');
        const statusEl = document.getElementById('backup-status-text');
        if (!select || !statusEl) return;

        try {
            statusEl.textContent = 'A carregar backups...';
            const token = localStorage.getItem('token');
            const resp = await fetch('/api/admin/backup/list', {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            });
            const data = await resp.json();
            if (!resp.ok || !data.success) {
                throw new Error(data.message || 'Falha ao carregar backups');
            }

            const files = Array.isArray(data.files) ? data.files : [];
            if (files.length === 0) {
                select.innerHTML = '<option value="">Nenhum backup disponível</option>';
                statusEl.textContent = 'Nenhum backup encontrado';
                return;
            }

            select.innerHTML = files.map(file => {
                const date = new Date(file.modifiedAt).toLocaleString('pt-PT');
                const sizeMb = (Number(file.sizeBytes || 0) / (1024 * 1024)).toFixed(2);
                return `<option value="${file.name}">${file.name} • ${sizeMb} MB • ${date}</option>`;
            }).join('');

            statusEl.textContent = `Backups: ${files.length}`;
        } catch (error) {
            console.error('backup list error:', error);
            statusEl.textContent = 'Erro ao carregar backups';
            toastr.error(error.message || 'Erro ao carregar backups');
        }
    }

    async createServerBackup() {
        try {
            const token = localStorage.getItem('token');
            const resp = await fetch('/api/admin/backup/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({})
            });
            const data = await resp.json();
            if (!resp.ok || !data.success) {
                throw new Error(data.message || 'Falha ao criar backup');
            }

            toastr.success(`Backup criado: ${data.file && data.file.name ? data.file.name : 'ok'}`);
            await this.loadBackupList();
        } catch (error) {
            console.error('backup create error:', error);
            toastr.error(error.message || 'Erro ao criar backup');
        }
    }

    async downloadSelectedBackup() {
        const select = document.getElementById('server-backup-select');
        const fileName = select ? select.value : '';
        if (!fileName) {
            toastr.warning('Selecione um backup para transferir');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const resp = await fetch(`/api/admin/backup/download/${encodeURIComponent(fileName)}`, {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            });
            if (!resp.ok) {
                let msg = 'Falha ao transferir backup';
                try {
                    const err = await resp.json();
                    msg = err.message || msg;
                } catch (_) {}
                throw new Error(msg);
            }

            const blob = await resp.blob();
            const href = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = href;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(href);
        } catch (error) {
            console.error('backup download error:', error);
            toastr.error(error.message || 'Erro ao transferir backup');
        }
    }

    async restoreSelectedBackup() {
        const select = document.getElementById('server-backup-select');
        const fileName = select ? select.value : '';
        if (!fileName) {
            toastr.warning('Selecione um backup para restaurar');
            return;
        }

        const text = prompt('Atenção: esta ação irá substituir dados atuais. Escreva RESTORE para confirmar:');
        if (text !== 'RESTORE') {
            toastr.info('Restauração cancelada');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const resp = await fetch('/api/admin/backup/restore', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ fileName, confirmText: 'RESTORE' })
            });
            const data = await resp.json();
            if (!resp.ok || !data.success) {
                throw new Error(data.message || 'Falha ao restaurar backup');
            }

            toastr.success(`Restore concluído. Safety backup: ${data.safetyBackup || 'criado'}`);
            await this.loadBackupList();
        } catch (error) {
            console.error('backup restore error:', error);
            toastr.error(error.message || 'Erro ao restaurar backup');
        }
    }

    async saveAllSettings() {
        try {
            const newSettings = {
                language: $('#language-select').val(),
                theme: 'light',
                notifications: {
                    email: $('#notif-email').is(':checked'),
                    push: $('#notif-push').is(':checked'),
                    newRequest: $('#notif-new-request').is(':checked'),
                    statusChange: $('#notif-status-change').is(':checked'),
                    assignment: $('#notif-assignment').is(':checked')
                }
            };

            if (this.user && this.user.role === 'admin') {
                newSettings.sessionTimeout = parseInt($('#sessionTimeout').val()) || 60;
                newSettings.apiRateLimit   = parseInt($('#apiRateLimit').val())   || 100;
                newSettings.maintenanceMode = $('#maintenanceMode').is(':checked');
            }

            await settingsManager.saveSettings(newSettings);
            toastr.success('✅ Definições guardadas!');
        } catch (error) {
            console.error('Save error:', error);
            toastr.error('❌ Erro ao guardar');
        }
    }

    async resetSettings() {
        if (!confirm('Tem a certeza? Todas as definições serão repostas para os valores predefinidos.')) return;
        try {
            await settingsManager.resetSettings();
        } catch (error) {
            toastr.error('Erro ao repor as definições');
        }
    }

    showError(message) {
        toastr.error(message);
    }
}

if (typeof window !== 'undefined') {
    window.SettingsPage = SettingsPage;
}
