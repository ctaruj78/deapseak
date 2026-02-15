// knowledge-manager.js - МЕНЕДЖЕР БАЗИ ЗНАНЬ ДЛЯ ТЕХНІКА
class KnowledgeManager {
    constructor() {
        this.articles = [];
        this.filteredArticles = [];
        this.currentFilter = 'all';
        this.bookmarkedArticles = JSON.parse(localStorage.getItem('bookmarkedArticles')) || [];
        this.init();
    }

    init() {
        this.loadArticles();
        this.setupEventListeners();
        this.renderPopularArticles();
        this.renderRecentArticles();
        this.renderRecommendedArticles();
        this.updateStatistics();
        this.loadUserInfo();
    }

    async loadArticles() {
        try {
            // Спроба отримати дані з API
            const response = await fetch('/api/knowledge-base', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            if (response.ok) {
                this.articles = await response.json();
                localStorage.setItem('knowledgeArticles', JSON.stringify(this.articles));
            } else {
                throw new Error('API недоступне');
            }
        } catch (error) {
            console.warn('Використання локальних даних:', error);
            this.articles = JSON.parse(localStorage.getItem('knowledgeArticles')) || [];
            
            if (this.articles.length === 0) {
                this.articles = this.createSampleArticles();
                localStorage.setItem('knowledgeArticles', JSON.stringify(this.articles));
            }
        }

        this.filteredArticles = [...this.articles];
    }

    createSampleArticles() {
        return [
            {
                id: 'KB-001',
                title: 'Усунення затримки дверей ліфта',
                category: 'repair',
                difficulty: 'intermediate',
                featured: true,
                views: 1245,
                rating: 4.8,
                createdDate: '2024-05-15',
                updatedDate: '2024-06-10',
                author: 'Старший технік Іваненко',
                tags: ['двері', 'регулювання', 'безпека', 'Otis'],
                content: `
                    <h2>Усунення затримки дверей ліфта</h2>
                    
                    <div class="warning-box">
                        <strong><i class="fas fa-exclamation-triangle"></i> Увага!</strong>
                        Перед початком робіт обов'язково відключіть живлення ліфта та встановіть знаки безпеки.
                    </div>

                    <h3>Необхідні інструменти:</h3>
                    <ul>
                        <li>Набір гайкових ключів</li>
                        <li>Регулювальний ключ</li>
                        <li>Вимірювальна стрічка</li>
                        <li>Індикатор напруги</li>
                        <li>Захисні рукавиці</li>
                    </ul>

                    <h3>Кроки виконання:</h3>

                    <div class="step">
                        <span class="step-number">1</span>
                        <strong>Перевірка датчиків безпеки</strong>
                        <p>Перевірте роботу фотоелементів та механічних датчиків безпеки.</p>
                    </div>

                    <div class="step">
                        <span class="step-number">2</span>
                        <strong>Регулювання механізму</strong>
                        <p>Відрегулюйте натяг тросів та положення роликів відповідно до специфікації виробника.</p>
                    </div>

                    <div class="step">
                        <span class="step-number">3</span>
                        <strong>Перевірка налаштувань ПЛК</strong>
                        <p>Перевірте та скоригуйте налаштування часу закриття дверей у системі керування.</p>
                    </div>

                    <div class="success-box">
                        <strong><i class="fas fa-check-circle"></i> Результат:</strong>
                        Після виконання всіх кроків двері повинні закриватися плавно без затримок.
                    </div>
                `,
                related: ['KB-002', 'KB-005']
            },
            {
                id: 'KB-002',
                title: 'Профілактичне обслуговування гальмівної системи',
                category: 'maintenance',
                difficulty: 'advanced',
                featured: true,
                views: 892,
                rating: 4.9,
                createdDate: '2024-04-20',
                updatedDate: '2024-06-05',
                author: 'Головний інженер Петров',
                tags: ['гальма', 'безпека', 'профілактика', 'Schindler'],
                content: `
                    <h2>Профілактичне обслуговування гальмівної системи</h2>

                    <h3>Періодичність:</h3>
                    <ul>
                        <li>Щомісяця: візуальний огляд</li>
                        <li>Щокварталу: повна перевірка</li>
                        <li>Щорічно: комплексне обслуговування</li>
                    </ul>

                    <h3>Контрольний список:</h3>
                    <div class="code-block">
                        ✅ Перевірка зносу колодок<br>
                        ✅ Контроль рівня мастила<br>
                        ✅ Перевірка роботи соленоїда<br>
                        ✅ Тестування системи аварійного гальмування<br>
                        ✅ Калібрування датчиків положення
                    </div>
                `,
                related: ['KB-001', 'KB-003']
            },
            {
                id: 'KB-003',
                title: 'Діагностика помилок керування ліфтом',
                category: 'troubleshooting',
                difficulty: 'advanced',
                featured: false,
                views: 1567,
                rating: 4.7,
                createdDate: '2024-03-10',
                updatedDate: '2024-05-20',
                author: 'Спеціаліст Коваленко',
                tags: ['діагностика', 'помилки', 'керування', 'KONE'],
                content: `
                    <h2>Діагностика помилок керування ліфтом</h2>

                    <h3>Поширені коди помилок:</h3>
                    <table class="table table-bordered">
                        <thead>
                            <tr>
                                <th>Код</th>
                                <th>Опис</th>
                                <th>Рішення</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>E01</td>
                                <td>Помилка датчика положення</td>
                                <td>Перевірити датчик, очистити контакти</td>
                            </tr>
                            <tr>
                                <td>E05</td>
                                <td>Перегрів двигуна</td>
                                <td>Перевірити охолодження, дати остигнути</td>
                            </tr>
                            <tr>
                                <td>E12</td>
                                <td>Помилка дверей</td>
                                <td>Перевірити механізм та датчики</td>
                            </tr>
                        </tbody>
                    </table>
                `,
                related: ['KB-002', 'KB-004']
            },
            {
                id: 'KB-004',
                title: 'Правила безпеки при роботі в шахті ліфта',
                category: 'safety',
                difficulty: 'beginner',
                featured: true,
                views: 2341,
                rating: 5.0,
                createdDate: '2024-02-15',
                updatedDate: '2024-06-01',
                author: 'Інспектор з безпеки Сидоренко',
                tags: ['безпека', 'шахта', 'інструктаж', 'стандарти'],
                content: `
                    <h2>Правила безпеки при роботі в шахті ліфта</h2>

                    <div class="danger-box">
                        <strong><i class="fas fa-skull-crossbones"></i> Заборонено!</strong>
                        Працювати без захисного обладнання та без належного блокування системи.
                    </div>

                    <h3>Обов'язкове обладнання:</h3>
                    <ul>
                        <li>Каска захисна</li>
                        <li>Монтажний пояс</li>
                        <li>Захисні рукавиці</li>
                        <li>Індикатор напруги</li>
                        <li>Ліхтарик</li>
                    </ul>

                    <h3>Процедура безпеки:</h3>
                    <ol>
                        <li>Відключити живлення</li>
                        <li>Встановити знаки безпеки</li>
                        <li>Перевірити відсутність напруги</li>
                        <li>Заблокувати системи</li>
                        <li>Отримати дозвіл на роботу</li>
                    </ol>
                `,
                related: ['KB-005']
            },
            {
                id: 'KB-005',
                title: 'Заміна тросів підйомного механізму',
                category: 'repair',
                difficulty: 'advanced',
                featured: false,
                views: 678,
                rating: 4.6,
                createdDate: '2024-06-01',
                updatedDate: '2024-06-15',
                author: 'Майстер-технік Гончаренко',
                tags: ['троси', 'заміна', 'механізм', 'Otis'],
                content: `
                    <h2>Заміна тросів підйомного механізму</h2>

                    <h3>Необхідні матеріали:</h3>
                    <ul>
                        <li>Троси підйомні (специфікація за виробником)</li>
                        <li>Запасні клини та кріплення</li>
                        <li>Мастило для тросів</li>
                        <li>Інструмент для натягу</li>
                    </ul>

                    <h3>Інструкція з заміни:</h3>
                    <p>Детальна покрокова інструкція з фотографіями та схемами...</p>
                `,
                related: ['KB-001', 'KB-003']
            }
        ];
    }

    setupEventListeners() {
        $('#searchInput').on('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchArticles();
            }
        });

        // Фільтрація за складністю
        $('.difficulty-filter').on('click', function() {
            const difficulty = $(this).data('difficulty');
            knowledgeManager.filterByDifficulty(difficulty);
        });
    }

    searchArticles() {
        const query = $('#searchInput').val().trim().toLowerCase();
        
        if (!query) {
            this.showNotification('Введіть пошуковий запит', 'warning');
            return;
        }

        const results = this.articles.filter(article =>
            article.title.toLowerCase().includes(query) ||
            article.content.toLowerCase().includes(query) ||
            article.tags.some(tag => tag.toLowerCase().includes(query)) ||
            article.author.toLowerCase().includes(query)
        );

        if (results.length === 0) {
            this.showNotification('Нічого не знайдено', 'info');
            return;
        }

        this.displaySearchResults(results);
    }

    displaySearchResults(results) {
        const container = $('#searchResults');
        container.empty();

        results.forEach(article => {
            const card = this.createArticleCard(article);
            container.append(card);
        });

        this.showNotification(`Знайдено ${results.length} результатів`, 'success');
    }

    filterByTopic(topic) {
        this.currentFilter = topic;
        
        if (topic === 'all') {
            this.filteredArticles = [...this.articles];
        } else {
            this.filteredArticles = this.articles.filter(article => 
                article.category === topic
            );
        }

        this.renderFilteredArticles();
    }

    filterByDifficulty(difficulty) {
        if (difficulty === 'all') {
            this.filteredArticles = [...this.articles];
        } else {
            this.filteredArticles = this.articles.filter(article => 
                article.difficulty === difficulty
            );
        }

        this.renderFilteredArticles();
    }

    renderFilteredArticles() {
        const container = $('#searchResults');
        container.empty();

        if (this.filteredArticles.length === 0) {
            container.html(`
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="fas fa-search fa-3x text-muted mb-3"></i>
                        <h4>Нічого не знайдено</h4>
                        <p class="text-muted">Спробуйте змінити критерії пошуку</p>
                    </div>
                </div>
            `);
        } else {
            this.filteredArticles.forEach(article => {
                const card = this.createArticleCard(article);
                container.append(card);
            });
        }

        $('#searchResultsSection').show();
        this.showNotification(`Відображено ${this.filteredArticles.length} статей`, 'info');
    }

    renderPopularArticles() {
        const popular = this.articles
            .sort((a, b) => b.views - a.views)
            .slice(0, 4);

        const container = $('#popularArticles');
        container.empty();

        popular.forEach(article => {
            const card = this.createArticleCard(article);
            container.append(card);
        });
    }

    renderRecentArticles() {
        const recent = this.articles
            .sort((a, b) => new Date(b.updatedDate) - new Date(a.updatedDate))
            .slice(0, 4);

        const container = $('#recentArticles');
        container.empty();

        recent.forEach(article => {
            const card = this.createArticleCard(article);
            container.append(card);
        });
    }

    renderRecommendedArticles() {
        // Спрощена рекомендаційна система
        const recommended = this.articles
            .filter(article => article.featured)
            .slice(0, 4);

        const container = $('#recommendedArticles');
        container.empty();

        recommended.forEach(article => {
            const card = this.createArticleCard(article);
            container.append(card);
        });
    }

    createArticleCard(article) {
        const difficultyClass = `tag-${article.difficulty}`;
        const difficultyText = this.getDifficultyText(article.difficulty);

        return $(`
            <div class="col-md-6 col-lg-3 mb-4">
                <div class="card article-card ${article.featured ? 'featured' : ''} h-100">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <span class="${difficultyClass} tag">${difficultyText}</span>
                            ${article.featured ? '<span class="badge badge-warning"><i class="fas fa-star"></i></span>' : ''}
                        </div>

                        <h6 class="card-title flex-grow-1">${article.title}</h6>

                        <div class="mb-2">
                            ${article.tags.slice(0, 3).map(tag =>
                                `<span class="badge badge-secondary badge-sm mr-1">#${tag}</span>`
                            ).join('')}
                        </div>

                        <div class="d-flex justify-content-between align-items-center mt-auto">
                            <small class="text-muted">
                                <i class="fas fa-eye"></i> ${article.views || 0}
                            </small>
                            <div class="rating-stars">
                                ${this.renderStars(article.rating)}
                            </div>
                        </div>

                        <div class="mt-3">
                            <button class="btn btn-sm btn-primary btn-block" onclick="knowledgeManager.viewArticle('${article.id}')">
                                <i class="fas fa-book-open"></i> Читати
                            </button>
                        </div>
                    </div>
                    <div class="card-footer bg-transparent">
                        <small class="text-muted">
                            Оновлено: ${this.formatDate(article.updatedDate)}
                        </small>
                    </div>
                </div>
            </div>
        `);
    }

    getDifficultyText(difficulty) {
        const difficulties = {
            'beginner': 'Початківець',
            'intermediate': 'Середній',
            'advanced': 'Просунутий'
        };
        return difficulties[difficulty] || difficulty;
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
        
        let stars = '';
        
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        
        if (halfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return stars;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('uk-UA');
    }

    viewArticle(articleId) {
        const article = this.articles.find(a => a.id === articleId);
        if (!article) return;

        currentArticleId = articleId;
        
        // Збільшити лічильник переглядів
        article.views = (article.views || 0) + 1;
        localStorage.setItem('knowledgeArticles', JSON.stringify(this.articles));

        const modalContent = this.createArticleContent(article);
        $('#articleContent').html(modalContent);
        
        // Оновити стан закладки
        this.updateBookmarkButton(articleId);
        
        $('#viewArticleModal').modal('show');
    }

    createArticleContent(article) {
        const difficultyClass = `tag-${article.difficulty}`;
        const difficultyText = this.getDifficultyText(article.difficulty);
        
        return `
            <div class="article-content">
                <div class="row">
                    <div class="col-md-8">
                        <div class="content-section">
                            <div class="d-flex justify-content-between align-items-start mb-4">
                                <div>
                                    <h2>${article.title}</h2>
                                    <div class="breadcrumb-custom">
                                        <span class="text-muted">Категорія: </span>
                                        <span class="font-weight-bold">${this.getCategoryText(article.category)}</span>
                                        <span class="mx-2">•</span>
                                        <span class="${difficultyClass} tag">${difficultyText}</span>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="rating-stars mb-1">
                                        ${this.renderStars(article.rating)}
                                        <small>(${article.rating})</small>
                                    </div>
                                    <small class="text-muted">${article.views} переглядів</small>
                                </div>
                            </div>

                            <div class="mb-4">
                                ${article.tags.map(tag => 
                                    `<span class="badge badge-primary badge-sm mr-1">#${tag}</span>`
                                ).join('')}
                            </div>

                            <div class="article-body">
                                ${article.content}
                            </div>

                            <div class="mt-4 pt-3 border-top">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <small class="text-muted">
                                            Автор: <strong>${article.author}</strong><br>
                                            Оновлено: ${this.formatDate(article.updatedDate)}
                                        </small>
                                    </div>
                                    <div>
                                        <button class="btn btn-sm btn-outline-success">
                                            <i class="fas fa-thumbs-up"></i> Корисно
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger">
                                            <i class="fas fa-thumbs-down"></i> Некорисно
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        ${article.related && article.related.length > 0 ? `
                            <div class="content-section mt-4">
                                <h4><i class="fas fa-link"></i> Пов'язані статті</h4>
                                <div class="row">
                                    ${article.related.map(relatedId => {
                                        const relatedArticle = this.articles.find(a => a.id === relatedId);
                                        return relatedArticle ? `
                                            <div class="col-md-6 mb-2">
                                                <div class="card card-sm">
                                                    <div class="card-body">
                                                        <h6 class="card-title">${relatedArticle.title}</h6>
                                                        <button class="btn btn-sm btn-outline-primary" onclick="knowledgeManager.viewArticle('${relatedArticle.id}')">
                                                            Читати
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ` : '';
                                    }).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <div class="col-md-4">
                        <div class="toc">
                            <h5>Зміст</h5>
                            <div class="toc-item">
                                <a href="#section1">Вступ</a>
                            </div>
                            <div class="toc-item">
                                <a href="#section2">Інструменти</a>
                            </div>
                            <div class="toc-item">
                                <a href="#section3">Інструкція</a>
                            </div>
                            <div class="toc-item">
                                <a href="#section4">Безпека</a>
                            </div>
                        </div>

                        <div class="content-section mt-4">
                            <h5>Швидкі дії</h5>
                            <button class="btn btn-outline-primary btn-sm btn-block mb-2">
                                <i class="fas fa-question-circle"></i> Задати питання
                            </button>
                            <button class="btn btn-outline-success btn-sm btn-block mb-2">
                                <i class="fas fa-download"></i> Завантажити PDF
                            </button>
                            <button class="btn btn-outline-info btn-sm btn-block">
                                <i class="fas fa-share-alt"></i> Поділитися
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getCategoryText(category) {
        const categories = {
            'repair': 'Ремонт',
            'maintenance': 'Обслуговування',
            'safety': 'Безпека',
            'troubleshooting': 'Діагностика'
        };
        return categories[category] || category;
    }

    updateBookmarkButton(articleId) {
        const isBookmarked = this.bookmarkedArticles.includes(articleId);
        $('#bookmarkBtn').html(
            isBookmarked ? 
            '<i class="fas fa-bookmark"></i> В обраному' : 
            '<i class="far fa-bookmark"></i> В обране'
        );
    }

    toggleBookmark(articleId) {
        const index = this.bookmarkedArticles.indexOf(articleId);
        
        if (index === -1) {
            this.bookmarkedArticles.push(articleId);
            this.showNotification('Додано в обране', 'success');
        } else {
            this.bookmarkedArticles.splice(index, 1);
            this.showNotification('Видалено з обраного', 'info');
        }
        
        localStorage.setItem('bookmarkedArticles', JSON.stringify(this.bookmarkedArticles));
        this.updateBookmarkButton(articleId);
    }

    downloadArticle(articleId) {
        const article = this.articles.find(a => a.id === articleId);
        if (!article) return;

        this.showNotification(`Підготовка статті "${article.title}" для завантаження...`, 'info');
        
        // Імітація створення PDF
        setTimeout(() => {
            const content = `
                ${article.title}
                ================================
                
                Категорія: ${this.getCategoryText(article.category)}
                Складність: ${this.getDifficultyText(article.difficulty)}
                Автор: ${article.author}
                Дата: ${this.formatDate(article.updatedDate)}
                
                ${article.content.replace(/<[^>]*>/g, '')}
                
                ================================
                Завантажено: ${new Date().toLocaleString('uk-UA')}
            `;
            
            const blob = new Blob([content], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `стаття_${article.id}.pdf`;
            link.click();
            
            this.showNotification('Стаття успішно завантажена', 'success');
        }, 1500);
    }

    printArticle(articleId) {
        this.showNotification('Підготовка до друку...', 'info');
        setTimeout(() => {
            window.print();
            this.showNotification('Готово до друку', 'success');
        }, 1000);
    }

    showAllArticles() {
        this.filteredArticles = [...this.articles];
        this.renderFilteredArticles();
        this.showNotification('Всі статті відображено', 'info');
    }

    showFeatured() {
        this.filteredArticles = this.articles.filter(article => article.featured);
        this.renderFilteredArticles();
        this.showNotification('Відображено обрані статті', 'info');
    }

    showRecent() {
        this.filteredArticles = this.articles
            .sort((a, b) => new Date(b.updatedDate) - new Date(a.updatedDate))
            .slice(0, 10);
        this.renderFilteredArticles();
        this.showNotification('Відображено нові статті', 'info');
    }

    showAllPopular() {
        this.filteredArticles = this.articles
            .sort((a, b) => b.views - a.views);
        this.renderFilteredArticles();
        this.showNotification('Відображено популярні статті', 'info');
    }

    showNotification(message, type = 'info') {
        if (typeof Swal !== 'undefined') {
            const Toast = Swal.mixin({
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
            const iconMap = { success: 'success', error: 'error', warning: 'warning', info: 'info' };
            Toast.fire({ icon: iconMap[type] || 'info', title: message });
        } else {
            alert(message);
        }
    }

    loadUserInfo() {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {
                firstName: 'Користувач'
            };
            $('#userName').text(currentUser.firstName);
        } catch (error) {
            console.error('Помилка завантаження даних користувача:', error);
        }
    }

    updateStatistics() {
        const totalArticles = this.articles.length;
        const totalViews = this.articles.reduce((sum, article) => sum + (article.views || 0), 0);
        const totalRating = this.articles.reduce((sum, article) => sum + (article.rating || 0), 0);
        const avgRating = totalArticles > 0 ? (totalRating / totalArticles).toFixed(1) : 0;

        $('#totalArticles').text(totalArticles);
        $('#todayViews').text(totalViews);
        $('#avgRating').text(avgRating);
        $('#activeUsers').text(Math.floor(Math.random() * 50) + 10); // Імітація активних користувачів
    }
}

// Ініціалізація
$(document).ready(function() {
    window.knowledgeManager = new KnowledgeManager();
});