"""FastAPI приложение для генерации курсов"""
import logging
import sys
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    SLOWAPI_AVAILABLE = True
except ImportError:
    SLOWAPI_AVAILABLE = False
import os
from dotenv import load_dotenv

load_dotenv()

# Configure structured logging for production
# Determine environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

if ENVIRONMENT == "production":
    # JSON logging for production (easier to parse by log aggregators)
    class JSONFormatter(logging.Formatter):
        def format(self, record):
            log_data = {
                "timestamp": self.formatTime(record),
                "level": record.levelname,
                "message": record.getMessage(),
                "module": record.module,
                "function": record.funcName,
                "line": record.lineno,
            }
            if record.exc_info:
                log_data["exception"] = self.formatException(record.exc_info)
            return json.dumps(log_data)
    
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    logging.basicConfig(
        level=logging.INFO,
        handlers=[handler]
    )
else:
    # Human-readable logging for development
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

logger = logging.getLogger(__name__)
# Initialize Sentry for error tracking (if DSN is provided) - after logger is set up
SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN and not any(placeholder in SENTRY_DSN for placeholder in ["xxxxx", "your_dsn_here", "example"]):
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
    
    try:
        sentry_sdk.init(
            dsn=SENTRY_DSN,
            integrations=[
                FastApiIntegration(),
                SqlalchemyIntegration(),
            ],
            traces_sample_rate=0.1,  # 10% of transactions for performance monitoring
            environment=ENVIRONMENT,
        )
        logger.info("Sentry initialized for error tracking")
    except Exception as e:
        logger.warning(f"Failed to initialize Sentry: {e}. Error tracking disabled.")
else:
    logger.info("Sentry DSN not provided or invalid, error tracking disabled")

from app.models import (
    CourseGenerationRequest,
    CourseGenerationResponse,
    CourseSettings,
    ExerciseCheckRequest,
    ExerciseCheckResponse,
    ExerciseCheckResult,
    AssistantChatRequest,
    AssistantChatResponse,
    ModuleTestRequest,
    ModuleTestResponse,
    ModuleTest,
    TestQuestion,
    CourseStructureResponse,
    ClarifyingQuestion,
    ClarifyingQuestionsRequest,
    ClarifyingQuestionsResponse,
)
from app.agents.course_coordinator import CourseCoordinator
from app.agents.grading_agent import ExerciseGradingAgent
from app.agents.assistant_agent import PersonalAssistantAgent
from app.agents.test_generator_agent import TestGeneratorAgent
from app.agents.clarifying_questions import ClarifyingQuestionsAgent
from app.routers import auth, courses, progress, discussions, users, payment
from app.dependencies import check_generation_limit, increment_generation_count
from app.database import get_db
from app.db_models import User
from fastapi import Depends
from sqlalchemy.orm import Session

app = FastAPI(
    title="Fill AI API",
    description="API для образовательной платформы Fill AI с использованием AI",
    version="1.0.0",
    docs_url="/docs" if ENVIRONMENT != "production" else None,  # Disable docs in production
    redoc_url="/redoc" if ENVIRONMENT != "production" else None,
)

logger.info(f"Starting Fill AI API in {ENVIRONMENT} mode")

# Ключ OpenRouter или OpenAI. Без ключа сервер работает (вход, библиотека), но курсы не генерируются — предупреждаем громко
ENV_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
if not os.getenv("OPENAI_API_KEY", "").strip():
    logger.warning(
        "\n" + "=" * 64 +
        "\n  OPENAI_API_KEY НЕ ЗАДАН — генерация курсов отключена."
        f"\n  Откройте файл: {ENV_FILE}"
        "\n  Впишите ключ OpenRouter в строку  OPENAI_API_KEY=sk-or-...  и перезапустите бэкенд."
        "\n" + "=" * 64
    )

# Rate limiting (optional)
if SLOWAPI_AVAILABLE:
    limiter = Limiter(key_func=get_remote_address)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# В PostgreSQL таблицы создаются миграциями Alembic; локальный SQLite создаётся сразу
from app.database import Base, engine, IS_SQLITE
from app import db_models as _models  # noqa: F401 — регистрирует модели в Base.metadata

if IS_SQLITE:
    Base.metadata.create_all(bind=engine)

# Настройка CORS для работы с фронтендом
cors_origins_env = os.getenv("CORS_ORIGINS", "*")
# Always allow localhost regex for safety in case of dynamic ports, even in "production" mode running locally
allow_origin_regex = r"https?://(localhost|127\.0\.0\.1)(:[0-9]+)?"

if ENVIRONMENT == "production":
    logger.info(f"Configuring CORS for Production. Env var CORS_ORIGINS: '{cors_origins_env}'")
    
    # In production, CORS must be explicitly configured
    if cors_origins_env == "*":
         cors_origins = []
         logger.warning("CORS_ORIGINS is '*' in production. Using localhost regex only.")
    else:
        cors_origins = cors_origins_env.split(",")
    
    logger.info(f"Final CORS Origins: {cors_origins}")
    logger.info(f"Final CORS Regex: {allow_origin_regex}")
    
    if not cors_origins and not allow_origin_regex:
        logger.warning("CORS_ORIGINS not set in production! API will be inaccessible from frontend.")
else:
    cors_origins = cors_origins_env.split(",") if cors_origins_env != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

class _Lazy:
    """Создаёт агента при первом обращении: без OPENAI_API_KEY сервер всё равно стартует
    (вход, библиотека, сообщество работают), падает только сама генерация."""

    def __init__(self, factory):
        self._factory = factory
        self._obj = None

    def __getattr__(self, name):
        if self._obj is None:
            self._obj = self._factory()
        return getattr(self._obj, name)


# Инициализируем координатор курсов и дополнительные агенты
coordinator = _Lazy(CourseCoordinator)
grading_agent = _Lazy(ExerciseGradingAgent)
assistant_agent = _Lazy(PersonalAssistantAgent)
test_generator = _Lazy(TestGeneratorAgent)
clarifying_questions_agent = _Lazy(ClarifyingQuestionsAgent)

# Include routers
app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(progress.router)
app.include_router(discussions.router)
app.include_router(users.router)
app.include_router(payment.router)


@app.get("/")
async def root():
    """Корневой эндпоинт"""
    return {
        "message": "Course Generation API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Проверка здоровья сервиса"""
    return {
        "status": "healthy",
        "service": "course-generation-api",
        "ai_ready": bool(os.getenv("OPENAI_API_KEY", "").strip()),
    }


@app.post("/api/courses/generate-questions", response_model=ClarifyingQuestionsResponse)
async def generate_clarifying_questions(request: ClarifyingQuestionsRequest):
    """
    Генерирует уточняющие вопросы для создания курса.
    
    Используется в мастере создания курсов для сбора информации
    от пользователя перед генерацией структуры курса.
    """
    try:
        questions_data = await clarifying_questions_agent.generate_questions(
            topic=request.topic,
            target_audience=request.target_audience
        )
        
        # Convert to Pydantic models
        questions = [ClarifyingQuestion(**q) for q in questions_data]
        
        return ClarifyingQuestionsResponse(
            success=True,
            questions=questions
        )
    except Exception as e:
        logger.error(f"Ошибка при генерации уточняющих вопросов: {str(e)}", exc_info=True)
        return ClarifyingQuestionsResponse(
            success=False,
            error=f"Ошибка при генерации вопросов: {str(e)}"
        )

@app.post("/api/courses/generate", response_model=CourseGenerationResponse)
async def generate_course(
    request: CourseGenerationRequest,
    current_user: User = Depends(check_generation_limit),
    db: Session = Depends(get_db)
):
    """
    Генерирует курс на основе настроек от фронтенда
    
    Использует мультиагентную систему:
    1. CourseStructureAgent - создает структуру курса (модули и уроки)
    2. LessonDetailAgent - детализирует содержание каждого урока
    """
    try:
        # Проверяем наличие API ключа OpenAI
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return CourseGenerationResponse(
                success=False,
                error="OPENAI_API_KEY не установлен в переменных окружения"
            )
        
        # Проверяем модель
        model_name = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
        logger.info(f"Используется модель: {model_name}")
        
        # Пробрасываем дополнительные файлы в настройки
        if request.reference_files and not request.settings.reference_files:
            request.settings.reference_files = request.reference_files

        # Генерируем курс используя мультиагентную систему
        generated_course = await coordinator.generate_course(
            settings=request.settings,
            structure_override=request.structure_override,
        )
        
        # --- SAVE TO DIRECTORY (Database) ---
        import uuid
        from app.db_models import Course, CourseModule, Lesson, Category, Enrollment, Tag
        
        # 1. Handle Category
        # Try to find existing category by label or ID
        category_name = generated_course.category
        db_category = db.query(Category).filter(Category.label == category_name).first()
        if not db_category:
            # Try by ID if it looks like a stripped string
            cat_id_candidate = category_name.lower().replace(" ", "-")
            # Just create new one if not found, to be safe
            db_category = Category(
                id=uuid.uuid4(),
                label=category_name,
                description=f"Generated category for {category_name}"
            )
            db.add(db_category)
            db.flush()
            
        # 2. Create Course
        course_id = uuid.uuid4() # Generated proper UUID
        
        db_course = Course(
            id=course_id,
            title=generated_course.title,
            description=generated_course.description,
            category_id=db_category.id,
            created_by=current_user.id,
            format="Онлайн", # Default
            level=generated_course.difficulty.value,
            duration=f"{generated_course.total_duration_hours} hours",
            intensity="Средняя", # Default
            goal=", ".join(generated_course.learning_objectives) if generated_course.learning_objectives else "",
            is_paid=False,
            is_public=True, # Generated courses are public by default?
            is_private=False
        )
        db.add(db_course)
        db.flush()
        
        # 3. Create Modules and Lessons
        for i, mod in enumerate(generated_course.modules):
            db_module = CourseModule(
                id=uuid.uuid4(),
                course_id=course_id,
                title=mod.title,
                description=mod.description,
                order=i
            )
            db.add(db_module)
            db.flush()
            
            for j, lesson in enumerate(mod.lessons):
                # Combine content + info into one content block for now, or use specific fields
                # The Pydantic model has detailed fields, but DB 'Lesson' mainly has 'content' (Text).
                # We will serialize the rich content into the text field or append it.
                
                # Construct rich content (JSON serialized)
                # We store the full structured object to preserve metadata for the frontend
                # Frontend (courseAdapter) will parse this back.
                
                final_content_obj = {}
                
                # 1. Base Content
                if isinstance(lesson.content, dict):
                    final_content_obj = lesson.content.copy()
                else:
                    final_content_obj = {"content": str(lesson.content)}
                
                # 2. Attach Videos
                # CourseCoordinator populates lesson.videos object
                if lesson.videos:
                    # Serialize Pydantic models to dicts
                    final_content_obj["videos"] = [v.model_dump() for v in lesson.videos]
                
                # 3. Attach Images
                if hasattr(lesson, "images") and lesson.images:
                    final_content_obj["images"] = lesson.images

                # 4. Attach Practice
                if lesson.practice_exercises:
                    final_content_obj["practice_exercises"] = [p.model_dump() for p in lesson.practice_exercises]
                
                # Serialize to JSON string for DB Text column
                import json
                rich_content = json.dumps(final_content_obj, ensure_ascii=False)
                
                db_lesson = Lesson(
                    id=uuid.uuid4(),
                    module_id=db_module.id,
                    title=lesson.title,
                    content=rich_content,
                    duration_minutes=lesson.duration_minutes,
                    order=j
                )
                db.add(db_lesson)
                
        # 4. Enroll the creator
        enrollment = Enrollment(
            id=uuid.uuid4(),
            user_id=current_user.id,
            course_id=course_id,
            progress_percent=0
        )
        db.add(enrollment)
        
        # 5. Increment usage count
        await increment_generation_count(str(current_user.id), db)
        
        db.commit()
        
        # Update return object with new ID
        generated_course.id = str(course_id)

        return CourseGenerationResponse(
            success=True,
            course=generated_course,
            message="Курс успешно сгенерирован и сохранен"
        )
    
    except Exception as e:
        db.rollback()
        error_msg = str(e)
        logger.error(f"Ошибка при генерации курса: {error_msg}", exc_info=True)
        
        # Более детальная обработка ошибок
        if "model" in error_msg.lower() and ("not found" in error_msg.lower() or "does not exist" in error_msg.lower()):
            current_model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
            error_msg = f"Модель '{current_model}' недоступна. Проверьте OPENAI_MODEL в .env файле. Попробуйте: gpt-3.5-turbo, gpt-4o, gpt-4o-mini"
        elif "api key" in error_msg.lower() or "authentication" in error_msg.lower():
            error_msg = "Неверный API ключ. Проверьте OPENAI_API_KEY в .env файле."
        
        return CourseGenerationResponse(
            success=False,
            error=f"Ошибка при генерации курса: {error_msg}"
        )


@app.post("/api/ai/grade-exercise", response_model=ExerciseCheckResponse)
async def grade_exercise(request: ExerciseCheckRequest):
    """
    Простой ИИ-проверяющий для практических заданий.

    Используется фронтендом, чтобы оценивать текстовые ответы студентов
    и возвращать понятный фидбек, оценку и рекомендации по улучшению.
    """
    try:
        result_data = await grading_agent.grade_exercise(request.model_dump())
        result = ExerciseCheckResult(**result_data)
        return ExerciseCheckResponse(success=True, result=result)
    except Exception as e:
        return ExerciseCheckResponse(success=False, error=str(e))


@app.post("/api/ai/assistant/chat", response_model=AssistantChatResponse)
async def assistant_chat(request: AssistantChatRequest):
    """
    Личный ИИ-ассистент / болталка с доступом к базовому контексту пользователя.

    Фронтенд может передать:
    - user_context (имя, цели, текущие курсы)
    - history (предыдущие сообщения диалога)
    """
    try:
        history = [
            {"role": msg.role, "content": msg.content}
            for msg in (request.history or [])
        ]
        user_context = request.user_context.model_dump() if request.user_context else None

        reply = await assistant_agent.chat(
            message=request.message,
            user_context=user_context,
            history=history,
        )
        return AssistantChatResponse(success=True, reply=reply)
    except Exception as e:
        return AssistantChatResponse(success=False, error=str(e))


@app.post("/api/courses/generate-module-test", response_model=ModuleTestResponse)
async def generate_module_test(request: ModuleTestRequest):
    """
    Генерирует тест для модуля курса (2-3 вопроса).
    
    Использует TestGeneratorAgent для создания тестов на основе:
    - Названия курса и модуля
    - Описания модуля
    - Списка уроков в модуле
    - Уровня сложности курса
    """
    try:
        # Проверяем наличие API ключа OpenAI
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return ModuleTestResponse(
                success=False,
                error="OPENAI_API_KEY не установлен в переменных окружения"
            )
        
        # Генерируем тест для модуля
        test_data = await test_generator.generate_module_tests(
            course_title=request.course_title,
            module_title=request.module_title,
            module_description=request.module_description,
            lessons=request.lessons,
            difficulty=request.course_difficulty
        )
        
        # Преобразуем в модель
        test_questions = [
            TestQuestion(
                question=t["question"],
                options=t["options"],
                correct=t["correct"],
                explanation=t["explanation"]
            )
            for t in test_data.get("tests", [])
        ]
        
        module_test = ModuleTest(tests=test_questions)
        
        return ModuleTestResponse(
            success=True,
            test=module_test,
        )
    
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Ошибка при генерации теста: {error_msg}", exc_info=True)
        return ModuleTestResponse(
            success=False,
            error=f"Ошибка при генерации теста: {error_msg}"
        )


@app.post("/api/courses/structure/preview", response_model=CourseStructureResponse)
async def preview_course_structure(request: CourseGenerationRequest):
    """
    Генерирует предварительную структуру курса (модули и уроки) без детализации.
    Преподаватель может отредактировать её перед финальной генерацией.
    """
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return CourseStructureResponse(
                success=False,
                error="OPENAI_API_KEY не установлен в переменных окружения"
            )

        # Используем только шаг построения структуры
        # Пробрасываем дополнительные файлы в настройки
        if request.reference_files and not request.settings.reference_files:
            request.settings.reference_files = request.reference_files

        structure = await coordinator.structure_agent.generate_structure(
            request.settings.model_dump()
        )

        return CourseStructureResponse(
            success=True,
            structure=structure
        )
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Ошибка при генерации структуры курса: {error_msg}", exc_info=True)
        return CourseStructureResponse(
            success=False,
            error=f"Ошибка при генерации структуры: {error_msg}"
        )



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

