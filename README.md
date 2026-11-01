# FILL AI

Генератор персонализированных мини-курсов на любой запрос. Пользователь пишет тему →
AI собирает конспект, тесты, задания и подборку YouTube-видео, а каждая тема становится
веткой его графа знаний.

Идея, дизайн и план дальнейших работ — в [docs/PLAN.md](docs/PLAN.md).

## Структура

```
backend/    FastAPI + мультиагентная генерация курсов (LangChain, OpenAI), PostgreSQL, Alembic
frontend/   Next.js 14 + Tailwind — интерфейс по макету Figma
docs/       план проекта и дизайн-токены
```

## Запуск

### Бэкенд

Для локального запуска база не нужна: по умолчанию бэкенд создаёт файл SQLite
`backend/fillai.db`. Нужен Python 3.11+.

```bash
cd backend
python -m venv venv
venv\Scripts\activate            # Windows; на Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
cp env.example .env              # SECRET_KEY обязателен, OPENAI_API_KEY — для генерации курсов
uvicorn app.main:app --reload --port 8000
```

Без `OPENAI_API_KEY` работает всё, кроме генерации курсов и AI-проверки.
На сервере укажите `DATABASE_URL=postgresql://…` и выполните `alembic upgrade head`.

Создать пользователя без письма-подтверждения (пароль спросит в терминале):

```bash
python -m scripts.create_user --username Bekzhan --email bekzhan@fill.ai --name "Бекжан"
```

Войти можно по логину или почте. Документация API: http://localhost:8000/docs

### Фронтенд

```bash
cd frontend
npm install
npm run dev
```

Откройте http://localhost:3000. Адрес API задаётся через `NEXT_PUBLIC_API_URL`
(по умолчанию `http://localhost:8000`).

## Экраны

| Путь | Что там |
|---|---|
| `/` | Граф знаний: вы в центре, темы — ветки, модули — листья; строка «Изучить» создаёт курс |
| `/?course=<id>` | Выбранная тема: модули и панель «Тренировки» (Теория · Видео · Задание, тест, прогресс, ссылка) |
| `/course/<id>` | Курс: конспект, видео, задания с AI-проверкой, тест по модулю |
| `/library` | Все ваши курсы |
| `/community` | Публичные курсы других пользователей |
| `/friends` | Общие графы (в разработке) |
| `/profile` | Аккаунт и статистика |

## Лицензия

MIT
