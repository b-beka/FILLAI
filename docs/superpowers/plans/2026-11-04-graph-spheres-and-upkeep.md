# Сферы, иконки, стрелка и лёгкая поддержка: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Стрелка отправки улетает из строки в граф, курсы складываются в дерево «сфера → подтема» с тематическими иконками, а у проекта есть проверки, резервная копия и инструкция.

**Architecture:** Категории становятся деревом глубиной 2. Отдельный модуль на бэкенде после генерации спрашивает модель о сфере и подтеме и при любой ошибке отправляет курс в «Общее». Фронтенд строит узлы графа чистой функцией `buildTree`, а полёт стрелки рисует отдельный компонент.

**Tech Stack:** FastAPI, SQLAlchemy 2, Alembic, Supabase Postgres, Next.js 14, TypeScript, `lucide-react`, Vitest, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-04-graph-spheres-and-upkeep-design.md`

## Global Constraints

- Работа идёт в ветке `redesign-figma`. Отправка в `fillai` и `origin` — только по отдельной просьбе.
- Коммиты: `git -c user.name="Tlektes Bekzhan" -c user.email="tlektesbekzan777@gmail.com" commit`, в конце сообщения `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `backend/.env`, `*.db`, `backend/backups/` не попадают в git. Значения из `.env` не печатать.
- Глубина дерева строго 2: сфера → подтема.
- Ошибка определения сферы не роняет генерацию.
- Модель берётся из `OPENAI_MODEL`, адрес из `OPENAI_BASE_URL`; новых платных сервисов нет.
- Комментарии в коде на русском, стиль как в соседних файлах.
- Новые таблицы в Supabase — только с RLS.

## Review Focus

1. Два курса почти одновременно создают одну новую сферу: дубля быть не должно. Тест в Task 2.
2. Модель вернула подтему, совпадающую со сферой, пустую или длиннее 60 символов: узел не ломается. Тест в Task 1.
3. Курс без категории или с категорией без родителя показывается в «Общее», а не пропадает. Тест в Task 4.
4. Enter вместо клика, двойное нажатие: один полёт и одна генерация. Проверка в Task 5.
5. Окно узкое или граф ещё не дал позицию нового узла: полёт пропускается, узел всё равно появляется. Проверка в Task 5.

---

### Task 1: Определение сферы и подтемы

**Files:**
- Create: `backend/app/topic_icons.py`
- Create: `backend/app/services/topic_classifier.py`
- Test: `backend/tests/test_topic_classifier.py`

**Interfaces:**
- Produces: `ICON_NAMES: frozenset[str]`, `FALLBACK_ICON = "book"`, `GENERAL_SPHERE = "Общее"`.
- Produces: `TopicPlacement` (dataclass: `sphere: str`, `sphere_icon: str`, `subtopic: str`, `subtopic_icon: str`).
- Produces: `normalize_label(label: str) -> str` — нижний регистр, схлопнутые пробелы.
- Produces: `parse_placement(raw: str, title: str) -> TopicPlacement` — чистая разборка ответа, бросает `ValueError` при плохом JSON.
- Produces: `async classify_topic(title: str, known: dict[str, list[str]], complete: Callable[[str], Awaitable[str]] | None = None) -> TopicPlacement`; `known` — сфера → подтемы.

- [ ] **Step 1: Написать падающие тесты**

```python
def test_unknown_icon_replaced_by_fallback():
    p = parse_placement('{"sphere":"Языки","sphere_icon":"nope","subtopic":"Казахский","subtopic_icon":"languages"}', "Казахский")
    assert p.sphere_icon == "book" and p.subtopic_icon == "languages"

def test_json_inside_text_is_found():
    assert parse_placement('Вот: {"sphere":"Языки","sphere_icon":"globe","subtopic":"Английский","subtopic_icon":"book"} конец', "x").sphere == "Языки"

def test_subtopic_equal_to_sphere_uses_title():
    assert parse_placement('{"sphere":"Языки","sphere_icon":"globe","subtopic":" языки ","subtopic_icon":"book"}', "Английский язык").subtopic == "Английский язык"

def test_empty_subtopic_uses_title():
    assert parse_placement('{"sphere":"Языки","sphere_icon":"globe","subtopic":"","subtopic_icon":"book"}', "Казахский").subtopic == "Казахский"

def test_labels_cut_to_60_chars():
    raw = json.dumps({"sphere": "С" * 90, "sphere_icon": "globe", "subtopic": "П" * 90, "subtopic_icon": "book"})
    p = parse_placement(raw, "x")
    assert len(p.sphere) == 60 and len(p.subtopic) == 60

@pytest.mark.asyncio
async def test_model_failure_goes_to_general():
    async def boom(_): raise RuntimeError("429")
    p = await classify_topic("Основы Git", {}, complete=boom)
    assert (p.sphere, p.subtopic, p.sphere_icon) == ("Общее", "Основы Git", "book")

@pytest.mark.asyncio
async def test_known_spheres_reach_the_prompt():
    seen = {}
    async def fake(prompt):
        seen["p"] = prompt
        return '{"sphere":"Языки","sphere_icon":"globe","subtopic":"Казахский","subtopic_icon":"book"}'
    await classify_topic("Казахский", {"Языки": ["Английский"]}, complete=fake)
    assert "Языки" in seen["p"] and "Английский" in seen["p"]
```

- [ ] **Step 2: Запустить и убедиться, что падают**

Run: `cd backend && venv/Scripts/python -m pytest tests/test_topic_classifier.py -v`
Expected: FAIL, модуль не найден.

- [ ] **Step 3: Реализовать `topic_icons.py` и `topic_classifier.py`**

`ICON_NAMES` — примерно 150 kebab-case имён Lucide по темам ЕНТ, школьных предметов, языков, IT, профессий, спорта, творчества. Обязательно: `book`, `globe`, `languages`. Вызов модели по умолчанию — `AsyncOpenAI` из окружения, таймаут 30 с, без `response_format`: бесплатная модель может его не поддерживать. Промпт перечисляет `known` и `ICON_NAMES`, требует выбрать существующую сферу, если тема подходит. Любое исключение в `classify_topic` логируется и даёт `TopicPlacement(GENERAL_SPHERE, FALLBACK_ICON, title[:60], FALLBACK_ICON)`.

- [ ] **Step 4: Запустить тесты**

Run: `cd backend && venv/Scripts/python -m pytest tests/test_topic_classifier.py -v`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add backend/app/topic_icons.py backend/app/services/topic_classifier.py backend/tests/test_topic_classifier.py
git commit -m "Classify course topics into spheres with AI fallback"
```

### Task 2: Дерево категорий и привязка курса

**Files:**
- Modify: `backend/app/db_models.py` (`Category`)
- Modify: `backend/app/schemas.py` (`CategoryBrief`, `CourseResponse`)
- Modify: `backend/app/main.py` (сохранение курса, примерно строки 290–305)
- Modify: `backend/app/agents/course_coordinator.py` (убрать `_determine_category`)
- Modify: `backend/app/routers/courses.py` (отдавать `category`)
- Modify: `backend/app/services/topic_classifier.py` (`resolve_category`, `known_tree`)
- Create: `backend/alembic/versions/<id>_category_tree.py`
- Test: `backend/tests/test_category_tree.py`

**Interfaces:**
- Consumes: `TopicPlacement`, `classify_topic`, `normalize_label` из Task 1.
- Produces: `Category.parent_id`, `Category.icon`, `Category.parent`, `Category.children`.
- Produces: `known_tree(db: Session) -> dict[str, list[str]]`.
- Produces: `resolve_category(db: Session, placement: TopicPlacement) -> Category` — возвращает подтему, сферу создаёт при необходимости.
- Produces: JSON курса: `category: {id, label, icon, parent: {id, label, icon, parent: null} | null} | null`.

- [ ] **Step 1: Написать падающие тесты**

```python
def test_same_sphere_any_case_reused(db):
    a = resolve_category(db, TopicPlacement("Языки", "globe", "Английский", "book"))
    b = resolve_category(db, TopicPlacement(" ЯЗЫКИ ", "globe", "Казахский", "book"))
    assert a.parent_id == b.parent_id
    assert db.query(Category).filter(Category.parent_id.is_(None)).count() == 1

def test_resolve_twice_returns_same_row(db):
    p = TopicPlacement("Языки", "globe", "Английский", "book")
    assert resolve_category(db, p).id == resolve_category(db, p).id

def test_duplicate_sphere_insert_is_rejected(db):
    db.add_all([Category(label="Языки"), Category(label="языки")])
    with pytest.raises(IntegrityError):
        db.commit()

def test_resolve_recovers_from_concurrent_insert(db, monkeypatch):
    # первый поиск не находит запись, вставка ловит IntegrityError, повторный поиск её возвращает
    ...

def test_known_tree(db):
    resolve_category(db, TopicPlacement("Языки", "globe", "Английский", "book"))
    assert known_tree(db) == {"Языки": ["Английский"]}

def test_course_response_has_category_parent(client, auth_headers, db):
    # курс в подтеме «Языки → Английский»; GET /api/courses/my
    # data[0]["category"]["parent"]["label"] == "Языки"
    ...
```

Два теста с `...` дописываются по шаблону из `tests/test_courses.py`, assert указан в комментарии.

- [ ] **Step 2: Запустить и убедиться, что падают**

Run: `cd backend && venv/Scripts/python -m pytest tests/test_category_tree.py -v`
Expected: FAIL.

- [ ] **Step 3: Обновить модель и написать миграцию**

Уникальный индекс `uq_category_sibling` по `lower(label)` и `coalesce(parent_id, '00000000-0000-0000-0000-000000000000')`: он работает и для сфер без родителя, и в SQLite для тестов. Миграция добавляет поля, индекс и сферы: Языки, ЕНТ, Программирование, Дизайн, Наука, Профессия, Общее, с иконками из `ICON_NAMES`. Существующие записи с такими именами обновляются, а не дублируются.

- [ ] **Step 4: Реализовать `known_tree`, `resolve_category` и схему ответа**

При `IntegrityError` — `db.rollback()` до savepoint (`begin_nested`) и повторный поиск. Эндпоинты курсов отдают `category` с родителем.

- [ ] **Step 5: Подключить к генерации**

В `main.py` заменить поиск категории на `known_tree` → `classify_topic(settings.title, ...)` → `resolve_category`. Курс получает `category_id` подтемы. В `course_coordinator.py`: `category=settings.custom_category_name or "Общее"`, `_determine_category` удалить.

- [ ] **Step 6: Запустить все тесты бэкенда**

Run: `cd backend && venv/Scripts/python -m pytest -q`
Expected: все PASS.

- [ ] **Step 7: Применить миграцию к Supabase и проверить обратимость**

Run: `cd backend && venv/Scripts/alembic upgrade head && venv/Scripts/alembic downgrade -1 && venv/Scripts/alembic upgrade head && venv/Scripts/alembic current`
Expected: новая ревизия `(head)`. Проверить через Supabase: 7 сфер, `get_advisors` без новых предупреждений уровня WARN и выше.

- [ ] **Step 8: Коммит**

```bash
git add backend
git commit -m "Store courses in a sphere and subtopic tree"
```

### Task 3: Иконки на фронтенде

**Files:**
- Modify: `frontend/package.json`, `frontend/package-lock.json`
- Create: `frontend/src/lib/topicIcons.ts`
- Modify: `frontend/src/lib/api.ts` (тип `Course`)
- Test: `backend/tests/test_topic_icons_sync.py`

**Interfaces:**
- Consumes: `ICON_NAMES` из Task 1.
- Produces: `TopicIcon({ name, size, strokeWidth }: { name?: string | null; size: string; strokeWidth?: number }): JSX.Element`; неизвестное имя рисует `book`.
- Produces: `CategoryBrief { id: string; label: string; icon?: string | null; parent?: CategoryBrief | null }` и `Course.category?: CategoryBrief | null`.

- [ ] **Step 1: Написать падающий тест**

```python
def test_frontend_icons_match_backend():
    source = (ROOT / "frontend/src/lib/topicIcons.ts").read_text(encoding="utf-8")
    names = set(re.findall(r"'([a-z0-9-]+)':", source))
    assert names == set(ICON_NAMES)
```

- [ ] **Step 2: Запустить и убедиться, что падает**

Run: `cd backend && venv/Scripts/python -m pytest tests/test_topic_icons_sync.py -v`
Expected: FAIL, файла нет.

- [ ] **Step 3: Поставить зависимость и реализовать**

Run: `cd frontend && npm install --save-exact lucide-react@0.468.0`
В `topicIcons.ts` — явные именованные импорты и объект `'kebab-name': Component`, чтобы в сборку попали только эти иконки.

- [ ] **Step 4: Запустить тест и проверку типов**

Run: `cd backend && venv/Scripts/python -m pytest tests/test_topic_icons_sync.py -v` затем `cd frontend && npx tsc --noEmit -p .`
Expected: PASS, ошибок типов нет.

- [ ] **Step 5: Коммит**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/lib/topicIcons.ts frontend/src/lib/api.ts backend/tests/test_topic_icons_sync.py
git commit -m "Add the topic icon set"
```

### Task 4: Дерево в графе

**Files:**
- Create: `frontend/src/lib/tree.ts`
- Create: `frontend/src/lib/tree.test.ts`
- Modify: `frontend/package.json` (Vitest, скрипт `"test": "vitest run"`)
- Modify: `frontend/src/app/page.tsx` (сборка узлов)
- Modify: `frontend/src/lib/course.ts` (убрать `iconFor`, `BranchIcon`, если больше не используются)

**Interfaces:**
- Consumes: `Course.category`, `TopicIcon` из Task 3.
- Produces: `buildTree(courses: Course[]): SphereGroup[]`, где `SphereGroup = { key: string; label: string; icon: string; subtopics: SubtopicGroup[] }`, `SubtopicGroup = { key: string; label: string; icon: string; courses: Course[] }`.

- [ ] **Step 1: Написать падающие тесты**

```ts
const c = (id: string, category: CategoryBrief | null) => ({ id, title: id, created_by: 'u', created_at: '', views: 0, category }) as Course;
const lang = { id: 'l', label: 'Языки', icon: 'globe' };

it('группирует подтемы одной сферы', () => {
  const t = buildTree([c('a', { id: 'e', label: 'Английский', parent: lang }), c('b', { id: 'k', label: 'Казахский', parent: lang })]);
  expect(t).toHaveLength(1);
  expect(t[0].subtopics.map((s) => s.label)).toEqual(['Английский', 'Казахский']);
});

it('курс без категории уходит в Общее', () => {
  expect(buildTree([c('a', null)])[0].label).toBe('Общее');
});

it('категория без родителя считается сферой в Общем не теряя курс', () => {
  const t = buildTree([c('a', { id: 'x', label: 'Старая' })]);
  expect(t[0].label).toBe('Общее');
  expect(t[0].subtopics[0].courses[0].id).toBe('a');
});

it('несколько курсов одной подтемы остаются в ней', () => {
  const sub = { id: 'e', label: 'Английский', parent: lang };
  expect(buildTree([c('a', sub), c('b', sub)])[0].subtopics[0].courses).toHaveLength(2);
});
```

- [ ] **Step 2: Запустить и убедиться, что падают**

Run: `cd frontend && npm i -D --save-exact vitest@2.1.8 && npm test`
Expected: FAIL, `buildTree` нет.

- [ ] **Step 3: Реализовать `buildTree`**

- [ ] **Step 4: Запустить тесты**

Run: `cd frontend && npm test`
Expected: PASS.

- [ ] **Step 5: Перестроить узлы в `page.tsx`**

Ребра: `me → sphere → subtopic → course → modules`. Если в подтеме один курс, узла подтемы нет: узел курса крепится к сфере и получает иконку подтемы. Модули — только у выбранного курса. ID узлов: `sp-<key>`, `st-<key>`, `c-<id>`, `m-<id>`. Лимиты `MAX_COURSES` и `MAX_MODULES` остаются. Подсказки пустого графа не меняются.

- [ ] **Step 6: Проверить в браузере**

Запустить фронтенд, войти, проверить: сферы и подтемы видны, клик по курсу открывает панель и модули, перетаскивание работает, все три темы и мобильная ширина читаемы.

- [ ] **Step 7: Коммит**

```bash
git add frontend
git commit -m "Show courses as a sphere and subtopic tree"
```

### Task 5: Стрелка внутри строки и полёт в граф

**Files:**
- Modify: `frontend/src/components/SearchBar.tsx`
- Create: `frontend/src/components/ArrowFlight.tsx`
- Modify: `frontend/src/components/Graph.tsx` (`GraphNode.hidden`)
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/globals.css` (если нужны стили возврата стрелки)

**Interfaces:**
- Produces: проп `onSubmit(topic, level, files, from: DOMRect | null)` у `SearchBar`.
- Produces: `GraphNode.hidden?: boolean` — узел участвует в раскладке, но не виден.
- Produces: `ArrowFlight({ from, to, onDone }: { from: DOMRect; to: Point; onDone: () => void }): JSX.Element` — `to` в координатах сцены.

- [ ] **Step 1: Перенести кнопку в строку**

Порядок справа налево: стрелка на самом краю, рядом «+». Убрать `paddingLeft: u(66)` и `gap` формы, чтобы строка стояла по центру. `form onSubmit` — единственная точка отправки, поэтому Enter и клик идут одним путём. Передавать в `onSubmit` прямоугольник стрелки.

- [ ] **Step 2: Добавить `hidden` в `LivingGraph`**

Скрытый узел остаётся в симуляции, невидим и не ловит указатель; его ребро тоже не рисуется.

- [ ] **Step 3: Реализовать `ArrowFlight`**

Web Animations API, 700 мс, `cubic-bezier(.3,0,.2,1)`, дуга через промежуточный кадр, в конце масштаб растёт до размера узла и стрелка гаснет. Смещение считается от `getBoundingClientRect()` родителя. `onDone` вызывается и при `finish`, и при `cancel`, ровно один раз.

- [ ] **Step 4: Связать в `page.tsx`**

Состояние `flight: DOMRect | null`. Если пользователь вошёл, `from` есть и нет `prefers-reduced-motion`, ставим `flight`, узел `pending` получает `hidden: !!flight`. `ArrowFlight` рендерится внутри `children(pos)`; если `pos('pending')` нет, полёт сразу завершается. Не вошедший пользователь идёт на вход без полёта. Страховка: через 1500 мс `flight` сбрасывается в любом случае.

- [ ] **Step 5: Проверить в браузере (Review Focus 4 и 5)**

Клик и Enter дают один полёт и один запрос `/api/courses/generate` (видно в `read_network_requests`). Двойной клик — тоже один. На ширине 375 px и при эмуляции `prefers-reduced-motion` узел появляется. Не вошедший попадает на `/login?topic=...`.

- [ ] **Step 6: Запустить проверки**

Run: `cd frontend && npx tsc --noEmit -p . && npm test && npm run build`
Expected: без ошибок.

- [ ] **Step 7: Коммит**

```bash
git add frontend
git commit -m "Launch the arrow from the search bar into the graph"
```

### Task 6: Поддержка

**Files:**
- Delete: `.github/workflows/deploy.yml`
- Create: `.github/workflows/ci.yml`
- Create: `backend/scripts/backup_db.py`, `backend/scripts/restore_db.py`
- Create: `docs/RUNBOOK.md`
- Modify: `backend/app/main.py` (`/health`, ответ на 429)
- Modify: `backend/.gitignore` (`backups/`)
- Modify: `README.md` (ссылка на RUNBOOK)
- Test: `backend/tests/test_upkeep.py`

**Interfaces:**
- Produces: `backup(engine, out_dir: Path) -> Path`, `restore(engine, path: Path) -> dict[str, int]` (таблица → строк); запуск: `python -m scripts.backup_db`, `python -m scripts.restore_db <файл> --yes`.
- Produces: `/health` с полем `db: bool`; при сбое базы статус `degraded`, HTTP 200.

- [ ] **Step 1: Написать падающие тесты**

```python
def test_backup_and_restore_roundtrip(tmp_path):
    # пользователь и курс в SQLite-файле → backup → очистка → restore
    # assert строки и UUID совпали, restore вернул {"users": 1, ...}
    ...

def test_restore_refuses_non_empty_database(tmp_path):
    # assert ValueError, данные не изменились
    ...

def test_health_reports_db(client):
    assert client.get("/health").json()["db"] is True

def test_rate_limit_message_is_friendly(client, auth_headers, monkeypatch):
    # coordinator.generate_course бросает ошибку с "429"
    # assert success is False и "лимит" in error.lower()
    ...
```

Тесты с `...` дописываются по условиям в комментариях.

- [ ] **Step 2: Запустить и убедиться, что падают**

Run: `cd backend && venv/Scripts/python -m pytest tests/test_upkeep.py -v`
Expected: FAIL.

- [ ] **Step 3: Реализовать копию, `/health` и сообщение о лимите**

Копия: `gzip` + JSON, порядок `Base.metadata.sorted_tables`, UUID и даты строками. Восстановление только в пустую базу.

- [ ] **Step 4: Запустить тесты**

Run: `cd backend && venv/Scripts/python -m pytest -q`
Expected: все PASS.

- [ ] **Step 5: Проверить копию на Supabase**

Run: `cd backend && venv/Scripts/python -m scripts.backup_db`
Expected: файл в `backend/backups/`, `git status` его не показывает.

- [ ] **Step 6: Написать `ci.yml`**

На push и pull_request: `actions/checkout@v4`, `actions/setup-python@v5` (Python 3.13), `actions/setup-node@v4` (Node 20). Шаги: `pip install -r requirements.txt`, `pytest -q` с `SECRET_KEY=test-only`, затем `npm ci`, `npx tsc --noEmit -p .`, `npm test`, `npm run build`.

- [ ] **Step 7: Написать `docs/RUNBOOK.md`**

Разделы: запуск; копия и восстановление; Supabase на паузе; кончился лимит OpenRouter (ответ 429); замена ключа; новый аккаунт для показа.

- [ ] **Step 8: Выдать Bekzhan роль `admin`**

Перед этим проверить `grep -rn "admin" backend/app`: что ещё даёт эта роль. Если есть опасные права, сообщить пользователю. Затем обновить запись, изменив только этого пользователя, и убедиться, что затронута 1 строка.

- [ ] **Step 9: Коммит**

```bash
git add .github backend docs README.md
git commit -m "Add CI, database backups and a runbook"
```

### Task 7: Сквозная проверка

**Files:** нет новых.

- [ ] **Step 1: Запустить сайт и сгенерировать два курса**

Войти как Bekzhan (пользователь входит сам). Сгенерировать «Английский язык» и «Казахский язык».
Expected: оба под сферой «Языки», иконки разные или обе тематические, стрелка долетает, в Supabase нет дублей сфер.

- [ ] **Step 2: Отчитаться**

Сказать, что проверено, что нет, и что `ci.yml` запустится только после отправки на GitHub. Сбой определения сферы проверен только тестом Task 1.
