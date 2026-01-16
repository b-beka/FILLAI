# Руководство по деплою Fill AI

## Обзор

Fill AI состоит из двух частей:
- **Backend**: FastAPI приложение (Python)
- **Frontend**: Next.js приложение (React/TypeScript)

## Рекомендуемая архитектура деплоя

### Вариант 1: Vercel + Railway (Рекомендуется для MVP)

- **Frontend**: Vercel (бесплатный тариф для стартапов)
- **Backend**: Railway (простой деплой, автоматический HTTPS)
- **Database**: Railway PostgreSQL или Supabase

### Вариант 2: Vercel + Render

- **Frontend**: Vercel
- **Backend**: Render (бесплатный тариф с ограничениями)
- **Database**: Render PostgreSQL

### Вариант 3: Полный контроль (VPS)

- **Frontend**: Vercel или собственный сервер с Nginx
- **Backend**: VPS (DigitalOcean, Hetzner) с Docker
- **Database**: Managed PostgreSQL или собственный сервер

## Деплой Backend

### Railway

1. Создайте аккаунт на [Railway](https://railway.app)
2. Создайте новый проект
3. Добавьте PostgreSQL сервис
4. Добавьте GitHub репозиторий или загрузите код
5. Railway автоматически определит Dockerfile
6. Настройте переменные окружения (см. `backend/.env.production.example`)
7. Railway автоматически деплоит при каждом push в main

### Render

1. Создайте аккаунт на [Render](https://render.com)
2. Создайте новый Web Service
3. Подключите GitHub репозиторий
4. Укажите:
   - Build Command: `cd backend && pip install -r requirements.txt`
   - Start Command: `cd backend && alembic upgrade head && gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`
5. Добавьте PostgreSQL базу данных
6. Настройте переменные окружения
7. Render автоматически деплоит при каждом push

### Переменные окружения для Backend

Скопируйте `backend/.env.production.example` и заполните:

```bash
# Обязательные
OPENAI_API_KEY=your_key
DATABASE_URL=postgresql://...
SECRET_KEY=your-secret-key-min-32-chars
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com
FRONTEND_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com

# Опциональные
ENVIRONMENT=production
OPENAI_MODEL=gpt-4o-mini
```

## Деплой Frontend

### Vercel (Рекомендуется)

1. Создайте аккаунт на [Vercel](https://vercel.com)
2. Импортируйте GitHub репозиторий
3. Настройте проект:
   - Framework Preset: Next.js
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `.next`
4. Добавьте переменные окружения:
   - `NEXT_PUBLIC_API_URL`: URL вашего backend API
5. Vercel автоматически деплоит при каждом push

### Переменные окружения для Frontend

В Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL=https://your-backend-api.com
```

## Настройка базы данных

### Миграции

Миграции выполняются автоматически при старте backend через команду:
```bash
alembic upgrade head
```

### Первоначальная настройка

1. Подключитесь к базе данных
2. Убедитесь, что миграции применены
3. (Опционально) Создайте тестового пользователя через API

## Настройка домена и SSL

### Railway/Render

- Автоматически предоставляют HTTPS
- Настройте кастомный домен в настройках сервиса

### Vercel

- Автоматически предоставляет HTTPS
- Добавьте кастомный домен в настройках проекта

## Мониторинг

### Health Checks

Backend предоставляет эндпоинт `/health` для проверки работоспособности.

### Логирование

- **Development**: Человекочитаемые логи в консоль
- **Production**: JSON логи для интеграции с системами мониторинга

## CI/CD

GitHub Actions workflow настроен в `.github/workflows/deploy.yml`:

1. Запускает тесты
2. Собирает Docker образ для backend
3. Собирает frontend
4. Деплоит в production (настройте под вашу платформу)

## Чеклист перед деплоем

- [ ] Все переменные окружения настроены
- [ ] База данных создана и доступна
- [ ] Миграции применены
- [ ] CORS настроен для production домена
- [ ] Email сервис настроен (Resend/SendGrid)
- [ ] SSL сертификаты активны
- [ ] Health check работает
- [ ] Мониторинг настроен (опционально)

## Troubleshooting

### Backend не запускается

1. Проверьте логи в Railway/Render
2. Убедитесь, что DATABASE_URL правильный
3. Проверьте, что все зависимости установлены

### Frontend не подключается к Backend

1. Проверьте NEXT_PUBLIC_API_URL
2. Проверьте CORS настройки в backend
3. Проверьте, что backend доступен по HTTPS

### Ошибки миграций

1. Убедитесь, что DATABASE_URL правильный
2. Проверьте права доступа к базе данных
3. Запустите миграции вручную: `alembic upgrade head`

## Поддержка

Для вопросов по деплою создайте issue в репозитории.

