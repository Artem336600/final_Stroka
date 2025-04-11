let allTags = {};
let selectedTags = new Set();
let modal;

// Загружаем теги при инициализации страницы
window.addEventListener('DOMContentLoaded', async () => {
    try {
        modal = document.getElementById('tagsModal');
        const response = await fetch('/get_tags');
        if (!response.ok) {
            throw new Error('Ошибка при получении тегов');
        }
        
        const data = await response.json();
        allTags = data.tags_hierarchy;
        
        // Инициализируем модальное окно
        initModal();
    } catch (error) {
        console.error('Ошибка при загрузке тегов:', error);
    }
});

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
    const tagElements = document.querySelectorAll('.tag-pill');
    
    let visibleCategories = new Set();
    
    tagElements.forEach(element => {
        const tag = element.textContent.toLowerCase();
        if (tag.includes(searchText)) {
            element.style.display = 'inline-block';
            visibleCategories.add(element.closest('.category-tags'));
        } else {
            element.style.display = 'none';
        }
    });
    
    // Показываем/скрываем категории в зависимости от видимости тегов
    document.querySelectorAll('.category-tags').forEach(category => {
        const hasVisibleTags = Array.from(category.querySelectorAll('.tag-pill')).some(tag => tag.style.display !== 'none');
        category.style.display = hasVisibleTags ? 'block' : 'none';
    });
}

// Добавление тега
function addTag(tagName) {
    if (!selectedTags.has(tagName)) {
        selectedTags.add(tagName);
        renderTags();
    }
}

// Удаление тега
function removeTag(tagName) {
    if (selectedTags.has(tagName)) {
        selectedTags.delete(tagName);
        renderTags();
        
        // Обновляем отображение в модальном окне, если оно открыто
        const tagElement = document.querySelector(`.tag-pill[data-tag="${tagName}"]`);
        if (tagElement) {
            tagElement.classList.remove('selected');
        }
        
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
    
    if (selectedTags.size === 0) {
        tagsContainer.innerHTML = '<p class="no-tags">Нет выбранных тегов</p>';
        return;
    }
    
    selectedTags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag';
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
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const selectedCategoryDiv = document.getElementById('selectedCategory');
    const categoryText = selectedCategoryDiv.querySelector('.category-text');
    const tagsContainer = selectedCategoryDiv.querySelector('.tags-container');

    loadingDiv.style.display = 'block';
    selectedCategoryDiv.classList.remove('visible');
    tagsContainer.classList.remove('visible');
    errorDiv.style.display = 'none';

    try {
        const response = await fetch('/extract_tags', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_input: userInput })
        });

        if (!response.ok) {
            throw new Error('Ошибка при извлечении тегов');
        }

        const data = await response.json();
        loadingDiv.style.display = 'none';

        // Update category display
        const category = data.main_category.replace(/\s+/g, '_');
        selectedCategoryDiv.className = `selected-category category-${category} visible`;
        categoryText.textContent = data.main_category;
        selectedCategoryDiv.dataset.category = data.main_category;

        // Clear existing tags
        selectedTags.clear();
        renderTags();

        // Add new tags
        const tags = data.tags.split(',').map(tag => tag.trim());
        tags.forEach(tag => {
            if (tag) addTag(tag);
        });

        tagsContainer.classList.add('visible');
        
        // Обновляем профили на основе извлеченных тегов
        updateProfileCards();
    } catch (error) {
        loadingDiv.style.display = 'none';
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
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
            
            // Update category text immediately
            const newCategoryClass = category.replace(/\s+/g, '_');
            selectedCategoryDiv.className = `selected-category category-${newCategoryClass} visible`;
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
                
                resultDiv.style.display = 'block';
                
                // Обновляем профили на основе извлеченных тегов
                updateProfileCards();
            } catch (error) {
                loadingDiv.style.display = 'none';
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
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

// Tag interaction handlers
document.addEventListener('DOMContentLoaded', function() {
    const tagsContainer = document.querySelector('.tags-container');
    const tags = document.querySelector('.tags');
    const addTagBtn = document.querySelector('.add-tag-btn');
    const modal = document.getElementById('tagsModal');
    const closeBtn = document.querySelector('.close-btn');
    const tagSearch = document.getElementById('tagSearch');
    const modalCategories = document.getElementById('modalCategories');
    
    // Handle tag removal
    tags.addEventListener('click', function(e) {
        if (e.target.classList.contains('tag-remove')) {
            const tag = e.target.closest('.tag');
            tag.remove();
        }
    });
    
    // Handle add tag button
    addTagBtn.addEventListener('click', function() {
        const selectedCategory = document.getElementById('selectedCategory').dataset.category;
        if (!selectedCategory) {
            alert('Сначала извлеките теги из текста');
            return;
        }
        
        // Clear previous content
        modalCategories.innerHTML = '';
        
        // Get subcategories and their tags
        const subcategories = allTags[selectedCategory];
        
        // Create subcategory sections
        for (const [subcategory, tags] of Object.entries(subcategories)) {
            const subcategoryDiv = document.createElement('div');
            subcategoryDiv.className = 'subcategory-section';
            
            const subcategoryTitle = document.createElement('h3');
            subcategoryTitle.className = 'subcategory-title';
            subcategoryTitle.textContent = subcategory;
            subcategoryDiv.appendChild(subcategoryTitle);
            
            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'subcategory-tags';
            
            // Create tag elements for this subcategory
            tags.forEach(tag => {
                const tagElement = document.createElement('div');
                tagElement.className = 'tag-pill';
                tagElement.textContent = tag;
                tagElement.dataset.tag = tag;
                if (selectedTags.has(tag)) {
                    tagElement.classList.add('selected');
                }
                tagElement.addEventListener('click', function() {
                    toggleTag(tag, this);
                });
                tagsContainer.appendChild(tagElement);
            });
            
            subcategoryDiv.appendChild(tagsContainer);
            modalCategories.appendChild(subcategoryDiv);
        }
        
        modal.style.display = 'block';
    });
    
    // Close modal
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Search functionality
    tagSearch.addEventListener('input', function() {
        const searchText = this.value.toLowerCase();
        const tagPills = modalCategories.querySelectorAll('.tag-pill');
        
        tagPills.forEach(tag => {
            const tagText = tag.textContent.toLowerCase();
            tag.style.display = tagText.includes(searchText) ? 'inline-block' : 'none';
        });
    });
});

function showTagsModal() {
    const modal = document.getElementById('tagsModal');
    const modalCategories = document.getElementById('modalCategories');
    const searchResults = document.getElementById('searchResults');
    const tagSearch = document.getElementById('tagSearch');
    
    // Clear previous content
    modalCategories.innerHTML = '';
    searchResults.innerHTML = '';
    searchResults.style.display = 'none';
    tagSearch.value = '';
    
    // Show all available tags by category
    for (const [category, subcategories] of Object.entries(tags_hierarchy)) {
        const categorySection = document.createElement('div');
        categorySection.className = 'category-section';
        
        const categoryTitle = document.createElement('h3');
        categoryTitle.textContent = category;
        categorySection.appendChild(categoryTitle);
        
        const availableTags = document.createElement('div');
        availableTags.className = 'available-tags';
        
        // Collect all tags from subcategories
        const allTags = [];
        for (const tags of Object.values(subcategories)) {
            allTags.push(...tags);
        }
        
        // Create tag elements
        allTags.forEach(tag => {
            const tagElement = document.createElement('div');
            tagElement.className = 'available-tag';
            tagElement.textContent = tag;
            tagElement.onclick = () => toggleTagSelection(tagElement, tag);
            
            // Add category-specific styling
            const categoryClass = category.replace(/\s+/g, '_');
            tagElement.classList.add(`category-${categoryClass}`);
            
            availableTags.appendChild(tagElement);
        });
        
        categorySection.appendChild(availableTags);
        modalCategories.appendChild(categorySection);
    }
    
    // Handle search
    tagSearch.oninput = (e) => {
        const searchTerm = e.target.value.toLowerCase();
        if (searchTerm.length < 2) {
            searchResults.style.display = 'none';
            modalCategories.style.display = 'grid';
            return;
        }
        
        searchResults.innerHTML = '';
        searchResults.style.display = 'flex';
        modalCategories.style.display = 'none';
        
        // Search through all tags
        for (const [category, subcategories] of Object.entries(tags_hierarchy)) {
            for (const tags of Object.values(subcategories)) {
                tags.forEach(tag => {
                    if (tag.toLowerCase().includes(searchTerm)) {
                        const tagElement = document.createElement('div');
                        tagElement.className = 'available-tag';
                        tagElement.textContent = tag;
                        tagElement.onclick = () => toggleTagSelection(tagElement, tag);
                        
                        // Add category-specific styling
                        const categoryClass = category.replace(/\s+/g, '_');
                        tagElement.classList.add(`category-${categoryClass}`);
                        
                        searchResults.appendChild(tagElement);
                    }
                });
            }
        }
    };
    
    modal.style.display = 'block';
}

function toggleTagSelection(tagElement, tagName) {
    const isSelected = tagElement.classList.contains('selected');
    if (isSelected) {
        tagElement.classList.remove('selected');
        removeTag(tagName);
    } else {
        tagElement.classList.add('selected');
        addTag(tagName);
    }
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