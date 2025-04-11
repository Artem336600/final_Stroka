# Система извлечения тегов с регистрацией через Telegram

Это приложение позволяет извлекать теги из текста и имеет функциональность регистрации через Telegram бота.

## Особенности

1. Извлечение тегов из текста с использованием AI
2. Система регистрации пользователей через Telegram с интерактивным подтверждением
3. Хранение данных и запросов на подтверждение в Supabase

## Установка и запуск

### Предварительные требования

- Python 3.8 или выше
- Telegram бот (токен: 7574510217:AAGYVNk4uqTxJ7HF7Z5XCkSqX59SOfJPjKU)
- Аккаунт Supabase

### Настройка базы данных Supabase

1. Создайте новый проект в [Supabase](https://supabase.com/)
2. Выполните SQL-запрос из файла `create_confirmation_requests_table.sql` для создания таблицы `ConfirmationRequests`
3. Убедитесь, что в проекте уже существует таблица `Users` с полями `tg` и `password`
4. Обновите переменные `SUPABASE_URL` и `SUPABASE_KEY` в файлах `app.py` и `telegram_bot.py`

### Установка зависимостей

```bash
pip install -r requirements.txt
```

### Запуск веб-приложения

```bash
cd final_Stroka
python app.py
```

Приложение будет доступно по адресу `http://localhost:5000`.

### Запуск Telegram бота (отдельно)

```bash
cd final_Stroka
python telegram_bot.py
```

**Важно:** Для корректной работы системы регистрации бот должен быть запущен отдельно.

## Процесс регистрации

1. Нажмите на иконку профиля в правом верхнем углу
2. Введите ваше имя пользователя в Telegram
3. Перейдите в Telegram и найдите бота @TREOSCOMPANY_bot
4. Отправьте боту ваш ник в Telegram
5. Подтвердите запрос на регистрацию, нажав кнопку "Принять" в сообщении от бота
6. После подтверждения веб-страница автоматически перейдет к следующему шагу
7. Придумайте и введите пароль
8. Ваша регистрация будет завершена, и данные сохранятся в Supabase

## Технические детали

- База данных: Supabase
- Фронтенд: HTML, CSS, JavaScript
- Бэкенд: Flask (Python)
- API: Telegram Bot API (aiogram 3)
- AI: DeepSeek AI (для извлечения тегов)

## Структура проекта

- `app.py` - основное Flask-приложение
- `telegram_bot.py` - скрипт для запуска Telegram-бота (aiogram 3)
- `templates/` - HTML, CSS и JavaScript файлы для фронтенда
- `requirements.txt` - список зависимостей проекта
- `create_confirmation_requests_table.sql` - SQL-скрипт для создания таблицы запросов в Supabase

## Структура базы данных

### Таблица Users
- `tg` - имя пользователя в Telegram
- `password` - пароль пользователя

### Таблица ConfirmationRequests
- `id` - уникальный идентификатор запроса 
- `telegram_username` - имя пользователя в Telegram (включая @)
- `status` - статус запроса: pending (ожидает), accepted (принят), rejected (отклонен)
- `telegram_user_id` - ID пользователя в Telegram (для отправки уведомлений)
- `created_at` - дата и время создания запроса
- `updated_at` - дата и время последнего обновления запроса

## О реализации Telegram бота

Бот реализован с использованием библиотеки aiogram версии 3, которая является современным асинхронным фреймворком для Telegram Bot API. Основные особенности:

- Асинхронный подход с использованием asyncio
- Простой и интуитивно понятный API
- Удобная система обработки сообщений с помощью декораторов
- Интерактивное взаимодействие с пользователем через кнопки
- Автоматическая проверка статуса подтверждения на стороне веб-приложения
- Надежная синхронизация между ботом и веб-приложением через таблицу ConfirmationRequests в Supabase 