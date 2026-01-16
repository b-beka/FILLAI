# Fill AI Backend

Backend API для образовательной платформы Fill AI.

## Установка

1. Установите зависимости:
```bash
pip install -r requirements.txt
```

2. Создайте файл `.env` на основе `.env.example`:
```bash
cp .env.example .env
```

3. Настройте переменные окружения в `.env`:
- `DATABASE_URL` - URL базы данных PostgreSQL
- `OPENAI_API_KEY` - API ключ OpenAI
- `SECRET_KEY` - секретный ключ для JWT токенов

## Запуск

### Development

```bash
uvicorn app.main:app --reload
```

### Docker

```bash
docker-compose up
```

## Миграции

Создание миграции:
```bash
alembic revision --autogenerate -m "Initial migration"
```

Применение миграций:
```bash
alembic upgrade head
```

## API Документация

После запуска сервера доступна по адресу:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Структура проекта

```
backend/
├── app/
│   ├── agents/          # AI агенты для генерации курсов
│   ├── routers/         # API роутеры
│   ├── db_models.py     # SQLAlchemy модели
│   ├── schemas.py       # Pydantic схемы
│   ├── database.py      # Настройка БД
│   └── main.py          # Точка входа
├── alembic/             # Миграции БД
├── requirements.txt     # Python зависимости
└── docker-compose.yml   # Docker конфигурация
```
