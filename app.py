"""
Main Flask application
"""

from flask import Flask, request, jsonify, render_template, send_from_directory
import os
from openai import OpenAI

app = Flask(__name__)

client = OpenAI(api_key="sk-4343a8699fd7460d98903b12836a4627", base_url="https://api.deepseek.com")

# Иерархический словарь тегов
tags_hierarchy = {
    "Образование": {
        "Наука": ["Астрономия", "Биология", "Химия", "Физика", "Математика", "Психология", "Медицина", "Нейробиология", "Генетика", "Экология", "Квантовая механика", "Космос"],
        "Программирование": ["Python", "JavaScript", "Java", "C++", "Web-разработка", "Мобильная разработка", "Базы данных", "Алгоритмы", "Машинное обучение"],
        "Языки": ["Английский", "Испанский", "Французский", "Немецкий", "Китайский", "Японский", "Корейский"],
        "Гуманитарные науки": ["История", "Философия", "Литература", "Искусствоведение", "Культурология", "Социология"]
    },
    "Развлечения": {
        "Искусство": ["Живопись", "Фотография", "Скульптура", "Архитектура", "Рисование", "Графика", "Театр", "Кино", "Анимация", "Стрит-арт"],
        "Музыка": ["Рок", "Поп", "Классическая", "Джаз", "Электронная", "Хип-хоп", "Металл", "Инди", "Фолк", "Блюз", "R&B", "Кантри"],
        "Игры": ["Настольные игры", "Видеоигры", "Карточные игры", "Головоломки", "Стратегии", "Ролевые игры"],
        "Медиа": ["Кино", "Сериалы", "Аниме", "Комиксы", "Подкасты", "Блоги", "Стриминг"]
    },
    "Спорт и Активный отдых": {
        "Спорт": ["Футбол", "Баскетбол", "Теннис", "Плавание", "Йога", "Бег", "Фитнес", "Велоспорт", "Боевые искусства", "Лыжи", "Сноуборд"],
        "Активный отдых": ["Туризм", "Кемпинг", "Альпинизм", "Рыбалка", "Охота", "Серфинг", "Дайвинг", "Парапланеризм"],
        "Экстремальные виды": ["Скейтбординг", "BMX", "Паркур", "Скалолазание", "Рафтинг", "Бейсджампинг"]
    },
    "Технологии": {
        "IT": ["Программирование", "Искусственный интеллект", "Веб-разработка", "Мобильные приложения", "Кибербезопасность", "Блокчейн"],
        "Гаджеты": ["Смартфоны", "Ноутбуки", "Планшеты", "Умные часы", "VR/AR устройства", "Дроны"],
        "Инновации": ["Робототехника", "Виртуальная реальность", "Дополненная реальность", "IoT", "3D печать", "Биотехнологии"]
    },
    "Образ жизни": {
        "Здоровье": ["Фитнес", "Питание", "Медитация", "Йога", "Психология", "Здоровый сон"],
        "Мода": ["Одежда", "Аксессуары", "Красота", "Косметика", "Стиль", "Модные тренды"],
        "Дом": ["Интерьер", "Садоводство", "Ремонт", "DIY", "Организация пространства", "Декор"]
    },
    "Кулинария": {
        "Кухни мира": ["Итальянская", "Японская", "Мексиканская", "Индийская", "Французская", "Китайская"],
        "Типы блюд": ["Выпечка", "Десерты", "Супы", "Салаты", "Горячие блюда", "Закуски"],
        "Специальное питание": ["Вегетарианство", "Веганство", "Безглютеновое", "Кето", "Палео", "Сыроедение"]
    }
}

# Функция для определения основной категории по запросу
def determine_main_category(user_input):
    prompt = f"""
    Определи, к какой основной категории относится следующий запрос. Категории: {', '.join(tags_hierarchy.keys())}
    Верни только название категории, ничего лишнего.
    Запрос: {user_input}
    """
    
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": "Ты помощник, который определяет основную категорию запроса."},
            {"role": "user", "content": prompt}
        ],
        stream=False
    )
    
    return response.choices[0].message.content.strip()

def extract_tags_with_ai(user_input, force_category=None):
    # Определяем основную категорию
    if force_category and force_category in tags_hierarchy:
        main_category = force_category
    else:
        main_category = determine_main_category(user_input)
    
    if main_category not in tags_hierarchy:
        return "Ошибка определения категории"
    
    # Получаем все теги из выбранной категории
    category_tags = []
    for subcategory in tags_hierarchy[main_category].values():
        category_tags.extend(subcategory)
    
    prompt = f"""
    Извлеки теги из следующего запроса, основываясь на контексте и смысле. Теги должны быть только из этого списка: {', '.join(category_tags)}.
    Возвращай только теги через запятую, ничего лишнего. Если подходящих тегов нет, верни самое близкое. Старайся всегда 
    выводить больше тегов, подходящих запросу
    Запрос: {user_input}
    """

    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": "Ты помощник, который извлекает теги из текста, основываясь на контексте."},
            {"role": "user", "content": prompt}
        ],
        stream=False
    )

    return response.choices[0].message.content

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('templates', filename)

@app.route('/get_tags', methods=['GET'])
def get_tags():
    return jsonify({'tags_hierarchy': tags_hierarchy})

@app.route('/extract_tags', methods=['POST'])
def extract_tags():
    data = request.get_json()
    user_input = data.get('user_input', '')
    force_category = data.get('force_category')
    
    if not user_input:
        return jsonify({'error': 'Пустой запрос'}), 400
    
    try:
        tags = extract_tags_with_ai(user_input, force_category)
        return jsonify({
            'tags': tags,
            'main_category': force_category if force_category else determine_main_category(user_input)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)