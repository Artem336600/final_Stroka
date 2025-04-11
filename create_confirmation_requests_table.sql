-- Создание таблицы ConfirmationRequests для хранения запросов на подтверждение
CREATE TABLE IF NOT EXISTS "ConfirmationRequests" (
  "id" text NOT NULL PRIMARY KEY,
  "telegram_username" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  "telegram_user_id" bigint,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Добавление индексов для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_confirmation_requests_username ON "ConfirmationRequests" ("telegram_username");
CREATE INDEX IF NOT EXISTS idx_confirmation_requests_status ON "ConfirmationRequests" ("status");
CREATE INDEX IF NOT EXISTS idx_confirmation_requests_created_at ON "ConfirmationRequests" ("created_at");

-- Добавление RLS (Row Level Security) политик
ALTER TABLE "ConfirmationRequests" ENABLE ROW LEVEL SECURITY;

-- Политика на выборку: разрешить сервису доступ ко всем записям
CREATE POLICY "Service can view all confirmation requests"
  ON "ConfirmationRequests" FOR SELECT
  USING (true);

-- Политика на вставку: разрешить сервису создавать записи
CREATE POLICY "Service can insert confirmation requests"
  ON "ConfirmationRequests" FOR INSERT
  WITH CHECK (true);

-- Политика на обновление: разрешить сервису обновлять записи
CREATE POLICY "Service can update confirmation requests"
  ON "ConfirmationRequests" FOR UPDATE
  USING (true);

-- Добавление комментариев к таблице и полям
COMMENT ON TABLE "ConfirmationRequests" IS 'Таблица для хранения запросов на подтверждение регистрации через Telegram';
COMMENT ON COLUMN "ConfirmationRequests"."id" IS 'Уникальный идентификатор запроса';
COMMENT ON COLUMN "ConfirmationRequests"."telegram_username" IS 'Имя пользователя в Telegram (включая @)';
COMMENT ON COLUMN "ConfirmationRequests"."status" IS 'Статус запроса: pending (ожидает), accepted (принят), rejected (отклонен)';
COMMENT ON COLUMN "ConfirmationRequests"."telegram_user_id" IS 'ID пользователя в Telegram (для отправки уведомлений)';
COMMENT ON COLUMN "ConfirmationRequests"."created_at" IS 'Дата и время создания запроса';
COMMENT ON COLUMN "ConfirmationRequests"."updated_at" IS 'Дата и время последнего обновления запроса'; 