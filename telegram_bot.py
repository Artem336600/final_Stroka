"""
Телеграм бот для подтверждения запросов при регистрации
Реализация с использованием aiogram 3 и Supabase
"""

import logging
import asyncio
import json
import requests
import datetime
from aiogram import Bot, Dispatcher, F
from aiogram.types import Message, CallbackQuery
from aiogram.filters import Command
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.types import InlineKeyboardButton

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Токен бота и данные для Supabase
TOKEN = "7574510217:AAGYVNk4uqTxJ7HF7Z5XCkSqX59SOfJPjKU"
SUPABASE_URL = "https://ddfjcrfioaymllejalpm.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkZmpjcmZpb2F5bWxsZWphbHBtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjQ3ODYzOSwiZXhwIjoyMDU4MDU0NjM5fQ.Dh42k1K07grKhF3DntbNLSwUifaXAa0Q6-LEIzRgpWM"
API_URL = "http://localhost:5000"  # URL Flask-приложения

# Инициализация бота и диспетчера
bot = Bot(token=TOKEN)
dp = Dispatcher()

# Словарь для хранения соответствия между ID чата и именем пользователя
chat_to_username = {}

# Функция для получения имени пользователя Telegram из профиля
def get_telegram_username(message):
    """Получает имя пользователя из профиля Telegram, если оно задано"""
    username = message.from_user.username
    if username:
        return f"@{username}"
    return None

# Функции для работы с Supabase
def get_supabase_headers():
    """Возвращает заголовки для запросов к Supabase"""
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }

async def get_pending_confirmation_requests(telegram_username):
    """Получает активные запросы на подтверждение из Supabase"""
    headers = get_supabase_headers()
    
    try:
        # URL-кодируем имя пользователя для использования в запросе
        encoded_username = requests.utils.quote(telegram_username)
        
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/ConfirmationRequests?telegram_username=eq.{encoded_username}&status=eq.pending&order=created_at.desc.nullslast",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            return data
        
        logger.error(f"Ошибка при получении запросов из Supabase: {response.text}")
        return []
    except Exception as e:
        logger.error(f"Исключение при получении запросов из Supabase: {e}")
        return []

async def update_confirmation_request(request_id, status, telegram_user_id=None):
    """Обновляет статус запроса на подтверждение"""
    # Можно использовать локальный API или напрямую обращаться к Supabase
    try:
        # Пробуем через локальный API
        data = {
            'request_id': request_id,
            'status': status
        }
        
        if telegram_user_id:
            data['telegram_user_id'] = telegram_user_id
            
        response = requests.post(
            f"{API_URL}/update_confirmation_status",
            json=data
        )
        
        if response.status_code == 200:
            return response.json()
        
        # Если API недоступен, обращаемся напрямую к Supabase
        headers = get_supabase_headers()
        
        update_data = {
            'status': status,
            'updated_at': datetime.datetime.now().isoformat()
        }
        
        if telegram_user_id:
            update_data['telegram_user_id'] = telegram_user_id
        
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
            
        logger.error(f"Ошибка при обновлении запроса в Supabase: {response.text}")
        return {
            'status': 'error',
            'message': 'Ошибка при обновлении запроса'
        }
    except Exception as e:
        logger.error(f"Исключение при обновлении запроса: {e}")
        return {
            'status': 'error',
            'message': str(e)
        }

# Обработчик команды /start
@dp.message(Command("start"))
async def cmd_start(message: Message):
    """Обрабатывает команду /start."""
    user_id = message.from_user.id
    user_full_name = message.from_user.full_name
    
    # Пробуем получить ник из профиля пользователя
    username = get_telegram_username(message)
    
    if username:
        # Сохраняем ник пользователя для будущих проверок
        chat_to_username[user_id] = username
        logger.info(f"Получен ник {username} из профиля пользователя {user_id}")
        
        # Проверяем, есть ли запросы от пользователя с таким ником в Supabase
        pending_requests = await get_pending_confirmation_requests(username)
        
        if pending_requests and len(pending_requests) > 0:
            # Берем самый последний запрос
            request = pending_requests[0]
            request_id = request['id']
            
            # Обновляем ID пользователя в запросе
            await update_confirmation_request(request_id, 'pending', user_id)
            
            # Создаем клавиатуру с кнопками
            builder = InlineKeyboardBuilder()
            builder.add(
                InlineKeyboardButton(text="✅ Принять", callback_data=f"accept_{request_id}"),
                InlineKeyboardButton(text="❌ Отклонить", callback_data=f"reject_{request_id}")
            )
            
            await message.answer(
                f"Обнаружен запрос на подтверждение регистрации для {username}.\n\n"
                "Это вы пытаетесь зарегистрироваться на сайте?",
                reply_markup=builder.as_markup()
            )
            
            logger.info(f"Показан запрос на подтверждение {request_id} для пользователя {username}")
            return
    
    # Если нет ника в профиле или нет запросов, отправляем стандартное приветствие
    await message.answer(
        f"Привет, {user_full_name}! Я бот для подтверждения регистрации.\n\n"
        "При нажатии кнопки СТАРТ я автоматически проверяю наличие запросов на подтверждение.\n\n"
        "Чтобы войти через Telegram, используйте ваш профиль на сайте. После нажатия кнопки входа через Telegram, "
        "я автоматически проверю ваш запрос и отправлю кнопки для подтверждения."
    )
    
    logger.info(f"Пользователь {user_id} запустил бота")

# Обработчик всех текстовых сообщений, которые могут содержать ник в Telegram
@dp.message(F.text.startswith('@'))
async def handle_username(message: Message):
    """Обрабатывает сообщения с ником Telegram."""
    user_id = message.from_user.id
    telegram_username = message.text.strip()
    
    # Сохраняем соответствие ID чата и имени пользователя
    chat_to_username[user_id] = telegram_username
    
    # Проверяем, есть ли запрос от пользователя с таким ником в Supabase
    pending_requests = await get_pending_confirmation_requests(telegram_username)
    
    if pending_requests and len(pending_requests) > 0:
        # Берем самый последний запрос
        request = pending_requests[0]
        request_id = request['id']
        
        # Обновляем ID пользователя в запросе
        await update_confirmation_request(request_id, 'pending', user_id)
        
        # Создаем клавиатуру с кнопками
        builder = InlineKeyboardBuilder()
        builder.add(
            InlineKeyboardButton(text="✅ Принять", callback_data=f"accept_{request_id}"),
            InlineKeyboardButton(text="❌ Отклонить", callback_data=f"reject_{request_id}")
        )
        
        await message.answer(
            f"Обнаружен запрос на подтверждение регистрации для {telegram_username}.\n\n"
            "Это вы пытаетесь зарегистрироваться на сайте?",
            reply_markup=builder.as_markup()
        )
        
        logger.info(f"Показан запрос на подтверждение {request_id} для пользователя {telegram_username}")
    else:
        await message.answer(
            f"Запросов на подтверждение регистрации для {telegram_username} не найдено.\n\n"
            "Когда вы начнете регистрацию на сайте и укажете этот ник, я пришлю вам запрос."
        )
        
        logger.info(f"Запрос на подтверждение не найден для {telegram_username}")

# Обработчик нажатия на кнопки
@dp.callback_query(lambda c: c.data.startswith(('accept_', 'reject_')))
async def process_callback(callback: CallbackQuery):
    """Обрабатывает нажатие на кнопки принятия/отклонения запроса."""
    action, request_id = callback.data.split('_', 1)
    user_id = callback.from_user.id
    
    if action == "accept":
        # Обновляем статус запроса
        result = await update_confirmation_request(request_id, 'accepted', user_id)
        
        if result['status'] == 'success':
            await callback.message.edit_text(
                "✅ Вы успешно подтвердили регистрацию!\n\n"
                "Теперь вы можете вернуться на сайт и продолжить процесс."
            )
            
            logger.info(f"Запрос {request_id} одобрен пользователем {user_id}")
        else:
            await callback.message.edit_text(
                "❌ Произошла ошибка при подтверждении запроса.\n\n"
                "Пожалуйста, попробуйте еще раз или обратитесь в поддержку."
            )
            
            logger.error(f"Ошибка при одобрении запроса {request_id}: {result}")
    else:  # reject
        # Обновляем статус запроса
        result = await update_confirmation_request(request_id, 'rejected', user_id)
        
        if result['status'] == 'success':
            await callback.message.edit_text(
                "❌ Вы отклонили запрос на регистрацию.\n\n"
                "Если это были не вы, ничего делать не нужно."
            )
            
            logger.info(f"Запрос {request_id} отклонен пользователем {user_id}")
        else:
            await callback.message.edit_text(
                "❌ Произошла ошибка при отклонении запроса.\n\n"
                "Пожалуйста, попробуйте еще раз или обратитесь в поддержку."
            )
            
            logger.error(f"Ошибка при отклонении запроса {request_id}: {result}")
    
    # Отвечаем на callback query
    await callback.answer()

# Обработчик обычных текстовых сообщений
@dp.message(F.text)
async def handle_text(message: Message):
    """Обрабатывает остальные текстовые сообщения."""
    user_id = message.from_user.id
    
    # Проверяем, есть ли у пользователя ник в профиле
    username = get_telegram_username(message)
    if username:
        # Сохраняем ник пользователя для будущих проверок
        chat_to_username[user_id] = username
        
        # Проверяем, есть ли запрос от пользователя с таким ником в Supabase
        pending_requests = await get_pending_confirmation_requests(username)
        
        if pending_requests and len(pending_requests) > 0:
            # Берем самый последний запрос
            request = pending_requests[0]
            request_id = request['id']
            
            # Обновляем ID пользователя в запросе
            await update_confirmation_request(request_id, 'pending', user_id)
            
            # Создаем клавиатуру с кнопками
            builder = InlineKeyboardBuilder()
            builder.add(
                InlineKeyboardButton(text="✅ Принять", callback_data=f"accept_{request_id}"),
                InlineKeyboardButton(text="❌ Отклонить", callback_data=f"reject_{request_id}")
            )
            
            await message.answer(
                f"Обнаружен запрос на подтверждение регистрации для {username}.\n\n"
                "Это вы пытаетесь зарегистрироваться на сайте?",
                reply_markup=builder.as_markup()
            )
            
            logger.info(f"Показан запрос на подтверждение {request_id} для пользователя {username}")
            return
    
    await message.answer(
        "Пожалуйста, отправьте ваш ник в Telegram (начиная с @), чтобы проверить запросы на подтверждение.\n\n"
        "Или просто нажмите на кнопку СТАРТ - я автоматически проверю ваш профиль и наличие запросов.\n\n"
        "При входе через Telegram на сайте я также автоматически проверю ваш запрос."
    )

# API для внешнего взаимодействия с ботом - эти функции могут быть импортированы в app.py
async def create_confirmation_request(telegram_username):
    """
    Создает новый запрос на подтверждение или уведомляет пользователя о существующем
    Возвращает True, если запрос успешно создан или пользователь уведомлен
    """
    # Проверяем, есть ли пользователь с таким ником среди чатов
    user_id = None
    for uid, username in chat_to_username.items():
        if username == telegram_username:
            user_id = uid
            break
    
    if user_id:
        # Пользователь уже взаимодействовал с ботом, проверяем запрос
        pending_requests = await get_pending_confirmation_requests(telegram_username)
        
        if pending_requests and len(pending_requests) > 0:
            # Берем самый последний запрос
            request = pending_requests[0]
            request_id = request['id']
            
            # Создаем клавиатуру с кнопками
            builder = InlineKeyboardBuilder()
            builder.add(
                InlineKeyboardButton(text="✅ Принять", callback_data=f"accept_{request_id}"),
                InlineKeyboardButton(text="❌ Отклонить", callback_data=f"reject_{request_id}")
            )
            
            try:
                await bot.send_message(
                    chat_id=user_id,
                    text=f"Обнаружен новый запрос на подтверждение регистрации для {telegram_username}.\n\n"
                         "Это вы пытаетесь зарегистрироваться на сайте?",
                    reply_markup=builder.as_markup()
                )
                
                # Обновляем ID пользователя в запросе
                await update_confirmation_request(request_id, 'pending', user_id)
                
                logger.info(f"Отправлено уведомление пользователю {telegram_username} о запросе {request_id}")
                return True
            except Exception as e:
                logger.error(f"Ошибка при отправке сообщения: {e}")
    
    # Если пользователь не взаимодействовал с ботом или сообщение не отправлено, 
    # запрос уже создан в Supabase, просто логируем это
    logger.info(f"Запрос для {telegram_username} создан, но пользователь не уведомлен через бота")
    return False

async def check_confirmation_status(telegram_username):
    """
    Проверяет статус запроса на подтверждение
    Возвращает статус (accepted, rejected, pending) или None, если запрос не найден
    """
    # Проверяем запросы в Supabase
    pending_requests = await get_pending_confirmation_requests(telegram_username)
    
    if pending_requests and len(pending_requests) > 0:
        # Берем самый последний запрос
        request = pending_requests[0]
        return request['status']
    
    # Проверяем, есть ли недавние неактивные запросы
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
                return data[0]['status']
    except Exception as e:
        logger.error(f"Ошибка при проверке статуса запроса: {e}")
    
    return None

# Точка входа для запуска бота
async def main():
    """Запускает бота."""
    # Удаляем все ожидающие обновления
    await bot.delete_webhook(drop_pending_updates=True)
    # Запускаем бота в режиме long-polling
    await dp.start_polling(bot)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Бот остановлен") 