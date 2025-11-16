document.addEventListener('DOMContentLoaded', function() {
    // === ПЕРЕКЛЮЧЕНИЕ ТЕМЫ ===
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle?.querySelector('.theme-icon');
    const html = document.documentElement;
    
    // Функция для получения текущей темы
    function getTheme() {
        return localStorage.getItem('theme') || 'dark';
    }
    
    // Функция для установки темы
    function setTheme(theme) {
        html.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        if (themeIcon) {
            themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
        }
    }
    
    // Инициализация темы при загрузке
    const currentTheme = getTheme();
    setTheme(currentTheme);
    
    // Обработчик переключения темы
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = getTheme();
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });
    }
    
    // Элементы DOM
    const eventsList = document.getElementById('events-list');
    const generateBtn = document.getElementById('generate-btn');
    const routesSection = document.getElementById('routes-section');
    const routesContainer = document.getElementById('routes-container');
    const backBtn = document.getElementById('back-btn');
    
    // Сценарий 2
    const memberNameInput = document.getElementById('member-name-input');
    const addMemberBtn = document.getElementById('add-member-btn');
    const groupMembers = document.getElementById('group-members');
    const groupEventsList = document.getElementById('group-events-list');
    const generateGroupBtn = document.getElementById('generate-group-btn');
    
    // Сценарий 3
    const scenario3 = document.getElementById('scenario3');
    const currentRouteEvents = document.getElementById('current-route-events');
    const addEventsList = document.getElementById('add-events-list');
    const initialEventsList = document.getElementById('initial-events-list');
    const initialRouteSection = document.getElementById('initial-route-section');
    const addEventSection = document.getElementById('add-event-section');
    const currentRouteDisplay = document.getElementById('current-route-display');
    const createInitialRouteBtn = document.getElementById('create-initial-route-btn');
    const rebuildRouteBtn = document.getElementById('rebuild-route-btn');
    const resetRouteBtn = document.getElementById('reset-route-btn');

    // Переключение сценариев
    document.getElementById('switch-to-scenario1').addEventListener('click', () => showScenario('1'));
    document.getElementById('switch-to-scenario2').addEventListener('click', () => showScenario('2'));
    document.getElementById('switch-to-scenario3').addEventListener('click', () => showScenario('3'));

    let allEvents = [];
    let selectedEventIds = [];
    let groupParticipants = [];
    let activeParticipantIndex = -1;
    let currentRoute = [];
    let originalRoute = []; // Сохраняем изначальный маршрут
    
    // Фильтры и поиск
    let currentFilters = {
        search: '',
        timeFilter: 'all'
    };
    
    // Система уведомлений об ошибках
    let errorNotificationsQueue = [];
    let isShowingError = false;
    
    // Создаем контейнер для уведомлений об ошибках, если его нет
    function initErrorContainer() {
        let container = document.getElementById('error-notifications-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'error-notifications-container';
            container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10001; display: flex; flex-direction: column; gap: 12px; pointer-events: none;';
            document.body.appendChild(container);
        }
        return container;
    }
    
    // Функция для показа ошибок
    function showError(message) {
        const container = initErrorContainer();
        
        // Создаем элемент уведомления
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.style.cssText = `
            background: rgba(255, 71, 87, 0.95);
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(255, 71, 87, 0.4);
            min-width: 300px;
            max-width: 400px;
            font-size: 0.95rem;
            line-height: 1.5;
            opacity: 0;
            transform: translateX(400px);
            transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            pointer-events: auto;
            word-wrap: break-word;
        `;
        notification.textContent = message;
        
        // Добавляем в очередь перед добавлением в DOM
        errorNotificationsQueue.push({ element: notification, message: message });
        
        // Показываем следующее уведомление
        showNextError();
    }
    
    // Показывает следующее уведомление из очереди
    function showNextError() {
        if (isShowingError || errorNotificationsQueue.length === 0) {
            return;
        }
        
        isShowingError = true;
        const { element } = errorNotificationsQueue.shift();
        const container = initErrorContainer();
        
        // Добавляем элемент в DOM
        container.appendChild(element);
        
        // Плавное появление
        requestAnimationFrame(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateX(0)';
        });
        
        // Автоматически исчезает через 3 секунды
        setTimeout(() => {
            element.style.opacity = '0';
            element.style.transform = 'translateX(400px)';
            
            // Удаляем элемент после анимации
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
                isShowingError = false;
                showNextError(); // Показываем следующее уведомление
            }, 300);
        }, 3000);
    }

    // Загрузка событий
    async function loadEvents() {
        try {
            const response = await fetch('http://localhost:5000/api/events');
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ошибка загрузки событий: ${response.status} ${errorText}`);
            }
            allEvents = await response.json();
            renderEvents(eventsList, selectedEventIds);
            if (addEventsList) renderEvents(addEventsList, []);
            if (initialEventsList) renderEvents(initialEventsList, []);
        } catch (error) {
            console.error('Ошибка загрузки событий:', error);
            showError(`Не удалось загрузить события: ${error.message}`);
            eventsList.innerHTML = `<p style="color: #ff6b6b; text-align: center;">Ошибка: ${error.message}</p>`;
        }
    }

    // Функция для определения времени суток
    function getTimeOfDay(timeStr) {
        const hour = parseInt(timeStr.split(':')[0]);
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'day';
        return 'evening';
    }
    
    // Функция для проверки, является ли событие ближайшим (в течение часа)
    function isUpcomingEvent(event) {
        const now = new Date();
        const eventTime = new Date(`2000-01-01T${event.start_time}:00`);
        const currentTime = new Date(`2000-01-01T${now.getHours()}:${now.getMinutes()}:00`);
        const diffMinutes = (eventTime - currentTime) / (1000 * 60);
        return diffMinutes >= 0 && diffMinutes <= 60;
    }
    
    // Функция фильтрации событий
    function filterEvents(events, searchText, timeFilter) {
        return events.filter(event => {
            // Поиск по названию
            const matchesSearch = !searchText || 
                event.name.toLowerCase().includes(searchText.toLowerCase());
            
            // Фильтр по времени
            const matchesTime = timeFilter === 'all' || 
                getTimeOfDay(event.start_time) === timeFilter;
            
            return matchesSearch && matchesTime;
        });
    }
    
    function renderEvents(container, selectedIds, searchText = '', timeFilter = 'all', showUpcoming = true) {
        if (!container) return;
        container.innerHTML = '';
        if (allEvents.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: rgba(255, 255, 255, 0.6); padding: 20px;">Нет доступных событий</p>';
            return;
        }
        
        // Фильтруем события
        const filteredEvents = filterEvents(allEvents, searchText, timeFilter);
        
        if (filteredEvents.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: rgba(255, 255, 255, 0.6); padding: 20px;">События не найдены</p>';
            return;
        }
        
        filteredEvents.forEach(event => {
            const eventCard = document.createElement('div');
            eventCard.className = 'event-card';
            eventCard.dataset.id = event.id;
            if (selectedIds.includes(event.id)) {
                eventCard.classList.add('selected');
            }
            
            // Подсветка ближайших событий
            if (showUpcoming && isUpcomingEvent(event)) {
                eventCard.classList.add('upcoming');
            }

            eventCard.innerHTML = `
                <div class="event-name">${event.name}</div>
                <div class="event-info">
                    <span>⏰ ${event.start_time}</span>
                    <span>⏳ ${event.duration} мин</span>
                    <span>📍 ${event.location}</span>
                </div>
            `;
            container.appendChild(eventCard);
        });
    }
    
    // Обновление счетчика выбранных событий
    function updateSelectedCounter(counterId, count) {
        const counter = document.getElementById(counterId);
        if (counter) {
            const badge = counter.querySelector('strong');
            if (badge) {
                badge.textContent = count;
            }
        }
    }
    
    // Инициализация фильтров для контейнера
    function initFilters(containerSelector, searchInputId, counterId, eventsContainer, getSelectedIdsFn, scenarioType = '1') {
        const searchInput = document.getElementById(searchInputId);
        const container = document.querySelector(containerSelector);
        if (!searchInput || !container) return;
        
        // Функция для получения выбранных ID (может быть функцией или массивом)
        const getSelectedIds = typeof getSelectedIdsFn === 'function' ? getSelectedIdsFn : () => getSelectedIdsFn;
        
        // Обработчик поиска
        const handleFilterChange = () => {
            const searchText = searchInput.value;
            const activeTimeFilter = container.querySelector('.time-filter-btn.active')?.dataset.time || 'all';
            const selectedIds = getSelectedIds();
            
            if (scenarioType === '2') {
                // Для группового сценария используем renderCommonEvents
                renderCommonEvents(searchText, activeTimeFilter);
                if (activeParticipantIndex !== -1 && groupParticipants[activeParticipantIndex]) {
                    updateSelectedCounter(counterId, groupParticipants[activeParticipantIndex].selectedEventIds.length);
                }
            } else {
                renderEvents(eventsContainer, selectedIds, searchText, activeTimeFilter);
                updateSelectedCounter(counterId, selectedIds.length);
            }
        };
        
        searchInput.addEventListener('input', handleFilterChange);
        
        // Обработчики фильтров по времени
        container.querySelectorAll('.time-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.time-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                handleFilterChange();
            });
        });
    }

    function showScenario(id) {
        document.getElementById('scenario1').style.display = 'none';
        document.getElementById('scenario2').style.display = 'none';
        scenario3.style.display = 'none';
        routesSection.style.display = 'none';

        if (id === '1') {
            document.getElementById('scenario1').style.display = 'block';
            selectedEventIds = [];
            renderEvents(eventsList, selectedEventIds);
            updateGenerateBtn();
            updateSelectedCounter('selected-counter-1', 0);
            // Сброс фильтров
            const searchInput1 = document.getElementById('search-input-1');
            if (searchInput1) searchInput1.value = '';
        } else if (id === '2') {
            document.getElementById('scenario2').style.display = 'block';
            groupParticipants = [];
            activeParticipantIndex = -1;
            renderGroupMembers();
            groupEventsList.style.display = 'none';
            generateGroupBtn.style.display = 'none';
            const groupFiltersSection = document.getElementById('group-filters-section');
            if (groupFiltersSection) groupFiltersSection.style.display = 'none';
        } else if (id === '3') {
            scenario3.style.display = 'block';
            currentRoute = [];
            originalRoute = [];
            selectedEventIds = [];
            
            // Показываем секцию создания начального маршрута
            initialRouteSection.style.display = 'block';
            currentRouteDisplay.style.display = 'none';
            addEventSection.style.display = 'none';
            
            // Загружаем события для выбора начального маршрута
            renderEvents(initialEventsList, []);
            createInitialRouteBtn.style.display = 'none';
            updateSelectedCounter('selected-counter-3-initial', 0);
            // Сброс фильтров
            const searchInput3Initial = document.getElementById('search-input-3-initial');
            if (searchInput3Initial) searchInput3Initial.value = '';
        }
    }

    function updateGenerateBtn() {
        generateBtn.disabled = selectedEventIds.length === 0;
    }

    // === СЦЕНАРИЙ 1 ===
    // Инициализация фильтров для сценария 1
    const filtersSection1 = document.querySelector('#scenario1 .filters-section');
    if (filtersSection1) {
        initFilters('#scenario1 .filters-section', 'search-input-1', 'selected-counter-1', eventsList, () => selectedEventIds, '1');
    }
    
    eventsList.addEventListener('click', (e) => {
        const card = e.target.closest('.event-card');
        if (!card) return;
        const eventId = Number(card.dataset.id);
        const index = selectedEventIds.indexOf(eventId);
        if (index === -1) {
            selectedEventIds.push(eventId);
            card.classList.add('selected');
        } else {
            selectedEventIds.splice(index, 1);
            card.classList.remove('selected');
        }
        updateGenerateBtn();
        updateSelectedCounter('selected-counter-1', selectedEventIds.length);
    });

    generateBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('http://localhost:5000/api/generate-routes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selectedEventIds })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Сервер вернул ошибку ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            displayRoutes(data.routes || []);
        } catch (error) {
            console.error('Ошибка:', error);
            showError(`Ошибка генерации маршрутов: ${error.message}`);
        }
    });

    // === СЦЕНАРИЙ 2: ГРУППОВОЕ ПЛАНИРОВАНИЕ ===

    function handleGroupEventClick(e) {
        const card = e.target.closest('.event-card');
        if (!card) return;
        const eventId = Number(card.dataset.id);

        if (activeParticipantIndex === -1 || !groupParticipants[activeParticipantIndex]) {
            showError('Сначала выберите участника!');
            return;
        }

        const participant = groupParticipants[activeParticipantIndex];
        const index = participant.selectedEventIds.indexOf(eventId);
        if (index === -1) {
            participant.selectedEventIds.push(eventId);
            card.classList.add('selected');
        } else {
            participant.selectedEventIds.splice(index, 1);
            card.classList.remove('selected');
        }
        renderGroupMembers();
        updateSelectedCounter('selected-counter-2', participant.selectedEventIds.length);
    }

    function renderCommonEvents(searchText = '', timeFilter = 'all') {
        if (!groupEventsList) return;
        groupEventsList.innerHTML = '';
        if (allEvents.length === 0) {
            groupEventsList.innerHTML = '<p style="text-align: center; color: rgba(255, 255, 255, 0.6); padding: 20px;">Нет доступных событий</p>';
            return;
        }
        
        // Фильтруем события
        const filteredEvents = filterEvents(allEvents, searchText, timeFilter);
        
        if (filteredEvents.length === 0) {
            groupEventsList.innerHTML = '<p style="text-align: center; color: rgba(255, 255, 255, 0.6); padding: 20px;">События не найдены</p>';
            return;
        }
        
        const selectedIds = activeParticipantIndex !== -1 && groupParticipants[activeParticipantIndex] 
            ? groupParticipants[activeParticipantIndex].selectedEventIds 
            : [];
        
        filteredEvents.forEach(event => {
            const eventCard = document.createElement('div');
            eventCard.className = 'event-card';
            eventCard.dataset.id = event.id;
            
            if (selectedIds.includes(event.id)) {
                eventCard.classList.add('selected');
            }
            
            // Подсветка ближайших событий
            if (isUpcomingEvent(event)) {
                eventCard.classList.add('upcoming');
            }

            eventCard.innerHTML = `
                <div class="event-name">${event.name}</div>
                <div class="event-info">
                    <span>⏰ ${event.start_time}</span>
                    <span>⏳ ${event.duration} мин</span>
                    <span>📍 ${event.location}</span>
                </div>
            `;
            groupEventsList.appendChild(eventCard);
        });
    }

    function addParticipant() {
        const name = memberNameInput.value.trim();
        if (!name) {
            showError('Пожалуйста, введите имя участника.');
            return;
        }

        const participant = {
            name: name,
            selectedEventIds: []
        };
        groupParticipants.push(participant);
        memberNameInput.value = '';
        
        // Сразу делаем нового участника активным
        const newIndex = groupParticipants.length - 1;
        setActiveParticipant(newIndex);
    }

    function renderGroupMembers() {
        if (!groupMembers) return;
        groupMembers.innerHTML = '';
        if (groupParticipants.length === 0) {
            groupMembers.innerHTML = '<p class="no-members-text">Нет участников. Добавьте первого участника, чтобы начать выбор событий.</p>';
            groupEventsList.style.display = 'none';
            generateGroupBtn.style.display = 'none';
            return;
        }

        groupParticipants.forEach((participant, index) => {
            const chip = document.createElement('div');
            chip.className = 'member-chip';
            if (index === activeParticipantIndex) {
                chip.classList.add('active');
            }

            chip.innerHTML = `
                <span class="member-chip-name">${participant.name}</span>
                <span class="member-chip-count">${participant.selectedEventIds.length}</span>
                <button class="member-chip-remove" data-index="${index}">×</button>
            `;

            // Клик по чипу — делает участника активным
            chip.addEventListener('click', (e) => {
                if (!e.target.classList.contains('member-chip-remove')) {
                    setActiveParticipant(index);
                }
            });

            // Удаление участника
            chip.querySelector('.member-chip-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                groupParticipants.splice(index, 1);
                if (activeParticipantIndex >= groupParticipants.length) {
                    activeParticipantIndex = groupParticipants.length > 0 ? groupParticipants.length - 1 : -1;
                }
                renderGroupMembers();
                if (groupParticipants.length > 0) {
                    renderCommonEvents();
                }
            });

            groupMembers.appendChild(chip);
        });

        // Показываем список событий и кнопку генерации, если есть участники
        if (groupParticipants.length > 0) {
            groupEventsList.style.display = 'grid';
            generateGroupBtn.style.display = 'block';
            const groupFiltersSection = document.getElementById('group-filters-section');
            if (groupFiltersSection) groupFiltersSection.style.display = 'block';
            if (activeParticipantIndex === -1) {
                setActiveParticipant(0);
            } else {
                // Получаем текущие значения фильтров
                const searchInput = document.getElementById('search-input-2');
                const groupFilters = document.getElementById('group-filters-section');
                const searchText = searchInput ? searchInput.value : '';
                const timeFilter = groupFilters ? (groupFilters.querySelector('.time-filter-btn.active')?.dataset.time || 'all') : 'all';
                renderCommonEvents(searchText, timeFilter);
                updateSelectedCounter('selected-counter-2', groupParticipants[activeParticipantIndex]?.selectedEventIds.length || 0);
            }
        }
    }

    function setActiveParticipant(index) {
        activeParticipantIndex = index;
        renderGroupMembers();
        // Получаем текущие значения фильтров
        const searchInput = document.getElementById('search-input-2');
        const groupFilters = document.getElementById('group-filters-section');
        const searchText = searchInput ? searchInput.value : '';
        const timeFilter = groupFilters ? (groupFilters.querySelector('.time-filter-btn.active')?.dataset.time || 'all') : 'all';
        renderCommonEvents(searchText, timeFilter);
        updateSelectedCounter('selected-counter-2', groupParticipants[index]?.selectedEventIds.length || 0);
    }

    // Добавляем обработчик для групповых событий один раз при инициализации
    if (groupEventsList) {
        groupEventsList.addEventListener('click', handleGroupEventClick);
    }
    
    // Инициализация фильтров для группового сценария
    const groupFiltersSection = document.getElementById('group-filters-section');
    if (groupFiltersSection) {
        initFilters('#group-filters-section', 'search-input-2', 'selected-counter-2', groupEventsList, () => {
            return activeParticipantIndex !== -1 && groupParticipants[activeParticipantIndex] 
                ? groupParticipants[activeParticipantIndex].selectedEventIds 
                : [];
        }, '2');
    }

    addMemberBtn.addEventListener('click', addParticipant);
    memberNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addParticipant();
    });

    generateGroupBtn.addEventListener('click', async () => {
        if (groupParticipants.length === 0) {
            showError('Добавьте хотя бы одного участника!');
            return;
        }

        const validPreferences = groupParticipants
            .filter(p => p.selectedEventIds.length > 0)
            .map(p => ({ selectedEventIds: p.selectedEventIds }));

        if (validPreferences.length === 0) {
            showError('Ни один участник не выбрал события!');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/generate-routes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    selectedEventIds: [],
                    groupPreferences: validPreferences
                })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Ошибка ${response.status}: ${text}`);
            }

            const data = await response.json();
            displayRoutes(data.routes || []);
        } catch (error) {
            console.error('Ошибка:', error);
            showError(`Ошибка генерации группового маршрута: ${error.message}`);
        }
    });

    // === СЦЕНАРИЙ 3: Выбор событий для начального маршрута ===
    // Инициализация фильтров для начального маршрута
    const initialFiltersSection = document.querySelector('#initial-route-section .filters-section');
    if (initialFiltersSection) {
        initFilters('#initial-route-section .filters-section', 'search-input-3-initial', 'selected-counter-3-initial', initialEventsList, () => selectedEventIds, '3');
    }
    
    if (initialEventsList) {
        initialEventsList.addEventListener('click', (e) => {
            const card = e.target.closest('.event-card');
            if (!card) return;
            const eventId = Number(card.dataset.id);
            
            const index = selectedEventIds.indexOf(eventId);
            if (index === -1) {
                selectedEventIds.push(eventId);
                card.classList.add('selected');
            } else {
                selectedEventIds.splice(index, 1);
                card.classList.remove('selected');
            }
            
            // Показываем кнопку создания маршрута, если выбраны события
            createInitialRouteBtn.style.display = selectedEventIds.length > 0 ? 'block' : 'none';
            updateSelectedCounter('selected-counter-3-initial', selectedEventIds.length);
        });
    }

    // === СЦЕНАРИЙ 3: Добавление событий к существующему маршруту ===
    // Инициализация фильтров для добавления событий
    const addFiltersSection = document.querySelector('#add-event-section .filters-section');
    if (addFiltersSection) {
        initFilters('#add-event-section .filters-section', 'search-input-3-add', 'selected-counter-3-add', addEventsList, () => selectedEventIds, '3');
    }
    
    if (addEventsList) {
        addEventsList.addEventListener('click', (e) => {
            const card = e.target.closest('.event-card');
            if (!card) return;
            const eventId = Number(card.dataset.id);
            
            // Проверяем, не находится ли событие уже в текущем маршруте
            const alreadyInRoute = currentRoute.some(e => e.id === eventId);
            if (alreadyInRoute) {
                showToast('Это событие уже в вашем текущем маршруте!', 'info');
                return;
            }
            
            const index = selectedEventIds.indexOf(eventId);
            if (index === -1) {
                selectedEventIds.push(eventId);
                card.classList.add('selected');
            } else {
                selectedEventIds.splice(index, 1);
                card.classList.remove('selected');
            }
            
            // Показываем/скрываем кнопки "Перестроить маршрут" и "Сбросить маршрут"
            if (rebuildRouteBtn) {
                rebuildRouteBtn.style.display = selectedEventIds.length > 0 ? 'block' : 'none';
            }
            if (resetRouteBtn) {
                resetRouteBtn.style.display = selectedEventIds.length > 0 ? 'block' : 'none';
            }
            updateSelectedCounter('selected-counter-3-add', selectedEventIds.length);
        });
    }

    // Обработчик кнопки "Перестроить маршрут"
    if (rebuildRouteBtn) {
        rebuildRouteBtn.addEventListener('click', async () => {
            if (selectedEventIds.length === 0) {
                showToast('Выберите хотя бы одно событие для добавления!', 'info');
                return;
            }
            
            if (currentRoute.length === 0) {
                showToast('Сначала создайте начальный маршрут!', 'info');
                return;
            }
            
            // Валидация временных конфликтов перед отправкой запроса
            const conflictCheck = checkTimeConflicts(currentRoute, selectedEventIds);
            if (conflictCheck.hasConflict) {
                showError(`❌ Событие «${conflictCheck.conflictingEvent.name}» конфликтует по времени с вашим текущим маршрутом. Выберите другое событие.`);
                return;
            }
            
            await rebuildRouteAutomatically(selectedEventIds);
        });
    }
    
    // Обработчик кнопки "Сбросить маршрут"
    if (resetRouteBtn) {
        resetRouteBtn.addEventListener('click', () => {
            resetRoute();
        });
    }

    // Перестроение маршрута - добавляем события к текущему маршруту
    async function rebuildRouteAutomatically(newEventIds) {
        if (currentRoute.length === 0) {
            showToast('Сначала создайте начальный маршрут!', 'info');
            return;
        }

        try {
            // Отправляем только новые события (не включая те, что уже в currentRoute)
            // Backend сам объединит currentRoute + новые события
            const response = await fetch('http://localhost:5000/api/generate-routes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    selectedEventIds: newEventIds, // Только новые события
                    currentRoute: currentRoute // Текущий маршрут
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Сервер вернул ошибку ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            if (data.routes && data.routes.length > 0) {
                // Берем первый маршрут, который должен содержать исходные + новые события
                const newRoute = data.routes[0].events;
                
                // Проверяем, что все исходные события остались в маршруте
                const originalIds = originalRoute.map(e => e.id);
                const newRouteIds = newRoute.map(e => e.id);
                const allOriginalPresent = originalIds.every(id => newRouteIds.includes(id));
                
                if (!allOriginalPresent) {
                    showError('Не удалось добавить события. Они конфликтуют с текущим маршрутом.');
                    // Не очищаем selectedEventIds, чтобы пользователь мог попробовать другие события
                    renderEvents(addEventsList, selectedEventIds);
                    if (rebuildRouteBtn) {
                        rebuildRouteBtn.style.display = selectedEventIds.length > 0 ? 'block' : 'none';
                    }
                    if (resetRouteBtn) {
                        resetRouteBtn.style.display = selectedEventIds.length > 0 ? 'block' : 'none';
                    }
                    return;
                }
                
                // Обновляем текущий маршрут (исходный + новые события)
                currentRoute = newRoute;
                
                // Очищаем выбранные события
                selectedEventIds = [];
                displayCurrentRoute();
                renderEvents(addEventsList, []);
                
                // Скрываем кнопки "Перестроить маршрут" и "Сбросить маршрут"
                if (rebuildRouteBtn) {
                    rebuildRouteBtn.style.display = 'none';
                }
                if (resetRouteBtn) {
                    resetRouteBtn.style.display = 'none';
                }
                
                // Помечаем события, которые уже в маршруте, как недоступные
                if (addEventsList) {
                    const routeEventIds = currentRoute.map(e => e.id);
                    addEventsList.querySelectorAll('.event-card').forEach(card => {
                        const eventId = Number(card.dataset.id);
                        if (routeEventIds.includes(eventId)) {
                            card.style.opacity = '0.5';
                            card.style.cursor = 'not-allowed';
                            card.style.pointerEvents = 'none';
                        }
                    });
                }
                
                // Показываем красивое уведомление
                const addedCount = newRoute.length - originalRoute.length;
                showToast(
                    `✅ Добавлено ${addedCount} событий к маршруту! Итого: ${newRoute.length} событий`,
                    'success'
                );
            } else {
                showError('Не удалось добавить события. Возможно, они конфликтуют с текущим маршрутом.');
                // Не очищаем selectedEventIds, чтобы пользователь мог попробовать другие события
                renderEvents(addEventsList, selectedEventIds);
                if (rebuildRouteBtn) {
                    rebuildRouteBtn.style.display = selectedEventIds.length > 0 ? 'block' : 'none';
                }
                if (resetRouteBtn) {
                    resetRouteBtn.style.display = selectedEventIds.length > 0 ? 'block' : 'none';
                }
            }
        } catch (error) {
            console.error('Ошибка:', error);
            showError(`Ошибка перестроения маршрута: ${error.message}`);
            // Не очищаем selectedEventIds при ошибке
            renderEvents(addEventsList, selectedEventIds);
            if (rebuildRouteBtn) {
                rebuildRouteBtn.style.display = selectedEventIds.length > 0 ? 'block' : 'none';
            }
            if (resetRouteBtn) {
                resetRouteBtn.style.display = selectedEventIds.length > 0 ? 'block' : 'none';
            }
        }
    }

    // Функция для показа красивого уведомления
    function showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        
        const toastIcon = toast.querySelector('.toast-icon');
        const toastMessage = toast.querySelector('.toast-message');
        
        // Устанавливаем иконку и сообщение в зависимости от типа
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️'
        };
        
        toastIcon.textContent = icons[type] || icons.info;
        toastMessage.textContent = message;
        
        // Удаляем старые классы типов
        toast.classList.remove('success', 'error', 'info');
        toast.classList.add(type);
        
        // Показываем toast
        toast.classList.add('show');
        
        // Автоматически скрываем через 4 секунды
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }

    function displayCurrentRoute() {
        if (!currentRouteEvents) return;
        currentRouteEvents.innerHTML = '';
        if (currentRoute.length === 0) {
            currentRouteEvents.innerHTML = '<li style="color: rgba(255, 255, 255, 0.5);">Маршрут пуст. Создайте начальный маршрут или выберите события ниже.</li>';
            return;
        }
        
        // Показываем информацию об изначальном маршруте, если к нему были добавлены события
        if (originalRoute.length > 0 && currentRoute.length > originalRoute.length) {
            const addedCount = currentRoute.length - originalRoute.length;
            const info = document.createElement('li');
            info.style.cssText = 'color: rgba(6, 182, 212, 0.8); font-style: italic; padding-bottom: 12px; border-bottom: 1px solid rgba(6, 182, 212, 0.3); margin-bottom: 8px;';
            info.textContent = `📌 Исходный маршрут: ${originalRoute.length} событий + добавлено: ${addedCount} → Всего: ${currentRoute.length} событий`;
            currentRouteEvents.appendChild(info);
        }
        
        currentRoute.forEach((event, index) => {
            const li = document.createElement('li');
            // Подсвечиваем новые события (которые не были в изначальном маршруте)
            const isNew = originalRoute.length > 0 && !originalRoute.some(e => e.id === event.id);
            if (isNew) {
                li.style.cssText = 'background: rgba(16, 185, 129, 0.1); padding: 12px; border-radius: 8px; margin: 4px 0; border-left: 3px solid var(--secondary);';
            }
            li.innerHTML = `
                <span class="event-time">${event.start_time}</span>
                <span class="event-name">${event.name} ${isNew ? '<span style="color: var(--secondary); font-size: 0.85rem;">(новое)</span>' : ''}</span>
                <span class="event-location">📍 ${event.location}</span>
            `;
            currentRouteEvents.appendChild(li);
        });
    }

    // Создание начального маршрута из выбранных событий
    if (createInitialRouteBtn) {
        createInitialRouteBtn.addEventListener('click', async () => {
            if (selectedEventIds.length === 0) {
                showToast('Выберите хотя бы одно событие для начального маршрута!', 'info');
                return;
            }

            try {
                const response = await fetch('http://localhost:5000/api/generate-routes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        selectedEventIds: selectedEventIds,
                        currentRoute: null
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Сервер вернул ошибку ${response.status}: ${errorText}`);
                }

                const data = await response.json();
                if (data.routes && data.routes.length > 0) {
                    // Берем первый маршрут из сгенерированных
                    currentRoute = data.routes[0].events;
                    originalRoute = [...currentRoute]; // Сохраняем изначальный маршрут
                    
                    // Очищаем выбранные события
                    selectedEventIds = [];
                    
                    // Скрываем секцию создания начального маршрута
                    initialRouteSection.style.display = 'none';
                    
                    // Показываем текущий маршрут и секцию добавления событий
                    currentRouteDisplay.style.display = 'block';
                    addEventSection.style.display = 'block';
                    
                    // Обновляем отображение
                    displayCurrentRoute();
                    
                    // Загружаем события для добавления (исключая уже выбранные)
                    const routeEventIds = currentRoute.map(e => e.id);
                    renderEvents(addEventsList, []);
                    
                    // Помечаем события, которые уже в маршруте, как недоступные
                    if (addEventsList) {
                        addEventsList.querySelectorAll('.event-card').forEach(card => {
                            const eventId = Number(card.dataset.id);
                            if (routeEventIds.includes(eventId)) {
                                card.style.opacity = '0.5';
                                card.style.cursor = 'not-allowed';
                                card.style.pointerEvents = 'none';
                            }
                        });
                    }
                    
                    // Скрываем кнопки "Перестроить маршрут" и "Сбросить маршрут" (события еще не выбраны)
                    if (rebuildRouteBtn) {
                        rebuildRouteBtn.style.display = 'none';
                    }
                    if (resetRouteBtn) {
                        resetRouteBtn.style.display = 'none';
                    }
                    
                    showToast(`✅ Начальный маршрут создан! Добавлено ${currentRoute.length} событий. Теперь вы можете выбирать новые события и нажать "Перестроить маршрут".`, 'success');
                } else {
                    showError('Не удалось создать маршрут. Возможно, выбранные события конфликтуют по времени.');
                }
            } catch (error) {
                console.error('Ошибка при создании маршрута:', error);
                showError(`Ошибка создания маршрута: ${error.message}`);
            }
        });
    }

    // Вспомогательная функция для проверки конфликтов времени
    // Учитывает длительность события и 5 минут на перемещение между разными локациями
    function hasTimeConflict(event1, event2) {
        try {
            const start1 = new Date(`2000-01-01T${event1.start_time}:00`);
            const end1 = new Date(start1.getTime() + event1.duration * 60000);
            const start2 = new Date(`2000-01-01T${event2.start_time}:00`);
            const end2 = new Date(start2.getTime() + event2.duration * 60000);
            
            // Если события в разных локациях, нужно учесть 5 минут на перемещение
            const travelTime = event1.location !== event2.location ? 5 : 0;
            
            // События конфликтуют, если они перекрываются по времени
            // (с учетом времени на перемещение между разными локациями)
            // Конфликт есть, если одно событие начинается до того, как другое заканчивается (с учетом времени на перемещение)
            const end1WithTravel = new Date(end1.getTime() + travelTime * 60000);
            const end2WithTravel = new Date(end2.getTime() + travelTime * 60000);
            
            // Нет конфликта, если одно событие полностью заканчивается до начала другого
            // (с учетом времени на перемещение)
            if (end1WithTravel <= start2 || end2WithTravel <= start1) {
                return false;
            }
            
            // Иначе есть конфликт
            return true;
        } catch (e) {
            return true;
        }
    }
    
    // Функция для проверки конфликтов между текущим маршрутом и новыми событиями
    function checkTimeConflicts(currentRoute, newEventIds) {
        const newEvents = allEvents.filter(e => newEventIds.includes(e.id));
        
        for (const routeEvent of currentRoute) {
            for (const newEvent of newEvents) {
                if (hasTimeConflict(routeEvent, newEvent)) {
                    return {
                        hasConflict: true,
                        conflictingEvent: newEvent
                    };
                }
            }
        }
        
        return { hasConflict: false };
    }
    
    // Функция сброса маршрута
    function resetRoute() {
        // Очищаем список выбранных новых событий
        selectedEventIds = [];
        
        // Возвращаем маршрут к исходному состоянию
        if (originalRoute.length > 0) {
            currentRoute = [...originalRoute];
        } else {
            currentRoute = [];
        }
        
        // Обновляем отображение текущего маршрута
        displayCurrentRoute();
        
        // Сбрасываем выделение всех карточек событий
        renderEvents(addEventsList, []);
        
        // Восстанавливаем видимость событий, которые были в маршруте
        if (addEventsList) {
            const routeEventIds = currentRoute.map(e => e.id);
            addEventsList.querySelectorAll('.event-card').forEach(card => {
                const eventId = Number(card.dataset.id);
                if (routeEventIds.includes(eventId)) {
                    card.style.opacity = '0.5';
                    card.style.cursor = 'not-allowed';
                    card.style.pointerEvents = 'none';
                } else {
                    card.style.opacity = '1';
                    card.style.cursor = 'pointer';
                    card.style.pointerEvents = 'auto';
                }
            });
        }
        
        // Скрываем кнопки
        if (rebuildRouteBtn) {
            rebuildRouteBtn.style.display = 'none';
        }
        if (resetRouteBtn) {
            resetRouteBtn.style.display = 'none';
        }
    }

    // Функция копирования маршрута в буфер обмена
    function copyRouteToClipboard(routes) {
        if (routes.length === 0) return;
        
        let text = '🎪 МОЙ МАРШРУТ НА ФЕСТИВАЛЕ\n\n';
        routes.forEach((route, index) => {
            const totalDuration = route.totalDuration;
            const hours = Math.floor(totalDuration / 60);
            const minutes = totalDuration % 60;
            const durationText = hours > 0 ? `${hours}ч ${minutes}мин` : `${minutes}мин`;
            
            text += `━━━ МАРШРУТ #${index + 1} ━━━\n`;
            text += `📅 Событий: ${route.eventCount} | ⏳ Длительность: ${durationText}\n\n`;
            
            route.events.forEach((e, i) => {
                text += `${i + 1}. ${e.start_time} — ${e.name}\n`;
                text += `   📍 ${e.location} (${e.duration} мин)\n\n`;
            });
            
            if (index < routes.length - 1) {
                text += '\n';
            }
        });
        
        navigator.clipboard.writeText(text).then(() => {
            showToast('✅ Маршрут скопирован в буфер обмена!', 'success');
        }).catch(() => {
            showToast('❌ Не удалось скопировать маршрут', 'error');
        });
    }
    
    // === ОТОБРАЖЕНИЕ РЕЗУЛЬТАТОВ ===
    let currentDisplayedRoutes = [];
    
    function displayRoutes(routes) {
        routesContainer.innerHTML = '';
        document.getElementById('scenario1').style.display = 'none';
        document.getElementById('scenario2').style.display = 'none';
        scenario3.style.display = 'none';
        routesSection.style.display = 'block';
        currentDisplayedRoutes = routes;

        if (routes.length === 0) {
            routesContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; background: rgba(236, 72, 153, 0.1); border-radius: 16px; border: 1px solid rgba(236, 72, 153, 0.3);">
                    <h3 style="color: var(--pink); margin-bottom: 12px; font-size: 1.5rem;">😞 Нет подходящих маршрутов</h3>
                    <p style="color: rgba(255, 255, 255, 0.8);">Все выбранные события конфликтуют по времени.<br>Попробуйте выбрать другие.</p>
                </div>
            `;
            const copyBtn = document.getElementById('copy-route-btn');
            if (copyBtn) copyBtn.style.display = 'none';
            return;
        }

        routes.forEach((route, index) => {
            const totalDuration = route.totalDuration;
            const hours = Math.floor(totalDuration / 60);
            const minutes = totalDuration % 60;
            const durationText = hours > 0 ? `${hours}ч ${minutes}мин` : `${minutes}мин`;

            const routeCard = document.createElement('div');
            routeCard.className = 'route-card';
            routeCard.innerHTML = `
                <div class="route-header">
                    <div class="route-title">Маршрут #${index + 1}</div>
                    <div class="route-stats">📅 ${route.eventCount} событий | ⏳ ${durationText}</div>
                </div>
                <ul class="route-events">
                    ${route.events.map(e => `
                        <li>
                            <span class="event-time">${e.start_time}</span>
                            <span>${e.name} <small>📍 ${e.location}</small></span>
                        </li>
                    `).join('')}
                </ul>
            `;
            routesContainer.appendChild(routeCard);
        });
        
        // Показываем кнопку копирования
        const copyBtn = document.getElementById('copy-route-btn');
        if (copyBtn) {
            copyBtn.style.display = 'block';
        }
    }
    
    // Обработчик кнопки копирования маршрута
    const copyRouteBtn = document.getElementById('copy-route-btn');
    if (copyRouteBtn) {
        copyRouteBtn.addEventListener('click', () => {
            copyRouteToClipboard(currentDisplayedRoutes);
        });
    }

    backBtn.addEventListener('click', () => {
        showScenario('1');
    });

    loadEvents();
});