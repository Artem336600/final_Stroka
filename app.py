"""
Main Flask application
"""

from flask import Flask, request, jsonify, render_template, send_from_directory
import os
from openai import OpenAI
import requests
import json
import asyncio
from aiogram import Bot
import datetime

# Импортируем функции из модуля telegram_bot
try:
    from telegram_bot import create_confirmation_request, check_confirmation_status
except ImportError:
    # Для случаев, когда бот запускается отдельно
    create_confirmation_request = None
    check_confirmation_status = None

app = Flask(__name__)

client = OpenAI(api_key="sk-4343a8699fd7460d98903b12836a4627", base_url="https://api.deepseek.com")

# Константы для Telegram бота и Supabase
TELEGRAM_BOT_TOKEN = "7574510217:AAGYVNk4uqTxJ7HF7Z5XCkSqX59SOfJPjKU"
SUPABASE_URL = "https://ddfjcrfioaymllejalpm.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkZmpjcmZpb2F5bWxsZWphbHBtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjQ3ODYzOSwiZXhwIjoyMDU4MDU0NjM5fQ.Dh42k1K07grKhF3DntbNLSwUifaXAa0Q6-LEIzRgpWM"

# Инициализация бота
bot = Bot(token=TELEGRAM_BOT_TOKEN)

# Словарь для хранения запросов на подтверждение
# Будем хранить здесь запросы, если бот запускается в отдельном процессе
confirmation_requests = {}

# Функции для работы с таблицей ConfirmationRequests в Supabase
def get_supabase_headers():
    """Возвращает заголовки для запросов к Supabase"""
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }

def create_confirmation_request_in_supabase(telegram_username):
    """Создает запрос на подтверждение в Supabase"""
    headers = get_supabase_headers()
    
    # Генерируем уникальный ID запроса
    request_id = f"req_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{telegram_username.replace('@', '')}"
    
    # Данные для запроса
    request_data = {
        'id': request_id,
        'telegram_username': telegram_username,
        'status': 'pending',
        'created_at': datetime.datetime.now().isoformat(),
        'updated_at': datetime.datetime.now().isoformat(),
        'telegram_user_id': None
    }
    
    try:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/ConfirmationRequests",
            headers=headers,
            json=request_data
        )
        
        if response.status_code in (200, 201):
            return {
                'status': 'success',
                'request_id': request_id,
                'data': response.json()
            }
        
        return {
            'status': 'error',
            'message': 'Ошибка при создании запроса в Supabase',
            'details': response.json()
        }
    except Exception as e:
        return {
            'status': 'error', 
            'message': f'Ошибка при создании запроса: {str(e)}'
        }

def check_confirmation_request_in_supabase(telegram_username):
    """Проверяет статус запроса на подтверждение в Supabase"""
    headers = get_supabase_headers()
    
    try:
        # URL-кодируем имя пользователя для использования в запросе
        encoded_username = requests.utils.quote(telegram_username)
        
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/ConfirmationRequests?telegram_username=eq.{encoded_username}&order=created_at.desc.nullslast&limit=1",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                return {
                    'status': 'success',
                    'confirmation_status': data[0]['status'],
                    'request': data[0]
                }
            
            return {
                'status': 'error',
                'message': 'Запрос на подтверждение не найден'
            }
        
        return {
            'status': 'error',
            'message': 'Ошибка при проверке запроса в Supabase',
            'details': response.json()
        }
    except Exception as e:
        return {
            'status': 'error',
            'message': f'Ошибка при проверке запроса: {str(e)}'
        }

def update_confirmation_request_in_supabase(request_id, status, telegram_user_id=None):
    """Обновляет статус запроса на подтверждение в Supabase"""
    headers = get_supabase_headers()
    
    update_data = {
        'status': status,
        'updated_at': datetime.datetime.now().isoformat()
    }
    
    if telegram_user_id:
        update_data['telegram_user_id'] = telegram_user_id
    
    try:
        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/ConfirmationRequests?id=eq.{request_id}",
            headers=headers,
            json=update_data
        )
        
        if response.status_code in (200, 204):
            return {
                'status': 'success',
                'message': f'Статус запроса {request_id} обновлен на {status}'
            }
        
        return {
            'status': 'error',
            'message': 'Ошибка при обновлении запроса в Supabase',
            'details': response.json() if response.text else {}
        }
    except Exception as e:
        return {
            'status': 'error',
            'message': f'Ошибка при обновлении запроса: {str(e)}'
        }

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

# Вспомогательная функция для отправки сообщений через aiogram
async def send_telegram_message(chat_id, text, reply_markup=None):
    """Отправляет сообщение через бота aiogram"""
    await bot.send_message(chat_id=chat_id, text=text, parse_mode="HTML", reply_markup=reply_markup)

# Маршрут для настройки вебхука для Telegram бота
@app.route('/setup_telegram_webhook', methods=['GET'])
def setup_telegram_webhook():
    """Настраивает вебхук для Telegram бота (в реальном проекте)"""
    # В реальном проекте здесь должен быть публичный URL вашего сервера
    webhook_url = "https://your-domain.com/telegram_webhook"
    
    try:
        # Для настройки вебхука в aiogram v3 используем другой подход
        async def set_webhook():
            await bot.set_webhook(url=webhook_url)
            
        asyncio.run(set_webhook())
        
        return jsonify({
            "status": "success",
            "message": "Вебхук для бота успешно настроен"
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "Ошибка настройки вебхука",
            "details": str(e)
        }), 500

# Маршрут для создания запроса на подтверждение
@app.route('/create_confirmation_request', methods=['POST'])
def create_request():
    """
    Создает запрос на подтверждение для пользователя Telegram.
    """
    data = request.get_json()
    telegram_username = data.get('telegram_username')
    
    if not telegram_username:
        return jsonify({'error': 'Не указано имя пользователя Telegram'}), 400
    
    # Проверяем, начинается ли имя пользователя с @
    if not telegram_username.startswith('@'):
        telegram_username = '@' + telegram_username
    
    # Создаем запрос в Supabase
    result = create_confirmation_request_in_supabase(telegram_username)
    
    if result['status'] == 'error':
        return jsonify(result), 500
    
    # Создаем запрос в боте если он запущен в том же процессе
    if create_confirmation_request:
        try:
            # Запускаем асинхронную функцию
            bot_result = asyncio.run(create_confirmation_request(telegram_username))
            
            return jsonify({
                'status': 'success',
                'message': f'Запрос на подтверждение создан для {telegram_username}',
                'request_created': True,
                'request_id': result['request_id'],
                'bot_notified': bot_result
            })
        except Exception as e:
            # Даже если бот не смог обработать запрос, запрос уже создан в Supabase
            return jsonify({
                'status': 'success',
                'message': f'Запрос на подтверждение создан для {telegram_username}, но бот не был уведомлен',
                'request_created': True,
                'request_id': result['request_id'],
                'bot_error': str(e)
            })
    else:
        # Если бот запущен отдельно, он сам должен будет проверить запрос в Supabase
        return jsonify({
            'status': 'success',
            'message': f'Запрос на подтверждение создан для {telegram_username} в Supabase',
            'request_created': True,
            'request_id': result['request_id']
        })

# Маршрут для проверки статуса подтверждения
@app.route('/check_confirmation_status', methods=['POST'])
def check_status():
    """Проверяет статус запроса на подтверждение"""
    data = request.get_json()
    telegram_username = data.get('telegram_username')
    
    if not telegram_username:
        return jsonify({'error': 'Не указано имя пользователя Telegram'}), 400
    
    # Проверяем, начинается ли имя пользователя с @
    if not telegram_username.startswith('@'):
        telegram_username = '@' + telegram_username
    
    # Проверяем статус в Supabase
    result = check_confirmation_request_in_supabase(telegram_username)
    
    if result['status'] == 'success':
        return jsonify({
            'status': 'success',
            'confirmation_status': result['confirmation_status'],
            'request': result.get('request', {})
        })
    
    # Если в Supabase не найдено, проверяем в боте если он запущен в том же процессе
    if check_confirmation_status:
        try:
            # Запускаем асинхронную функцию
            status = asyncio.run(check_confirmation_status(telegram_username))
            
            if status is None:
                return jsonify({
                    'status': 'error',
                    'message': 'Запрос на подтверждение не найден'
                }), 404
                
            return jsonify({
                'status': 'success',
                'confirmation_status': status
            })
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': 'Ошибка при проверке статуса',
                'details': str(e)
            }), 500
    else:
        # Если и в Supabase и в локальном хранилище не найдено
        return jsonify({
            'status': 'error',
            'message': 'Запрос на подтверждение не найден'
        }), 404

# Маршрут для создания пользователя в Supabase
@app.route('/create_user', methods=['POST'])
def create_user():
    """Создает пользователя в Supabase"""
    data = request.get_json()
    telegram_username = data.get('telegram_username')
    password = data.get('password')
    
    if not telegram_username or not password:
        return jsonify({'error': 'Отсутствуют обязательные параметры'}), 400
    
    # Отправляем запрос в Supabase
    headers = get_supabase_headers()
    
    user_data = {
        'tg': telegram_username,
        'password': password
    }
    
    try:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/Users",
            headers=headers,
            json=user_data
        )
        
        if response.status_code in (200, 201):
            return jsonify({
                'status': 'success',
                'message': 'Пользователь успешно создан',
                'user': response.json()
            })
        
        return jsonify({
            'status': 'error',
            'message': 'Ошибка при создании пользователя',
            'details': response.json()
        }), response.status_code
    
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'Произошла ошибка',
            'details': str(e)
        }), 500

# Маршрут для обновления статуса запроса на подтверждение (используется ботом)
@app.route('/update_confirmation_status', methods=['POST'])
def update_confirmation_status():
    """Обновляет статус запроса на подтверждение"""
    data = request.get_json()
    request_id = data.get('request_id')
    status = data.get('status')
    telegram_user_id = data.get('telegram_user_id')
    
    if not request_id or not status:
        return jsonify({'error': 'Отсутствуют обязательные параметры'}), 400
    
    if status not in ('pending', 'accepted', 'rejected'):
        return jsonify({'error': 'Недопустимый статус. Допустимые значения: pending, accepted, rejected'}), 400
    
    result = update_confirmation_request_in_supabase(request_id, status, telegram_user_id)
    
    if result['status'] == 'success':
        return jsonify(result)
    
    return jsonify(result), 500

@app.route('/login', methods=['POST'])
def login():
    """Проверяет учетные данные пользователя и осуществляет вход"""
    data = request.get_json()
    telegram_username = data.get('telegram_username')
    password = data.get('password')
    
    if not telegram_username or not password:
        return jsonify({'error': 'Отсутствуют обязательные параметры'}), 400
    
    # Проверяем, начинается ли имя пользователя с @
    if not telegram_username.startswith('@'):
        telegram_username = '@' + telegram_username
    
    # Отправляем запрос в Supabase для проверки учетных данных
    headers = get_supabase_headers()
    
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/Users?tg=eq.{requests.utils.quote(telegram_username)}",
            headers=headers
        )
        
        if response.status_code == 200:
            users = response.json()
            if users and len(users) > 0:
                user = users[0]
                # Проверяем пароль (в реальном приложении пароль должен быть захеширован)
                if user['password'] == password:
                    return jsonify({
                        'status': 'success',
                        'message': 'Вход выполнен успешно',
                        'user': {
                            'id': user['id'],
                            'telegram_username': user['tg']
                        }
                    })
                else:
                    return jsonify({
                        'status': 'error',
                        'message': 'Неверное имя пользователя или пароль'
                    }), 401
            else:
                return jsonify({
                    'status': 'error',
                    'message': 'Пользователь не найден'
                }), 404
        
        return jsonify({
            'status': 'error',
            'message': 'Ошибка при проверке учетных данных',
            'details': response.json() if response.text else {}
        }), 500
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Ошибка при входе: {str(e)}'
        }), 500

@app.route('/get_user_profile', methods=['POST'])
def get_user_profile():
    """Получает профиль пользователя из Supabase"""
    data = request.get_json()
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'Не указан ID пользователя'}), 400
    
    # Отправляем запрос в Supabase
    headers = get_supabase_headers()
    
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/Users?id=eq.{user_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            users = response.json()
            if users and len(users) > 0:
                user = users[0]
                return jsonify({
                    'status': 'success',
                    'user': {
                        'id': user['id'],
                        'telegram_username': user['tg'],
                        'name': user.get('name', ''),
                        'about': user.get('about', ''),
                        'who': user.get('who', '')
                    }
                })
            else:
                return jsonify({
                    'status': 'error',
                    'message': 'Пользователь не найден'
                }), 404
        
        return jsonify({
            'status': 'error',
            'message': 'Ошибка при получении профиля пользователя',
            'details': response.json() if response.text else {}
        }), 500
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Ошибка при получении профиля: {str(e)}'
        }), 500

@app.route('/update_user_profile', methods=['POST'])
def update_user_profile():
    """Обновляет профиль пользователя в Supabase"""
    data = request.get_json()
    user_id = data.get('user_id')
    name = data.get('name')
    about = data.get('about')
    who = data.get('who')
    
    if not user_id:
        return jsonify({'error': 'Не указан ID пользователя'}), 400
    
    # Отправляем запрос в Supabase
    headers = get_supabase_headers()
    
    update_data = {}
    if name is not None:
        update_data['name'] = name
    if about is not None:
        update_data['about'] = about
    if who is not None:
        update_data['who'] = who
    
    try:
        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/Users?id=eq.{user_id}",
            headers=headers,
            json=update_data
        )
        
        if response.status_code in (200, 204):
            return jsonify({
                'status': 'success',
                'message': 'Профиль пользователя успешно обновлен'
            })
        
        return jsonify({
            'status': 'error',
            'message': 'Ошибка при обновлении профиля пользователя',
            'details': response.json() if response.text else {}
        }), 500
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Ошибка при обновлении профиля: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(debug=True)