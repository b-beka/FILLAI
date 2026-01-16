# Быстрый старт для MVP

## Что было сделано

Все критичные задачи из плана MVP выполнены:

1. ✅ **Замена mockStore на API** - все компоненты используют реальные API вызовы
2. ✅ **Discussions API** - полная интеграция обсуждений с backend
3. ✅ **Email сервис** - Resend/SendGrid для верификации и восстановления пароля
4. ✅ **Production деплой** - Docker, CI/CD, документация
5. ✅ **Мониторинг** - Sentry интегрирован для отслеживания ошибок
6. ✅ **Безопасность** - rate limiting, валидация, security headers
7. ✅ **Тесты** - базовые тесты для критичных функций

## Быстрый запуск для разработки

### Backend

```bash
cd backend

# Установить зависимости
pip install -r requirements.txt

# Создать .env файл
cp env.example .env
# Отредактировать .env и добавить:
# - DATABASE_URL (PostgreSQL)
# - SECRET_KEY (случайная строка минимум 32 символа)
# - OPENAI_API_KEY
# - RESEND_API_KEY (опционально, для email)

# Применить миграции
alembic upgrade head

# Запустить сервер
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend

# Установить зависимости
npm install

# Создать .env.local (опционально)
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Запустить dev сервер
npm run dev
```

## Запуск тестов

```bash
cd backend
pytest tests/
```

## Production деплой

См. подробные инструкции в `DEPLOYMENT.md`

Кратко:
1. Настроить переменные окружения на платформе
2. Деплой backend на Railway/Render
3. Деплой frontend на Vercel
4. Настроить домен и SSL

## Важные переменные окружения

### Backend (.env)
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT secret (минимум 32 символа)
- `OPENAI_API_KEY` - OpenAI API ключ
- `RESEND_API_KEY` - для отправки email (опционально)
- `EMAIL_FROM` - email отправителя
- `FRONTEND_URL` - URL фронтенда для ссылок в письмах
- `CORS_ORIGINS` - разрешенные origins (в production)
- `ENVIRONMENT` - `development` или `production`
- `SENTRY_DSN` - для мониторинга ошибок (опционально)

### Frontend (.env.local)
- `NEXT_PUBLIC_API_URL` - URL backend API
- `NEXT_PUBLIC_SENTRY_DSN` - для мониторинга (опционально)

## Следующие шаги

1. Настроить базу данных PostgreSQL
2. Получить API ключи (OpenAI, Resend)
3. Протестировать локально
4. Деплой на production платформу
5. Настроить мониторинг (Sentry)

## Поддержка

Для вопросов создайте issue в репозитории.

