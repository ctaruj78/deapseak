/**
 * Universal Drag-to-Scroll для таблиць
 * Автоматично активується на всіх .table-responsive контейнерах
 * 
 * Features:
 * - Drag-to-scroll мишкою для горизонтального скролу
 * - Автоматична ініціалізація при завантаженні DOM
 * - Працює з динамічно доданими таблицями (MutationObserver)
 * - Не блокує інтерактивні елементи (кнопки, посилання)
 * - Підтримка тачпадів та мишок
 * 
 * Використання:
 * 1. Додайте клас .table-responsive до контейнера
 * 2. Опціонально: .table-wide або .table-extra-wide для різної мінімальної ширини
 * 3. Скрипт автоматично активує drag-to-scroll
 * 
 * @author DeapSeaK Team
 * @version 1.0.0
 */

(function() {
    'use strict';

    // Конфігурація
    const CONFIG = {
        scrollSpeed: 2, // Множник швидкості скролу
        clickThreshold: 5, // Поріг пікселів для розпізнавання drag vs click
        detectScrollDelay: 100, // Затримка перевірки наявності скролу (мс)
        excludeSelectors: [
            'button', 'a', 'input', 'select', 'textarea', 
            '.btn', '.badge', '.dropdown-toggle', '[contenteditable]'
        ]
    };

    /**
     * Ініціалізує drag-to-scroll для контейнера
     */
    function initDragScroll(container) {
        // Пропускаємо якщо вже ініціалізовано
        if (container.dataset.dragScrollInit === 'true') {
            return;
        }

        let isDown = false;
        let startX;
        let startY;
        let scrollLeft;
        let scrollTop;
        let hasMoved = false;

        // Перевіряємо чи є горизонтальний скрол
        const checkHasScroll = () => {
            const hasScroll = container.scrollWidth > container.clientWidth;
            container.classList.toggle('has-scroll', hasScroll);
        };

        // Mousedown - початок драгу
        container.addEventListener('mousedown', (e) => {
            // Пропускаємо якщо клік на інтерактивному елементі
            if (shouldExcludeElement(e.target)) {
                return;
            }

            isDown = true;
            hasMoved = false;
            container.style.cursor = 'grabbing';
            
            startX = e.pageX - container.offsetLeft;
            startY = e.pageY - container.offsetTop;
            scrollLeft = container.scrollLeft;
            scrollTop = container.scrollTop;
        });

        // Mouseleave - виходимо за межі контейнера
        container.addEventListener('mouseleave', () => {
            isDown = false;
            container.style.cursor = 'grab';
        });

        // Mouseup - відпускаємо
        container.addEventListener('mouseup', (e) => {
            isDown = false;
            container.style.cursor = 'grab';
            
            // Якщо не було руху, дозволяємо клік
            if (!hasMoved && e.target.tagName === 'A') {
                e.target.click();
            }
        });

        // Mousemove - рух під час драгу
        container.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            
            e.preventDefault();
            
            const x = e.pageX - container.offsetLeft;
            const y = e.pageY - container.offsetTop;
            
            const walkX = (x - startX) * CONFIG.scrollSpeed;
            const walkY = (y - startY) * CONFIG.scrollSpeed;
            
            // Перевіряємо чи був рух
            if (Math.abs(walkX) > CONFIG.clickThreshold || Math.abs(walkY) > CONFIG.clickThreshold) {
                hasMoved = true;
            }
            
            // Горизонтальний скрол
            if (container.scrollWidth > container.clientWidth) {
                container.scrollLeft = scrollLeft - walkX;
            }
            
            // Вертикальний скрол (якщо є)
            if (container.scrollHeight > container.clientHeight) {
                container.scrollTop = scrollTop - walkY;
            }
        });

        // Запобігаємо drag зображень та посилань
        container.addEventListener('dragstart', (e) => {
            if (!shouldExcludeElement(e.target)) {
                e.preventDefault();
            }
        });

        // Перевірка наявності скролу
        checkHasScroll();
        
        // Перевіряємо після завантаження контенту
        setTimeout(checkHasScroll, CONFIG.detectScrollDelay);
        
        // Перевіряємо при зміні розміру вікна
        const resizeObserver = new ResizeObserver(checkHasScroll);
        resizeObserver.observe(container);

        // Позначаємо як ініціалізовано
        container.dataset.dragScrollInit = 'true';
        
        console.log('✅ Drag-to-scroll ініціалізовано для:', container);
    }

    /**
     * Перевіряє чи елемент є інтерактивним (не треба драгати)
     */
    function shouldExcludeElement(element) {
        return CONFIG.excludeSelectors.some(selector => {
            return element.matches(selector) || element.closest(selector);
        });
    }

    /**
     * Ініціалізує всі .table-responsive контейнери
     */
    function initAllTables() {
        const containers = document.querySelectorAll('.table-responsive');
        console.log(`🔍 Знайдено ${containers.length} .table-responsive контейнерів`);
        
        containers.forEach(container => {
            initDragScroll(container);
        });
    }

    /**
     * Спостерігач за динамічно доданими елементами
     */
    function setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        // Якщо доданий елемент сам є .table-responsive
                        if (node.classList && node.classList.contains('table-responsive')) {
                            initDragScroll(node);
                        }
                        
                        // Або якщо всередині є .table-responsive
                        const tables = node.querySelectorAll && node.querySelectorAll('.table-responsive');
                        if (tables && tables.length > 0) {
                            tables.forEach(table => initDragScroll(table));
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('👀 MutationObserver активовано для динамічних таблиць');
    }

    /**
     * Публічний API
     */
    window.TableDragScroll = {
        init: initDragScroll,
        initAll: initAllTables,
        config: CONFIG
    };

    /**
     * Автоматична ініціалізація при завантаженні DOM
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initAllTables();
            setupMutationObserver();
        });
    } else {
        // DOM вже завантажено
        initAllTables();
        setupMutationObserver();
    }

    console.log('📦 Universal Table Drag-to-Scroll module loaded');

})();
