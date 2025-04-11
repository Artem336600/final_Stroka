let allTags = {};
let selectedTags = new Set();
let modal;
let authModal;
let profileModal;
let currentUser = null;

// Загружаем теги при инициализации страницы
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // Скрываем индикатор загрузки при инициализации страницы
        document.getElementById('loading').style.display = 'none';
        
        modal = document.getElementById('tagsModal');
        authModal = document.getElementById('authModal');
        profileModal = document.getElementById('profileModal');
        
        const response = await fetch('/get_tags');
        if (!response.ok) {
            throw new Error('Ошибка при получении тегов');
        }
        
        const data = await response.json();
        allTags = data.tags_hierarchy;
        
        // Инициализируем модальное окно
        initModal();
        
        // Добавляем обработчик для кнопки "Добавить тег"
        const addTagBtn = document.getElementById('addTagBtn');
        if (addTagBtn) {
            addTagBtn.addEventListener('click', showTagsModal);
        }
        
        // Добавляем обработчик для кнопки "Извлечь теги"
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', extractTags);
        }
        
        // Добавляем обработчик нажатия клавиши Enter в поле ввода
        const userInput = document.getElementById('userInput');
        if (userInput) {
            userInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    extractTags();
                }
            });
        }
        
        // Инициализируем обработчики для элементов профиля и аутентификации
        initAuthHandlers();
        
        // Проверяем, авторизован ли пользователь
        checkUserAuthentication();
    } catch (error) {
        console.error('Ошибка при загрузке тегов:', error);
    }
});

// Проверка аутентификации пользователя
async function checkUserAuthentication() {
    // Получаем токен из localStorage
    const token = localStorage.getItem('userToken');
    
    if (token) {
        try {
            // Получаем данные профиля
            const response = await fetch('/get_user_profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'success') {
                    // Устанавливаем текущего пользователя
                    currentUser = {
                        token,
                        telegram: data.user.tg,
                        name: data.user.name || data.user.tg,
                        role: data.user.who || 'student',
                        about: data.user.about || ''
                    };
                    
                    // Обновляем UI для авторизованного пользователя
                    updateUIForAuthenticatedUser();
                } else {
                    // Если произошла ошибка, очищаем токен
                    localStorage.removeItem('userToken');
                    updateUIForUnauthenticatedUser();
                }
            } else {
                // Если произошла ошибка, очищаем токен
                localStorage.removeItem('userToken');
                updateUIForUnauthenticatedUser();
            }
        } catch (error) {
            console.error('Ошибка при проверке аутентификации:', error);
            localStorage.removeItem('userToken');
            updateUIForUnauthenticatedUser();
        }
    } else {
        updateUIForUnauthenticatedUser();
    }
}

// Обновление UI для авторизованного пользователя
function updateUIForAuthenticatedUser() {
    document.getElementById('userAuthSection').style.display = 'none';
    document.getElementById('userProfileSection').style.display = 'flex';
    document.getElementById('userDisplayName').textContent = currentUser.name;
    
    // Настраиваем данные профиля в модальном окне
    document.getElementById('profileName').value = currentUser.name;
    document.getElementById('profileAbout').value = currentUser.about;
    
    // Устанавливаем роль пользователя
    const roleInputs = document.querySelectorAll('input[name="profileWho"]');
    for (const input of roleInputs) {
        if (input.value === currentUser.role) {
            input.checked = true;
            break;
        }
    }
}

// Обновление UI для неавторизованного пользователя
function updateUIForUnauthenticatedUser() {
    document.getElementById('userAuthSection').style.display = 'flex';
    document.getElementById('userProfileSection').style.display = 'none';
    currentUser = null;
}

// Инициализация обработчиков для аутентификации
function initAuthHandlers() {
    // Кнопки в навигационной панели
    document.getElementById('loginButton').addEventListener('click', () => showAuthModal('login'));
    document.getElementById('registerButton').addEventListener('click', () => showAuthModal('register'));
    document.getElementById('profileIcon').addEventListener('click', showProfileModal);
    
    // Переключение вкладок внутри формы авторизации
    document.getElementById('loginTab').addEventListener('click', () => switchAuthTab('login'));
    document.getElementById('registerTab').addEventListener('click', () => switchAuthTab('register'));
    
    // Обработчики формы входа
    document.getElementById('loginSubmitButton').addEventListener('click', handleLogin);
    
    // Обработчики формы регистрации
    document.getElementById('nextStep1').addEventListener('click', () => processRegistrationStep(1));
    document.getElementById('prevStep2').addEventListener('click', () => showRegistrationStep(1));
    document.getElementById('prevStep3').addEventListener('click', () => showRegistrationStep(2));
    document.getElementById('completeRegistration').addEventListener('click', finishRegistration);
    document.getElementById('closeRegistration').addEventListener('click', closeAuthModal);
    
    // Обработчики для профиля
    document.getElementById('saveProfileButton').addEventListener('click', saveUserProfile);
    document.getElementById('logoutButton').addEventListener('click', logout);
    
    // Обработчики для закрытия модальных окон
    const closeButtons = document.querySelectorAll('.close-btn');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.dataset.modal;
            if (modalId) {
                document.getElementById(modalId).style.display = 'none';
            } else {
                // Для кнопок без data-modal атрибута закрываем родительское модальное окно
                const modalElement = button.closest('.modal');
                if (modalElement) {
                    modalElement.style.display = 'none';
                }
            }
        });
    });
    
    // Закрытие модальных окон при клике вне их области
    window.addEventListener('click', (event) => {
        if (event.target === authModal) {
            authModal.style.display = 'none';
        }
        if (event.target === profileModal) {
            profileModal.style.display = 'none';
        }
    });
}

// Показ модального окна авторизации
function showAuthModal(tab = 'login') {
    authModal.style.display = 'flex';
    
    // Очищаем поля формы и сообщения об ошибках
    document.getElementById('loginTelegram').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('telegramUsername').value = '';
    document.getElementById('password').value = '';
    document.getElementById('confirmPassword').value = '';
    
    document.getElementById('loginError').textContent = '';
    document.getElementById('step1Error').textContent = '';
    document.getElementById('step3Error').textContent = '';
    
    // Переключаемся на нужную вкладку
    switchAuthTab(tab);
    
    // Если открываем форму регистрации, показываем первый шаг
    if (tab === 'register') {
        showRegistrationStep(1);
    }
}

// Закрытие модального окна авторизации
function closeAuthModal() {
    authModal.style.display = 'none';
}

// Переключение вкладок в форме авторизации
function switchAuthTab(tab) {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registrationForm = document.getElementById('registrationForm');
    
    if (tab === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active');
        registrationForm.classList.remove('active');
    } else {
        loginTab.classList.remove('active');
        registerTab.classList.add('active');
        loginForm.classList.remove('active');
        registrationForm.classList.add('active');
    }
}

// Показ определенного шага регистрации
function showRegistrationStep(step) {
    const steps = document.querySelectorAll('.registration-step');
    steps.forEach(s => s.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');
}

// Обработка входа пользователя
async function handleLogin() {
    const telegramUsername = document.getElementById('loginTelegram').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorElement = document.getElementById('loginError');
    
    // Очищаем сообщение об ошибке
    errorElement.textContent = '';
    
    // Проверка введенных данных
    if (!telegramUsername) {
        errorElement.textContent = 'Введите имя пользователя в Telegram';
        return;
    }
    
    if (!password) {
        errorElement.textContent = 'Введите пароль';
        return;
    }
    
    try {
        // Отправляем запрос на сервер
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                telegram_username: telegramUsername,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            // Сохраняем токен
            localStorage.setItem('userToken', data.token);
            
            // Устанавливаем данные пользователя
            currentUser = {
                token: data.token,
                telegram: telegramUsername,
                name: data.user?.name || telegramUsername,
                role: data.user?.who || 'student',
                about: data.user?.about || ''
            };
            
            // Обновляем UI
            updateUIForAuthenticatedUser();
            
            // Закрываем модальное окно
            closeAuthModal();
        } else {
            errorElement.textContent = data.message || 'Ошибка при входе в систему';
        }
    } catch (error) {
        console.error('Ошибка при входе:', error);
        errorElement.textContent = 'Произошла ошибка при входе в систему';
    }
}

// Обработка шага регистрации
async function processRegistrationStep(step) {
    if (step === 1) {
        const telegramUsername = document.getElementById('telegramUsername').value.trim();
        const errorElement = document.getElementById('step1Error');
        
        // Очищаем сообщение об ошибке
        errorElement.textContent = '';
        
        // Проверка введенных данных
        if (!telegramUsername) {
            errorElement.textContent = 'Введите имя пользователя в Telegram';
            return;
        }
        
        try {
            // Отправляем запрос на создание запроса подтверждения
            const response = await fetch('/create_confirmation_request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    telegram_username: telegramUsername
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                // Переходим к следующему шагу
                showRegistrationStep(2);
                
                // Начинаем проверку статуса подтверждения
                startConfirmationStatusCheck(telegramUsername);
            } else {
                errorElement.textContent = data.message || 'Ошибка при создании запроса';
            }
        } catch (error) {
            console.error('Ошибка при создании запроса:', error);
            errorElement.textContent = 'Произошла ошибка при создании запроса';
        }
    }
}

// Проверка статуса подтверждения
async function startConfirmationStatusCheck(telegramUsername) {
    const checkInterval = setInterval(async () => {
        try {
            const response = await fetch('/check_confirmation_status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    telegram_username: telegramUsername
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'success' && data.confirmation_status === 'accepted') {
                // Останавливаем интервал
                clearInterval(checkInterval);
                
                // Переходим к следующему шагу
                showRegistrationStep(3);
            } else if (data.status === 'success' && data.confirmation_status === 'rejected') {
                // Останавливаем интервал
                clearInterval(checkInterval);
                
                // Возвращаемся к первому шагу
                showRegistrationStep(1);
                
                // Показываем сообщение об ошибке
                document.getElementById('step1Error').textContent = 'Запрос был отклонен';
            }
        } catch (error) {
            console.error('Ошибка при проверке статуса:', error);
        }
    }, 2000); // Проверяем каждые 2 секунды
    
    // Сохраняем интервал в глобальной переменной, чтобы можно было его остановить при необходимости
    window.confirmationCheckInterval = checkInterval;
}

// Завершение регистрации
async function finishRegistration() {
    const telegramUsername = document.getElementById('telegramUsername').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorElement = document.getElementById('step3Error');
    
    // Очищаем сообщение об ошибке
    errorElement.textContent = '';
    
    // Проверка введенных данных
    if (!password) {
        errorElement.textContent = 'Введите пароль';
        return;
    }
    
    if (password.length < 8) {
        errorElement.textContent = 'Пароль должен содержать не менее 8 символов';
        return;
    }
    
    if (password !== confirmPassword) {
        errorElement.textContent = 'Пароли не совпадают';
        return;
    }
    
    try {
        // Отправляем запрос на создание пользователя
        const response = await fetch('/create_user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                telegram_username: telegramUsername,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            // Переходим к последнему шагу
            showRegistrationStep(4);
            
            // Устанавливаем таймер для закрытия модального окна
            setTimeout(() => {
                closeAuthModal();
                
                // Показываем форму входа
                showAuthModal('login');
            }, 3000);
        } else {
            errorElement.textContent = data.message || 'Ошибка при создании пользователя';
        }
    } catch (error) {
        console.error('Ошибка при создании пользователя:', error);
        errorElement.textContent = 'Произошла ошибка при создании пользователя';
    }
}

// Показ модального окна профиля
function showProfileModal() {
    if (!currentUser) {
        showAuthModal('login');
        return;
    }
    
    // Заполняем форму профиля данными пользователя
    document.getElementById('profileName').value = currentUser.name;
    document.getElementById('profileAbout').value = currentUser.about;
    
    // Устанавливаем роль пользователя
    const roleInputs = document.querySelectorAll('input[name="profileWho"]');
    for (const input of roleInputs) {
        if (input.value === currentUser.role) {
            input.checked = true;
            break;
        }
    }
    
    // Показываем модальное окно
    profileModal.style.display = 'flex';
}

// Сохранение профиля пользователя
async function saveUserProfile() {
    if (!currentUser) {
        return;
    }
    
    const name = document.getElementById('profileName').value.trim();
    const about = document.getElementById('profileAbout').value.trim();
    const roleInputs = document.querySelectorAll('input[name="profileWho"]');
    let role = 'student';
    
    for (const input of roleInputs) {
        if (input.checked) {
            role = input.value;
            break;
        }
    }
    
    const errorElement = document.getElementById('profileError');
    
    // Очищаем сообщение об ошибке
    errorElement.textContent = '';
    
    // Проверка введенных данных
    if (!name) {
        errorElement.textContent = 'Введите имя';
        return;
    }
    
    try {
        // Отправляем запрос на обновление профиля
        const response = await fetch('/update_user_profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: currentUser.token,
                name: name,
                about: about,
                who: role
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            // Обновляем данные пользователя
            currentUser.name = name;
            currentUser.about = about;
            currentUser.role = role;
            
            // Обновляем UI
            document.getElementById('userDisplayName').textContent = name;
            
            // Закрываем модальное окно
            profileModal.style.display = 'none';
        } else {
            errorElement.textContent = data.message || 'Ошибка при обновлении профиля';
        }
    } catch (error) {
        console.error('Ошибка при обновлении профиля:', error);
        errorElement.textContent = 'Произошла ошибка при обновлении профиля';
    }
}

// Выход из системы
function logout() {
    // Удаляем токен
    localStorage.removeItem('userToken');
    
    // Очищаем данные пользователя
    currentUser = null;
    
    // Обновляем UI
    updateUIForUnauthenticatedUser();
    
    // Закрываем модальное окно профиля
    profileModal.style.display = 'none';
}

// Инициализация модального окна с тегами
function initModal() {
    const categoriesContainer = document.getElementById('modalCategories');
    if (!categoriesContainer) {
        console.error('modalCategories element not found');
        return;
    }
    categoriesContainer.innerHTML = '';
    
    // Создаем элементы для каждой основной категории
    for (const [mainCategory, subcategories] of Object.entries(allTags)) {
        const mainCategoryDiv = document.createElement('div');
        mainCategoryDiv.className = `main-category category-${mainCategory.replace(/\s+/g, '_')}`;
        mainCategoryDiv.dataset.category = mainCategory;
        
        const mainTitleDiv = document.createElement('div');
        mainTitleDiv.className = 'main-category-title';
        mainTitleDiv.textContent = mainCategory;
        
        const subcategoriesDiv = document.createElement('div');
        subcategoriesDiv.className = 'subcategories';
        
        // Создаем элементы для каждой подкатегории
        for (const [subcategory, tags] of Object.entries(subcategories)) {
            const subcategoryDiv = document.createElement('div');
            subcategoryDiv.className = 'category-tags';
            
            const titleDiv = document.createElement('div');
            titleDiv.className = 'category-title';
            titleDiv.textContent = subcategory;
            
            const tagsDiv = document.createElement('div');
            tagsDiv.className = 'tags-list';
            
            // Добавляем теги в подкатегорию
            tags.forEach(tag => {
                const tagElement = document.createElement('button');
                tagElement.className = 'tag-pill';
                tagElement.textContent = tag;
                tagElement.dataset.tag = tag;
                
                // Отмечаем уже выбранные теги
                if (selectedTags.has(tag)) {
                    tagElement.classList.add('selected');
                }
                
                // Добавляем обработчик клика
                tagElement.addEventListener('click', () => {
                    toggleTag(tag, tagElement);
                });
                
                tagsDiv.appendChild(tagElement);
            });
            
            subcategoryDiv.appendChild(titleDiv);
            subcategoryDiv.appendChild(tagsDiv);
            subcategoriesDiv.appendChild(subcategoryDiv);
        }
        
        mainCategoryDiv.appendChild(mainTitleDiv);
        mainCategoryDiv.appendChild(subcategoriesDiv);
        categoriesContainer.appendChild(mainCategoryDiv);
    }
    
    // Добавляем обработчик поиска
    const searchInput = document.getElementById('tagSearch');
    searchInput.addEventListener('input', filterTags);
    
    // Обработчик закрытия модального окна
    document.querySelector('.close-btn').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // Закрытие модального окна при клике вне его области
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Переключение выбора тега
function toggleTag(tag, element) {
    if (selectedTags.has(tag)) {
        selectedTags.delete(tag);
        element.classList.remove('selected');
    } else {
        selectedTags.add(tag);
        element.classList.add('selected');
    }
    
    // Обновляем отображение выбранных тегов
    renderTags();
    
    // Обновляем профили
    updateProfileCards();
}

// Фильтрация тегов по поисковому запросу
function filterTags() {
    const searchText = document.getElementById('tagSearch').value.toLowerCase();
    const searchResults = document.getElementById('searchResults');
    
    if (searchText.length < 2) {
        // Если поисковый запрос слишком короткий, скрываем результаты поиска
        searchResults.style.display = 'none';
        document.getElementById('modalCategories').style.display = 'flex';
        return;
    }
    
    // Получаем выбранную категорию
    const selectedCategory = document.getElementById('selectedCategory').dataset.category;
    if (!selectedCategory || !allTags[selectedCategory]) {
        return;
    }
    
    // Очищаем результаты поиска
    searchResults.innerHTML = '';
    let foundTags = 0;
    
    // Ищем совпадения только в тегах выбранной категории
    for (const [subcategory, tags] of Object.entries(allTags[selectedCategory])) {
        tags.forEach(tag => {
            if (tag.toLowerCase().includes(searchText)) {
                // Создаем элемент для найденного тега
                const tagElement = document.createElement('div');
                tagElement.className = `available-tag ${selectedTags.has(tag) ? 'selected' : ''}`;
                tagElement.dataset.tag = tag;
                tagElement.textContent = tag;
                tagElement.addEventListener('click', () => toggleTagSelection(tagElement, tag));
                
                // Добавляем подкатегорию как дополнительную информацию
                const subcategorySpan = document.createElement('small');
                subcategorySpan.textContent = ` (${subcategory})`;
                subcategorySpan.style.opacity = '0.7';
                subcategorySpan.style.marginLeft = '4px';
                tagElement.appendChild(subcategorySpan);
                
                // Добавляем элемент в результаты поиска
                searchResults.appendChild(tagElement);
                foundTags++;
            }
        });
    }
    
    // Показываем результаты поиска, если найдены совпадения
    if (foundTags > 0) {
        searchResults.style.display = 'flex';
        document.getElementById('modalCategories').style.display = 'none';
    } else {
        // Если тегов не найдено, показываем сообщение об этом
        const noTagsMessage = document.createElement('div');
        noTagsMessage.className = 'no-tags-message';
        noTagsMessage.textContent = 'Теги не найдены';
        searchResults.appendChild(noTagsMessage);
        searchResults.style.display = 'flex';
        document.getElementById('modalCategories').style.display = 'none';
    }
}

// Добавление тега
function addTag(tagName) {
    if (!selectedTags.has(tagName)) {
        selectedTags.add(tagName);
        renderTags();
        // Обновляем профили
        updateProfileCards();
    }
}

// Удаление тега
function removeTag(tagName) {
    if (selectedTags.has(tagName)) {
        selectedTags.delete(tagName);
        renderTags();
        
        // Обновляем отображение в модальном окне, если оно открыто
        const tagElements = document.querySelectorAll(`.available-tag`);
        tagElements.forEach(element => {
            if (element.textContent.includes(tagName)) {
                element.classList.remove('selected');
            }
        });
        
        // Обновляем профили
        updateProfileCards();
    }
}

// Отрисовка выбранных тегов
function renderTags() {
    const tagsContainer = document.querySelector('.selected-category .tags');
    if (!tagsContainer) {
        console.error('Tags container not found');
        return;
    }
    tagsContainer.innerHTML = '';
    
    // Получаем выбранную категорию
    const selectedCategory = document.getElementById('selectedCategory').dataset.category;
    const categoryClass = selectedCategory ? `category-${selectedCategory.replace(/\s+/g, '_')}` : '';
    
    if (selectedTags.size === 0) {
        tagsContainer.innerHTML = '<p class="no-tags">Нет выбранных тегов</p>';
        return;
    }
    
    selectedTags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = `tag ${categoryClass}`;
        tagElement.textContent = tag;
        
        const removeBtn = document.createElement('span');
        removeBtn.className = 'tag-remove';
        removeBtn.innerHTML = '&times;';
        removeBtn.onclick = function(e) {
            e.stopPropagation();
            removeTag(tag);
        };
        
        tagElement.appendChild(removeBtn);
        tagsContainer.appendChild(tagElement);
    });
}

// Открытие модального окна с тегами
document.getElementById('addTagBtn').addEventListener('click', () => {
    modal.style.display = 'block';
    document.getElementById('tagSearch').value = '';
    filterTags(); // Сбрасываем фильтрацию при открытии
    
    // Обновляем выделение тегов в модальном окне
    document.querySelectorAll('.tag-pill').forEach(tagElement => {
        const tag = tagElement.dataset.tag;
        if (selectedTags.has(tag)) {
            tagElement.classList.add('selected');
        } else {
            tagElement.classList.remove('selected');
        }
    });
});

document.getElementById('submitBtn').addEventListener('click', extractTags);
document.getElementById('userInput').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        extractTags();
    }
});

async function extractTags() {
    const userInput = document.getElementById('userInput').value.trim();
    const errorElement = document.getElementById('error');
    const resultElement = document.getElementById('result');
    const loadingElement = document.getElementById('loading');
    const selectedCategoryElement = document.getElementById('selectedCategory');
    const tagsContainer = document.querySelector('.tags-container');
    
    if (!userInput) {
        errorElement.textContent = 'Пожалуйста, введите текст для извлечения тегов.';
        errorElement.style.display = 'block';
        return;
    }
    
    try {
        // Скрываем сообщение об ошибке
        errorElement.style.display = 'none';
        
        // Показываем индикатор загрузки
        loadingElement.style.display = 'flex';
        
        // Скрываем область результатов
        resultElement.style.display = 'none';
        
        // Скрываем выбранную категорию и контейнер тегов во время поиска
        selectedCategoryElement.classList.remove('visible');
        if (tagsContainer) {
            tagsContainer.classList.remove('visible');
        }
        
        const response = await fetch('/extract_tags', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_input: userInput })
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при извлечении тегов');
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Очищаем ранее выбранные теги
        selectedTags.clear();
        
        // Обрабатываем извлеченные теги, если они есть
        if (data.tags) {
            // Убираем возможные пробелы и разбиваем строку по запятым
            const tagsList = data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
            
            // Устанавливаем категорию и делаем ее видимой
            const mainCategory = data.main_category || 'Разное';
            selectedCategoryElement.dataset.category = mainCategory;
            document.querySelector('.category-text').textContent = mainCategory;
            selectedCategoryElement.classList.add('visible');
            
            // Показываем контейнер тегов
            if (tagsContainer) {
                tagsContainer.classList.add('visible');
            }
            
            // Добавляем извлеченные теги в набор выбранных
            tagsList.forEach(tag => {
                selectedTags.add(tag);
            });
            
            // Обновляем отображение тегов
            renderTags();
            
            // Обновляем отображение профилей
            updateProfileCards();
        }
        
        // Скрываем индикатор загрузки
        loadingElement.style.display = 'none';
    } catch (error) {
        console.error('Ошибка при извлечении тегов:', error);
        errorElement.textContent = error.message || 'Произошла ошибка при извлечении тегов';
        errorElement.style.display = 'block';
        loadingElement.style.display = 'none';
        
        // В случае ошибки тоже скрываем контейнер категории и тегов
        selectedCategoryElement.classList.remove('visible');
        if (tagsContainer) {
            tagsContainer.classList.remove('visible');
        }
    }
}

// Add event listener for category change button
document.getElementById('changeCategoryBtn').addEventListener('click', async function() {
    const selectedCategoryDiv = document.getElementById('selectedCategory');
    const categoryText = selectedCategoryDiv.querySelector('.category-text');
    const currentCategory = selectedCategoryDiv.dataset.category;
    const userInput = document.getElementById('userInput').value.trim();
    const loadingDiv = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error');
    const tagsContainer = document.querySelector('.tags-container');
    
    if (!userInput) {
        alert('Пожалуйста, введите текст для анализа');
        return;
    }

    // Create modal for category selection
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-btn">&times;</span>
            <h2>Выберите категорию</h2>
            <div class="category-list"></div>
        </div>
    `;
    document.body.appendChild(modal);

    // Add categories to modal
    const categoryList = modal.querySelector('.category-list');
    Object.keys(allTags).forEach(category => {
        const categoryBtn = document.createElement('button');
        const categoryClass = category.replace(/\s+/g, '_');
        categoryBtn.className = `category-btn category-${categoryClass}`;
        if (category === currentCategory) {
            categoryBtn.classList.add('selected');
        }
        categoryBtn.textContent = category;
        categoryBtn.addEventListener('click', async () => {
            // Close modal immediately
            modal.remove();
            
            // Show loading state
            loadingDiv.style.display = 'block';
            resultDiv.style.display = 'none';
            errorDiv.style.display = 'none';
            
            // Скрываем выбранную категорию и контейнер тегов во время обработки
            selectedCategoryDiv.classList.remove('visible');
            if (tagsContainer) {
                tagsContainer.classList.remove('visible');
            }
            
            // Update category text immediately
            const newCategoryClass = category.replace(/\s+/g, '_');
            selectedCategoryDiv.className = `selected-category category-${newCategoryClass}`;
            categoryText.textContent = category;
            selectedCategoryDiv.dataset.category = category;
            
            try {
                const response = await fetch('/extract_tags', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        user_input: userInput,
                        force_category: category
                    })
                });

                if (!response.ok) {
                    throw new Error('Ошибка при извлечении тегов');
                }

                const data = await response.json();
                loadingDiv.style.display = 'none';

                // Clear existing tags
                selectedTags.clear();
                renderTags();

                // Add new tags
                const tags = data.tags.split(',').map(tag => tag.trim());
                tags.forEach(tag => {
                    if (tag) addTag(tag);
                });
                
                // Показываем выбранную категорию и контейнер тегов
                selectedCategoryDiv.classList.add('visible');
                if (tagsContainer) {
                    tagsContainer.classList.add('visible');
                }
                
                resultDiv.style.display = 'block';
                
                // Обновляем профили на основе извлеченных тегов
                updateProfileCards();
            } catch (error) {
                loadingDiv.style.display = 'none';
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
                
                // В случае ошибки оставляем контейнеры скрытыми
                selectedCategoryDiv.classList.remove('visible');
                if (tagsContainer) {
                    tagsContainer.classList.remove('visible');
                }
            }
        });
        categoryList.appendChild(categoryBtn);
    });

    // Close modal when clicking close button
    modal.querySelector('.close-btn').addEventListener('click', () => {
        modal.remove();
    });

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
});

function showTagsModal() {
    // Получаем выбранную категорию из атрибута data-category элемента #selectedCategory
    const selectedCategory = document.getElementById('selectedCategory').dataset.category;
    
    if (!selectedCategory) {
        // Если категория не выбрана, показываем сообщение
        alert('Сначала извлеките теги из текста, чтобы определить категорию');
        return;
    }
    
    // Очищаем содержимое модального окна
    const modalCategories = document.getElementById('modalCategories');
    modalCategories.innerHTML = '';
    
    // Получаем список подкатегорий для выбранной категории
    const subcategories = allTags[selectedCategory];
    
    if (!subcategories) {
        console.error(`Подкатегории для категории ${selectedCategory} не найдены`);
        return;
    }
    
    // Устанавливаем заголовок модального окна
    const modalTitle = modal.querySelector('h2');
    modalTitle.textContent = `Выберите теги: ${selectedCategory}`;
    
    // Создаем разделы для каждой подкатегории
    for (const [subcategory, tags] of Object.entries(subcategories)) {
        const subcategorySection = document.createElement('div');
        subcategorySection.className = `category-section category-${selectedCategory.replace(/\s+/g, '_')}`;
        
        const subcategoryTitle = document.createElement('h3');
        subcategoryTitle.textContent = subcategory;
        subcategorySection.appendChild(subcategoryTitle);
        
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'available-tags';
        
        // Добавляем теги для данной подкатегории
        tags.forEach(tag => {
            const tagElement = document.createElement('div');
            tagElement.className = `available-tag ${selectedTags.has(tag) ? 'selected' : ''}`;
            tagElement.textContent = tag;
            tagElement.dataset.tag = tag;
            tagElement.addEventListener('click', () => toggleTagSelection(tagElement, tag));
            tagsContainer.appendChild(tagElement);
        });
        
        subcategorySection.appendChild(tagsContainer);
        modalCategories.appendChild(subcategorySection);
    }
    
    // Сбрасываем поле поиска
    const tagSearch = document.getElementById('tagSearch');
    tagSearch.value = '';
    
    // Привязываем обработчик события input к полю поиска
    tagSearch.removeEventListener('input', filterTags);
    tagSearch.addEventListener('input', filterTags);
    
    // Скрываем результаты поиска
    document.getElementById('searchResults').style.display = 'none';
    
    // Показываем модальное окно
    modal.style.display = 'flex';
}

// Функция для переключения выбора тега
function toggleTagSelection(tagElement, tagName) {
    if (selectedTags.has(tagName)) {
        // Удаляем тег, если он уже выбран
        selectedTags.delete(tagName);
        tagElement.classList.remove('selected');
    } else {
        // Добавляем тег, если он еще не выбран
        selectedTags.add(tagName);
        tagElement.classList.add('selected');
    }
    
    // Обновляем отображение выбранных тегов
    renderTags();
    
    // Обновляем профили специалистов
    updateProfileCards();
}

// Profile data
const profilesData = [
    {
        id: 1,
        name: "Алексей",
        age: 25,
        role: "Разработчик",
        status: "Учитель",
        education: "МФТИ, Прикладная математика",
        image: "https://randomuser.me/api/portraits/men/32.jpg",
        bio: "Ищу специалистов для стартапа в сфере ИИ",
        tags: ["Программирование", "Искусственный интеллект", "Фотография", "Путешествия"],
        socials: ["telegram", "github", "instagram"]
    },
    {
        id: 2,
        name: "Михаил",
        age: 27,
        role: "Data Scientist",
        status: "Студент", 
        education: "НГУ, Информатика", 
        image: "https://randomuser.me/api/portraits/men/75.jpg",
        bio: "Ищу команду для хакатона по Data Science",
        tags: ["Машинное обучение", "Data Science", "Программирование", "Технологии"],
        socials: ["telegram", "github", "instagram"]
    },
    {
        id: 3,
        name: "Сергей",
        age: 30,
        role: "Инженер",
        status: "Учитель",
        education: "ТомГУ, Робототехника",
        image: "https://randomuser.me/api/portraits/men/62.jpg",
        bio: "Ищу единомышленников для проекта по робототехнике",
        tags: ["Робототехника", "Электроника", "Программирование", "3D-печать"],
        socials: ["telegram", "github", "instagram"]
    },
    {
        id: 4,
        name: "Анна",
        age: 24,
        role: "UX/UI дизайнер",
        status: "Студент",
        education: "ВШЭ, Дизайн",
        image: "https://randomuser.me/api/portraits/women/44.jpg",
        bio: "Ищу проект для создания крутого пользовательского интерфейса",
        tags: ["Дизайн", "Искусство", "Веб-разработка", "Мобильная разработка"],
        socials: ["telegram", "github", "instagram"]
    },
    {
        id: 5,
        name: "Елена",
        age: 29,
        role: "Маркетолог",
        status: "Учитель",
        education: "РЭУ, Маркетинг",
        image: "https://randomuser.me/api/portraits/women/56.jpg",
        bio: "Помогу с продвижением вашего проекта",
        tags: ["Маркетинг", "SMM", "Блоги", "Стриминг"],
        socials: ["telegram", "github", "instagram"]
    }
];

// Render profile cards
function renderProfileCards() {
    const profileCardsContainer = document.getElementById('profileCards');
    profileCardsContainer.innerHTML = '';
    
    // Filter profiles based on selected tags
    let filteredProfiles = profilesData;
    if (selectedTags.size > 0) {
        filteredProfiles = profilesData.filter(profile => {
            return Array.from(selectedTags).some(tag => profile.tags.includes(tag));
        });
    }
    
    if (filteredProfiles.length === 0) {
        profileCardsContainer.innerHTML = '<p class="no-profiles">Нет специалистов, соответствующих выбранным тегам</p>';
        return;
    }
    
    filteredProfiles.forEach(profile => {
        const card = document.createElement('div');
        card.className = 'profile-card';
        
        // Добавляем статус в правый верхний угол
        const statusBadge = document.createElement('div');
        statusBadge.className = `profile-status-badge ${profile.status === 'Учитель' ? 'status-teacher' : 'status-student'}`;
        statusBadge.textContent = profile.status;
        card.appendChild(statusBadge);
        
        const header = document.createElement('div');
        header.className = 'profile-card-header';
        
        const image = document.createElement('img');
        image.className = 'profile-image';
        image.src = profile.image;
        image.alt = profile.name;
        
        const info = document.createElement('div');
        info.className = 'profile-info';
        
        const name = document.createElement('h3');
        name.className = 'profile-name';
        name.textContent = profile.name;
        
        const details = document.createElement('div');
        details.className = 'profile-details';
        
        const age = document.createElement('div');
        age.className = 'profile-age';
        age.innerHTML = `${profile.age} лет`;
        
        const education = document.createElement('div');
        education.className = 'profile-education';
        education.innerHTML = `${profile.education}`;
        
        details.appendChild(age);
        details.appendChild(education);
        
        info.appendChild(name);
        info.appendChild(details);
        
        header.appendChild(image);
        header.appendChild(info);
        
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'profile-tags-container';
        
        const tags = document.createElement('div');
        tags.className = 'profile-tags';
        
        profile.tags.forEach(tagName => {
            const tag = document.createElement('span');
            tag.className = 'profile-tag';
            // Подсвечиваем выбранные теги
            if (selectedTags.has(tagName)) {
                tag.classList.add('selected');
            }
            tag.textContent = tagName;
            tags.appendChild(tag);
        });
        
        tagsContainer.appendChild(tags);
        
        const footer = document.createElement('div');
        footer.className = 'profile-footer';
        
        const bio = document.createElement('div');
        bio.className = 'profile-bio';
        bio.textContent = profile.bio;
        
        const socials = document.createElement('div');
        socials.className = 'profile-social';
        
        profile.socials.forEach(socialType => {
            const social = document.createElement('div');
            social.className = 'social-icon';
            social.innerHTML = getSocialIcon(socialType);
            socials.appendChild(social);
        });
        
        footer.appendChild(bio);
        footer.appendChild(socials);
        
        card.appendChild(header);
        card.appendChild(tagsContainer);
        card.appendChild(footer);
        
        profileCardsContainer.appendChild(card);
    });
}

// Get social media icon
function getSocialIcon(type) {
    switch(type) {
        case 'telegram':
            return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.175 8.586L12.25 4.086C12.675 3.886 13.05 4.161 12.875 4.861L11.45 12.111C11.3 12.686 10.975 12.836 10.5 12.561L8 10.736L6.8 11.886C6.65 12.036 6.525 12.161 6.25 12.161L6.45 9.611L10.95 5.561C11.175 5.361 10.9 5.236 10.6 5.436L5.075 8.861L2.6 8.086C2.05 7.911 2.05 7.536 3.175 7.286V8.586Z" fill="#4B5563"/></svg>';
        case 'github':
            return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1.5C4.275 1.5 1.25 4.525 1.25 8.25C1.25 11.238 3.225 13.726 5.925 14.574C6.275 14.652 6.4 14.448 6.4 14.274C6.4 14.114 6.392 13.516 6.392 13.006C4.5 13.35 4.075 12.686 3.95 12.326C3.875 12.126 3.525 11.55 3.25 11.39C3.025 11.27 2.675 10.926 3.242 10.918C3.775 10.91 4.15 11.39 4.275 11.598C4.875 12.598 5.85 12.35 6.425 12.174C6.5 11.766 6.725 11.486 6.975 11.326C5.3 11.166 3.55 10.61 3.55 8C3.55 7.276 3.825 6.678 4.3 6.215C4.212 6.05 3.975 5.35 4.37 4.39C4.37 4.39 4.925 4.215 6.4 5.19C6.925 5.04 7.475 4.965 8.025 4.965C8.575 4.965 9.125 5.04 9.65 5.19C11.125 4.21 11.68 4.39 11.68 4.39C12.075 5.35 11.837 6.05 11.75 6.215C12.225 6.678 12.5 7.27 12.5 8C12.5 10.618 10.742 11.166 9.067 11.326C9.375 11.526 9.65 11.914 9.65 12.526C9.65 13.414 9.642 14.05 9.642 14.274C9.642 14.448 9.767 14.658 10.117 14.574C11.464 14.143 12.638 13.249 13.439 12.051C14.24 10.853 14.625 9.422 14.625 7.95C14.625 4.525 11.6 1.5 8 1.5Z" fill="#4B5563"/></svg>';
        case 'instagram':
            return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1.5C9.98044 1.5 10.2165 1.50758 10.9458 1.54152C11.6708 1.57545 12.1561 1.69887 12.5826 1.8798C13.0249 2.06447 13.398 2.31235 13.7696 2.68394C14.1412 3.05554 14.3891 3.42863 14.5738 3.87094C14.7547 4.29748 14.8781 4.78284 14.9121 5.50778C14.946 6.23715 14.9536 6.47321 14.9536 8.45365C14.9536 10.4341 14.946 10.6701 14.9121 11.3995C14.8781 12.1244 14.7547 12.6098 14.5738 13.0363C14.3891 13.4787 14.1412 13.8517 13.7696 14.2233C13.398 14.5949 13.0249 14.8428 12.5826 15.0275C12.1561 15.2084 11.6708 15.3319 10.9458 15.3658C10.2165 15.3997 9.98044 15.4073 8 15.4073C6.01956 15.4073 5.78351 15.3997 5.05414 15.3658C4.32919 15.3319 3.84383 15.2084 3.41729 15.0275C2.97497 14.8428 2.60189 14.5949 2.23029 14.2233C1.8587 13.8517 1.61081 13.4787 1.42614 13.0363C1.24522 12.6098 1.1218 12.1244 1.08786 11.3995C1.05393 10.6701 1.04635 10.4341 1.04635 8.45365C1.04635 6.47321 1.05393 6.23715 1.08786 5.50778C1.1218 4.78284 1.24522 4.29748 1.42614 3.87094C1.61081 3.42863 1.8587 3.05554 2.23029 2.68394C2.60189 2.31235 2.97497 2.06447 3.41729 1.8798C3.84383 1.69887 4.32919 1.57545 5.05414 1.54152C5.78351 1.50758 6.01956 1.5 8 1.5ZM8 3.76852C6.05709 3.76852 5.83863 3.77534 5.11691 3.80874C4.45077 3.83955 4.10409 3.95796 3.86805 4.05865C3.55468 4.19306 3.33129 4.35491 3.09767 4.58854C2.86405 4.82216 2.7022 5.04555 2.56779 5.35891C2.4671 5.59495 2.34869 5.94163 2.31788 6.60777C2.28448 7.32949 2.27766 7.54795 2.27766 9.49086C2.27766 11.4338 2.28448 11.6522 2.31788 12.3739C2.34869 13.0401 2.4671 13.3868 2.56779 13.6228C2.7022 13.9362 2.86405 14.1596 3.09767 14.3932C3.33129 14.6268 3.55468 14.7887 3.86805 14.9231C4.10409 15.0238 4.45077 15.1422 5.11691 15.173C5.83863 15.2064 6.05709 15.2132 8 15.2132C9.94291 15.2132 10.1614 15.2064 10.8831 15.173C11.5492 15.1422 11.8959 15.0238 12.132 14.9231C12.4453 14.7887 12.6687 14.6268 12.9023 14.3932C13.136 14.1596 13.2978 13.9362 13.4322 13.6228C13.5329 13.3868 13.6513 13.0401 13.6821 12.3739C13.7155 11.6522 13.7223 11.4338 13.7223 9.49086C13.7223 7.54795 13.7155 7.32949 13.6821 6.60777C13.6513 5.94163 13.5329 5.59495 13.4322 5.35891C13.2978 5.04555 13.136 4.82216 12.9023 4.58854C12.6687 4.35491 12.4453 4.19306 12.132 4.05865C11.8959 3.95796 11.5492 3.83955 10.8831 3.80874C10.1614 3.77534 9.94291 3.76852 8 3.76852ZM8 5.78204C10.0457 5.78204 11.7018 7.43813 11.7018 9.48386C11.7018 11.5296 10.0457 13.1857 8 13.1857C5.95427 13.1857 4.29819 11.5296 4.29819 9.48386C4.29819 7.43813 5.95427 5.78204 8 5.78204ZM8 11.6447C9.1944 11.6447 10.1627 10.6764 10.1627 9.48204C10.1627 8.28765 9.1944 7.31935 8 7.31935C6.80561 7.31935 5.83731 8.28765 5.83731 9.48204C5.83731 10.6764 6.80561 11.6447 8 11.6447ZM12.13 5.62602C12.13 6.07786 11.7628 6.44508 11.3109 6.44508C10.8591 6.44508 10.4919 6.07786 10.4919 5.62602C10.4919 5.17417 10.8591 4.80696 11.3109 4.80696C11.7628 4.80696 12.13 5.17417 12.13 5.62602Z" fill="#4B5563"/></svg>';
        default:
            return '';
    }
}

// Update profile cards when tags change
function updateProfileCards() {
    renderProfileCards();
}

// Initialize profile cards
renderProfileCards();

// Класс для работы с API сервера
class ApiClient {
    // Метод для входа в систему
    async login(telegramUsername, password) {
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    telegram_username: telegramUsername,
                    password: password
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Ошибка при входе в систему');
            }

            return data;
        } catch (error) {
            console.error('Ошибка при входе:', error);
            throw error;
        }
    }

    // Метод для создания запроса на подтверждение
    async createConfirmationRequest(telegramUsername) {
        try {
            const response = await fetch('/create_confirmation_request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    telegram_username: telegramUsername
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка при создании запроса на подтверждение');
            }

            return await response.json();
        } catch (error) {
            console.error('Ошибка при создании запроса:', error);
            throw error;
        }
    }

    // Метод для проверки статуса подтверждения
    async checkConfirmationStatus(telegramUsername) {
        try {
            const response = await fetch('/check_confirmation_status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    telegram_username: telegramUsername
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка при проверке статуса подтверждения');
            }

            return await response.json();
        } catch (error) {
            console.error('Ошибка при проверке статуса:', error);
            throw error;
        }
    }

    // Метод для создания пользователя
    async createUser(telegramUsername, password) {
        try {
            const response = await fetch('/create_user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    telegram_username: telegramUsername,
                    password: password
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка при создании пользователя');
            }

            return await response.json();
        } catch (error) {
            console.error('Ошибка при создании пользователя:', error);
            throw error;
        }
    }
    
    // Метод для получения профиля пользователя
    async getUserProfile(userId) {
        try {
            const response = await fetch('/get_user_profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Ошибка при получении профиля пользователя');
            }

            return data;
        } catch (error) {
            console.error('Ошибка при получении профиля:', error);
            throw error;
        }
    }
    
    // Метод для обновления профиля пользователя
    async updateUserProfile(userId, profileData) {
        try {
            const response = await fetch('/update_user_profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId,
                    name: profileData.name,
                    about: profileData.about,
                    who: profileData.who
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Ошибка при обновлении профиля пользователя');
            }

            return data;
        } catch (error) {
            console.error('Ошибка при обновлении профиля:', error);
            throw error;
        }
    }
}

// Создаем экземпляр API клиента
const apiClient = new ApiClient();

// Управление регистрацией
const registration = {
    currentStep: 1,
    data: {
        telegramUsername: '',
        password: ''
    },
    statusCheckInterval: null,

    // Инициализация процесса регистрации
    init() {
        // Обработчик для иконки профиля
        const profileIcon = document.getElementById('profileIcon');
        const registerModal = document.getElementById('registerModal');
        
        if (profileIcon && registerModal) {
            profileIcon.addEventListener('click', () => {
                registerModal.style.display = 'block';
                // По умолчанию показываем форму входа
                this.showLoginForm();
            });
        }

        // Закрытие модального окна
        const closeButtons = document.querySelectorAll('.close-btn[data-modal="registerModal"]');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                registerModal.style.display = 'none';
                // Останавливаем опрос статуса
                if (this.statusCheckInterval) {
                    clearInterval(this.statusCheckInterval);
                    this.statusCheckInterval = null;
                }
            });
        });

        // Обработчики для вкладок входа и регистрации
        document.getElementById('loginTab').addEventListener('click', () => this.showLoginForm());
        document.getElementById('registerTab').addEventListener('click', () => this.showRegisterForm());
        
        // Обработчик для кнопки входа
        document.getElementById('loginButton').addEventListener('click', () => this.processLogin());

        // Обработчики для кнопок шагов регистрации
        document.getElementById('nextStep1').addEventListener('click', () => this.processStep1());
        document.getElementById('prevStep2').addEventListener('click', () => this.showStep(1));
        document.getElementById('prevStep3').addEventListener('click', () => this.showStep(2));
        document.getElementById('completeRegistration').addEventListener('click', () => this.completeRegistration());
        document.getElementById('closeRegistration').addEventListener('click', () => {
            registerModal.style.display = 'none';
            if (this.statusCheckInterval) {
                clearInterval(this.statusCheckInterval);
                this.statusCheckInterval = null;
            }
        });

        // Клик вне модального окна
        window.addEventListener('click', (event) => {
            if (event.target === registerModal) {
                registerModal.style.display = 'none';
                if (this.statusCheckInterval) {
                    clearInterval(this.statusCheckInterval);
                    this.statusCheckInterval = null;
                }
            }
        });
    },
    
    // Показать форму входа
    showLoginForm() {
        // Активируем вкладку входа
        document.getElementById('loginTab').classList.add('active');
        document.getElementById('registerTab').classList.remove('active');
        
        // Показываем форму входа, скрываем форму регистрации
        document.getElementById('loginForm').classList.add('active');
        document.getElementById('registrationForm').classList.remove('active');
    },
    
    // Показать форму регистрации
    showRegisterForm() {
        // Активируем вкладку регистрации
        document.getElementById('loginTab').classList.remove('active');
        document.getElementById('registerTab').classList.add('active');
        
        // Показываем форму регистрации, скрываем форму входа
        document.getElementById('loginForm').classList.remove('active');
        document.getElementById('registrationForm').classList.add('active');
        
        // Показываем первый шаг регистрации
        this.showStep(1);
    },
    
    // Обработка входа в систему
    async processLogin() {
        const telegramInput = document.getElementById('loginTelegram');
        const passwordInput = document.getElementById('loginPassword');
        
        const telegramUsername = telegramInput.value.trim();
        const password = passwordInput.value;
        
        if (!telegramUsername) {
            this.showError(telegramInput, 'Введите имя пользователя в Telegram');
            return;
        }
        
        if (!password) {
            this.showError(passwordInput, 'Введите пароль');
            return;
        }
        
        try {
            // Показываем индикатор загрузки
            this.showLoading(true);
            
            // Отправляем запрос на вход через API
            const result = await apiClient.login(telegramUsername, password);
            
            // Скрываем индикатор загрузки
            this.showLoading(false);
            
            if (result.status === 'success') {
                // Получаем профиль пользователя
                const profileData = await apiClient.getUserProfile(result.user.id);
                
                // Сохраняем информацию о пользователе в localStorage
                localStorage.setItem('user', JSON.stringify({
                    id: result.user.id,
                    telegram_username: result.user.telegram_username,
                    name: profileData.user.name || '',
                    about: profileData.user.about || '',
                    who: profileData.user.who || '',
                    isLoggedIn: true
                }));
                
                // Закрываем модальное окно
                document.getElementById('registerModal').style.display = 'none';
                
                // Обновляем обработчики иконки профиля
                updateProfileIconHandler();
                
                // Показываем сообщение об успешном входе
                alert('Вы успешно вошли в систему!');
            } else {
                throw new Error(result.message || 'Ошибка при входе');
            }
        } catch (error) {
            this.showLoading(false);
            this.showError(passwordInput, error.message || 'Неверное имя пользователя или пароль');
        }
    },

    // Показать определенный шаг регистрации
    showStep(stepNumber) {
        const steps = document.querySelectorAll('.registration-step');
        steps.forEach(step => {
            step.classList.remove('active');
        });
        
        document.getElementById(`step${stepNumber}`).classList.add('active');
        this.currentStep = stepNumber;
    },

    // Обработка шага 1
    async processStep1() {
        const telegramInput = document.getElementById('telegramUsername');
        const telegramUsername = telegramInput.value.trim();
        
        if (!telegramUsername) {
            this.showError(telegramInput, 'Укажите имя пользователя в Telegram');
            return;
        }
        
        try {
            // Запускаем индикатор загрузки
            this.showLoading(true);
            
            // Создаем запрос на подтверждение
            await apiClient.createConfirmationRequest(telegramUsername);
            
            // Сохраняем имя пользователя
            this.data.telegramUsername = telegramUsername;
            
            // Обновляем текст в шаге 2
            const botInstructions = document.querySelector('.bot-instructions');
            if (botInstructions) {
                botInstructions.innerHTML = `
                    <p>Мы отправили запрос на подтверждение регистрации.</p>
                    <ol>
                        <li>Перейдите в Telegram и найдите бота <a href="https://t.me/TREOSCOMPANY_bot" target="_blank">@TREOSCOMPANY_bot</a></li>
                        <li>Отправьте боту ваш ник: <strong>${telegramUsername}</strong></li>
                        <li>Подтвердите запрос на регистрацию, нажав на кнопку "Принять"</li>
                    </ol>
                    <p>После подтверждения эта страница автоматически перейдет к следующему шагу.</p>
                `;
            }
            
            // Скрываем индикатор загрузки
            this.showLoading(false);
            
            // Переходим к шагу 2
            this.showStep(2);
            
            // Запускаем периодическую проверку статуса подтверждения
            this.startStatusCheck(telegramUsername);
            
        } catch (error) {
            this.showLoading(false);
            this.showError(telegramInput, error.message || 'Ошибка при создании запроса на подтверждение');
        }
    },

    // Начать периодическую проверку статуса подтверждения
    startStatusCheck(telegramUsername) {
        // Остановим предыдущий интервал, если он был
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
        }
        
        // Запускаем проверку статуса каждые 2 секунды
        this.statusCheckInterval = setInterval(async () => {
            try {
                const response = await apiClient.checkConfirmationStatus(telegramUsername);
                
                // Если статус "принято", переходим к шагу 3
                if (response.confirmation_status === 'accepted') {
                    clearInterval(this.statusCheckInterval);
                    this.statusCheckInterval = null;
                    
                    // Переходим к шагу 3
                    this.showStep(3);
                }
                // Если статус "отклонено", показываем ошибку
                else if (response.confirmation_status === 'rejected') {
                    clearInterval(this.statusCheckInterval);
                    this.statusCheckInterval = null;
                    
                    const telegramInput = document.getElementById('telegramUsername');
                    this.showError(telegramInput, 'Запрос на регистрацию был отклонен.');
                    
                    // Возвращаемся к шагу 1
                    this.showStep(1);
                }
                // Иначе продолжаем проверку
            } catch (error) {
                console.error('Ошибка при проверке статуса:', error);
                // Не останавливаем проверку при ошибках
            }
        }, 2000);
    },

    // Показать/скрыть индикатор загрузки
    showLoading(show) {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = show ? 'block' : 'none';
        }
    },

    // Завершение регистрации
    async completeRegistration() {
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (password.length < 8) {
            this.showError(passwordInput, 'Пароль должен быть не менее 8 символов');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showError(confirmPasswordInput, 'Пароли не совпадают');
            return;
        }
        
        try {
            // Показываем индикатор загрузки
            this.showLoading(true);
            
            // Создаем пользователя через API
            const result = await apiClient.createUser(this.data.telegramUsername, password);
            
            if (result.status === 'success') {
                // Установим базовые данные для профиля (пустые значения)
                await apiClient.updateUserProfile(result.user.id, {
                    name: '',
                    about: '',
                    who: 'student' // По умолчанию устанавливаем статус "студент"
                });
                
                // Сохраняем информацию о пользователе в localStorage
                localStorage.setItem('user', JSON.stringify({
                    id: result.user.id,
                    telegram_username: this.data.telegramUsername,
                    name: '',
                    about: '',
                    who: 'student',
                    isLoggedIn: true
                }));
                
                // Обновляем обработчики иконки профиля
                updateProfileIconHandler();
                
                // Переходим к шагу 4 (успешная регистрация)
                this.showStep(4);
            } else {
                throw new Error(result.message || 'Ошибка при создании пользователя');
            }
        } catch (error) {
            this.showError(passwordInput, error.message || 'Ошибка при регистрации');
        } finally {
            // Скрываем индикатор загрузки
            this.showLoading(false);
        }
    },

    // Показать ошибку для поля ввода
    showError(inputElement, message) {
        // Добавляем класс ошибки к полю
        inputElement.classList.add('error-input');
        
        // Создаем или обновляем сообщение об ошибке
        let errorElement = inputElement.nextElementSibling;
        if (!errorElement || !errorElement.classList.contains('error-message')) {
            errorElement = document.createElement('p');
            errorElement.className = 'error-message';
            inputElement.parentNode.insertBefore(errorElement, inputElement.nextSibling);
        }
        
        errorElement.textContent = message;
        
        // Убираем ошибку при вводе
        inputElement.addEventListener('input', function() {
            this.classList.remove('error-input');
            if (errorElement) {
                errorElement.textContent = '';
            }
        }, { once: true });
    }
};

// Создадим функцию для инициализации бота
async function createTelegramBot() {
    const botName = 'TREOSCOMPANY_bot';
    
    console.log(`Бот @${botName} настроен`);
    console.log('В реальном проекте бот должен быть настроен на серверной стороне');
}

// Вызываем инициализацию регистрации после загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, авторизован ли пользователь и обновляем обработчики иконки профиля
    updateProfileIconHandler();

    // Инициализируем процесс регистрации
    registration.init();
    
    // Создаем бота (имитация)
    createTelegramBot();
    
    // Обработчики профиля
    initProfileHandlers();
});

// Функция для открытия модального окна логина/регистрации
function showLoginModal() {
    document.getElementById('registerModal').style.display = 'block';
    // По умолчанию показываем форму входа
    registration.showLoginForm();
}

// Функция для открытия модального окна профиля
async function showProfileModal() {
    // Проверяем, авторизован ли пользователь
    const userData = localStorage.getItem('user');
    
    if (!userData) {
        // Если пользователь не авторизован, показываем окно входа
        showLoginModal();
        return;
    }
    
    // Парсим данные пользователя
    const user = JSON.parse(userData);
    
    if (!user || !user.isLoggedIn) {
        // Если пользователь не авторизован, показываем окно входа
        showLoginModal();
        return;
    }
    
    // Если пользователь авторизован, показываем профиль
    const profileModal = document.getElementById('profileModal');
    profileModal.style.display = 'block';
    
    if (user.id) {
        // Показываем индикатор загрузки
        const loadingElement = document.getElementById('loading');
        if (loadingElement) loadingElement.style.display = 'block';
        
        try {
            // Получаем данные профиля с сервера
            const profileData = await apiClient.getUserProfile(user.id);
            
            // Заполняем поля формы
            document.getElementById('profileName').value = profileData.user.name || '';
            document.getElementById('profileAbout').value = profileData.user.about || '';
            
            // Устанавливаем радиокнопку
            const who = profileData.user.who || '';
            const radioButtons = document.querySelectorAll('input[name="profileWho"]');
            radioButtons.forEach(radio => {
                if (radio.value === who) {
                    radio.checked = true;
                }
            });
        } catch (error) {
            console.error('Ошибка при загрузке профиля:', error);
        } finally {
            // Скрываем индикатор загрузки
            if (loadingElement) loadingElement.style.display = 'none';
        }
    }
}

// Инициализация обработчиков для модального окна профиля
function initProfileHandlers() {
    // Закрытие модального окна профиля
    const closeProfileBtn = document.querySelector('.close-btn[data-modal="profileModal"]');
    if (closeProfileBtn) {
        closeProfileBtn.addEventListener('click', () => {
            document.getElementById('profileModal').style.display = 'none';
        });
    }
    
    // Клик вне модального окна профиля
    window.addEventListener('click', (event) => {
        const profileModal = document.getElementById('profileModal');
        if (event.target === profileModal) {
            profileModal.style.display = 'none';
        }
    });
    
    // Сохранение профиля
    const saveProfileBtn = document.getElementById('saveProfileButton');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', saveUserProfile);
    }
    
    // Выход из системы
    const logoutBtn = document.getElementById('logoutButton');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Назначаем обработчики на иконку профиля в зависимости от состояния авторизации
    updateProfileIconHandler();
}

// Обновление обработчика иконки профиля
function updateProfileIconHandler() {
    const profileIcon = document.getElementById('profileIcon');
    if (!profileIcon) return;
    
    // Удаляем существующие обработчики
    profileIcon.removeEventListener('click', showLoginModal);
    profileIcon.removeEventListener('click', showProfileModal);
    
    // Проверяем статус авторизации
    const userData = localStorage.getItem('user');
    let isLoggedIn = false;
    
    if (userData) {
        try {
            const user = JSON.parse(userData);
            isLoggedIn = user && user.isLoggedIn;
            
            if (isLoggedIn) {
                // Если пользователь авторизован, добавляем класс logged-in
                profileIcon.classList.add('logged-in');
            } else {
                // Если пользователь не авторизован, удаляем класс logged-in
                profileIcon.classList.remove('logged-in');
            }
        } catch (e) {
            console.error('Ошибка при проверке авторизации:', e);
            localStorage.removeItem('user');
        }
    } else {
        // Если данных пользователя нет, удаляем класс logged-in
        profileIcon.classList.remove('logged-in');
    }
    
    // Назначаем соответствующий обработчик
    if (isLoggedIn) {
        profileIcon.addEventListener('click', showProfileModal);
    } else {
        profileIcon.addEventListener('click', showLoginModal);
    }
}

// Сохранение профиля пользователя
async function saveUserProfile() {
    // Получаем данные пользователя из хранилища
    const userData = JSON.parse(localStorage.getItem('user'));
    
    if (!userData || !userData.id) {
        alert('Необходимо войти в систему для сохранения профиля.');
        return;
    }
    
    // Получаем значения полей
    const name = document.getElementById('profileName').value;
    const about = document.getElementById('profileAbout').value;
    let who = '';
    
    // Получаем выбранное значение радиокнопки
    const radioButtons = document.querySelectorAll('input[name="profileWho"]');
    radioButtons.forEach(radio => {
        if (radio.checked) {
            who = radio.value;
        }
    });
    
    // Показываем индикатор загрузки
    const loadingElement = document.getElementById('loading');
    if (loadingElement) loadingElement.style.display = 'block';
    
    try {
        // Отправляем данные на сервер
        const result = await apiClient.updateUserProfile(userData.id, {
            name: name,
            about: about,
            who: who
        });
        
        if (result.status === 'success') {
            alert('Профиль успешно обновлен!');
            
            // Обновляем данные в хранилище
            userData.name = name;
            userData.about = about;
            userData.who = who;
            localStorage.setItem('user', JSON.stringify(userData));
            
            // Закрываем модальное окно
            document.getElementById('profileModal').style.display = 'none';
        } else {
            throw new Error(result.message || 'Ошибка при обновлении профиля');
        }
    } catch (error) {
        console.error('Ошибка при сохранении профиля:', error);
        alert('Произошла ошибка при сохранении профиля. Пожалуйста, попробуйте еще раз.');
    } finally {
        // Скрываем индикатор загрузки
        if (loadingElement) loadingElement.style.display = 'none';
    }
}

// Выход из системы
function logout() {
    // Удаляем данные пользователя из хранилища
    localStorage.removeItem('user');
    
    // Обновляем обработчики иконки профиля
    updateProfileIconHandler();
    
    // Закрываем модальное окно профиля
    document.getElementById('profileModal').style.display = 'none';
    
    alert('Вы вышли из системы');
} 