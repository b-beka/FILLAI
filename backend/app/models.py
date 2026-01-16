from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


class CourseDifficulty(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class ReferenceFile(BaseModel):
    """Файл/материал для генерации"""
    name: str
    content: str = Field(..., description="Текстовое содержимое файла или выдержка")
    size_kb: Optional[int] = Field(None, description="Размер файла (кб)")
    type: Optional[str] = Field(None, description="MIME тип, если известен")


class CourseSettings(BaseModel):
    """Настройки курса от фронтенда"""
    title: str = Field(..., description="Название курса")
    description: Optional[str] = Field(None, description="Описание курса")
    difficulty: CourseDifficulty = Field(CourseDifficulty.INTERMEDIATE, description="Уровень сложности")
    duration_hours: int = Field(10, description="Продолжительность курса в часах")
    target_audience: str = Field(..., description="Целевая аудитория")
    learning_objectives: List[str] = Field(default_factory=list, description="Цели обучения")
    custom_category_name: Optional[str] = Field(None, description="Пользовательское название категории")
    additional_requirements: Optional[str] = Field(None, description="Дополнительные требования")
    reference_files: Optional[List[ReferenceFile]] = Field(
        default=None, description="Дополнительные файлы/материалы для генерации"
    )


class VideoMaterial(BaseModel):
    """Видео материал"""
    title: str
    url: str
    description: Optional[str] = None
    duration: Optional[str] = None
    channel: Optional[str] = None


class AdditionalMaterial(BaseModel):
    """Дополнительный материал"""
    title: str
    type: str = Field(..., description="Тип материала: article, book, website, etc.")
    url: Optional[str] = None
    description: Optional[str] = None


class PracticeExercise(BaseModel):
    """Практическое упражнение"""
    title: str
    description: str
    difficulty: str = Field("medium", description="easy, medium, hard")
    estimated_time: Optional[str] = None
    solution_hint: Optional[str] = None


class TermExplanation(BaseModel):
    """Объяснение термина (wiki-style)"""
    term: str
    explanation: str


class HallucinationRisk(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class CoursePassport(BaseModel):
    """Паспорт курса (Fill AI Ideal Format)"""
    target_result: str = Field(..., description="Конечный результат для ученика")
    thinking_level: str = Field(..., description="Уровень мышления (стратегический, правовой и т.д.)")
    limitations: str = Field(..., description="Ограничения курса")
    depth_score: int = Field(..., description="Оценка глубины 1-10")
    hallucination_risk: HallucinationRisk = Field(HallucinationRisk.LOW, description="Риск галлюцинаций ИИ")


class ModuleLayerType(str, Enum):
    MEANING = "meaning"
    CORE = "core"
    SIMULATION = "simulation"
    PRACTICE = "practice"
    CONTROL = "control"


class ModuleLayer(BaseModel):
    """Слой модуля (Fill AI Ideal Format)"""
    type: ModuleLayerType
    title: str
    content: Any = Field(..., description="Содержимое слоя (зависит от типа)")



class ExperienceType(str, Enum):
    INTERACTIVE_TUTOR = "interactive_tutor"
    PRACTICE = "practice"
    SIMULATOR = "simulator"
    CASE_STUDY = "case_study"
    VISUAL_REASONING = "visual_reasoning"
    VIDEO_DRIVEN = "video_driven"
    HYBRID = "hybrid"
    TEXT = "text" # Fallback/Legacy


class TutorContent(BaseModel):
    """Контент для Interactive Tutor"""
    concept_explanation: str = Field(..., description="Объяснение концепции персонажем")
    initial_question: str = Field(..., description="Первый вопрос студенту")
    key_points: List[str] = Field(default_factory=list)
    character_persona: str = Field("Friendly Teacher", description="Роль ИИ (наставник, критик и т.д.)")


class SimulatorOption(BaseModel):
    text: str
    feedback: str
    is_correct: bool = False
    consequence: Optional[str] = None


class SimulatorScenario(BaseModel):
    """Сценарий симулятора"""
    situation: str
    context: str
    role: str
    options: List[SimulatorOption]


class CaseStudyContent(BaseModel):
    """Кейс-стади"""
    title: str
    scenario: str
    documents: List[str] = Field(default_factory=list, description="Текст 'документов' или улик")
    analysis_questions: List[str]
    expected_insight: str


class VisualContent(BaseModel):
    """Визуальный модуль"""
    image_query: str = Field(..., description="Запрос для поиска/генерации изображения")
    description_for_ai: str = Field(..., description="Описание изображения для контекста ИИ")
    question: str


class VideoContent(BaseModel):
    """Видео модуль"""
    video_query: str
    video_url: Optional[str] = None
    observation_task: str = Field(..., description="Задание: что заметить в видео")
    discussion_points: List[str]


class Lesson(BaseModel):
    """Урок (теперь Experience)"""
    title: str
    type: ExperienceType = Field(ExperienceType.TEXT, description="Тип опыта")
    description: str = Field("", description="Краткое описание для превью")
    # content теперь может хранить как строку (для старых), так и JSON сложной структуры
    content: Any = Field(..., description="Основной контент или конфигурация опыта")
    
    duration_minutes: int
    
    # Legacy / Optional fields
    exercises: List[str] = Field(default_factory=list)
    practice_exercises: List[PracticeExercise] = Field(default_factory=list)
    videos: List[VideoMaterial] = Field(default_factory=list)
    additional_materials: List[AdditionalMaterial] = Field(default_factory=list)
    terms: List[TermExplanation] = Field(default_factory=list)


class Module(BaseModel):
    """Модуль курса"""
    title: str
    description: str
    lessons: List[Lesson] = Field(default_factory=list)
    layers: Optional[List[ModuleLayer]] = Field(default=None, description="Слои модуля (для Ideal Format)")
    duration_hours: float


class Course(BaseModel):
    """Полный курс"""
    id: str
    title: str
    description: str
    category: str
    difficulty: CourseDifficulty
    modules: List[Module] = Field(default_factory=list)
    total_duration_hours: float
    learning_objectives: List[str] = Field(default_factory=list)
    passport: Optional[CoursePassport] = Field(default=None, description="Паспорт курса (Ideal Format)")


class LessonPlan(BaseModel):
    """Черновик урока (до детализации)"""
    title: str
    content: Optional[str] = None
    type: ExperienceType = Field(ExperienceType.TEXT, description="Тип опыта")
    duration_minutes: int = Field(30, description="Оценка длительности урока")


class ModulePlan(BaseModel):
    """Черновик модуля для предварительного просмотра"""
    title: str
    description: Optional[str] = None
    lessons: List[LessonPlan] = Field(default_factory=list)


class CourseStructurePlan(BaseModel):
    """Структура курса до финальной генерации"""
    modules: List[ModulePlan] = Field(default_factory=list)

    class Config:
        extra = "allow"  # позволяем лишние поля (например, id с фронта)


class CourseGenerationRequest(BaseModel):
    """Запрос на генерацию курса"""
    settings: CourseSettings
    structure_override: Optional[CourseStructurePlan] = Field(
        None,
        description="Опциональная предварительно отредактированная структура курса",
    )
    reference_files: Optional[List[ReferenceFile]] = Field(
        default=None, description="Дополнительные файлы для учета при генерации"
    )


class CourseGenerationResponse(BaseModel):
    """Ответ с сгенерированным курсом"""
    success: bool
    course: Optional[Course] = None
    error: Optional[str] = None
    message: Optional[str] = None


class ExerciseCheckRequest(BaseModel):
    """Запрос на проверку практического задания ИИ"""
    course_title: str
    lesson_title: str
    exercise_title: str
    exercise_description: Optional[str] = None
    user_answer: str
    language: Optional[str] = Field("ru", description="Язык ответа пользователя")


class ExerciseCheckResult(BaseModel):
    """Результат проверки практического задания"""
    score: int = Field(..., ge=0, le=100, description="Оценка в процентах")
    verdict: str = Field(..., description="Краткий вывод (зачтено / нужно доработать)")
    strengths: List[str] = Field(default_factory=list, description="Что сделано хорошо")
    improvements: List[str] = Field(default_factory=list, description="Что можно улучшить")
    ai_feedback: str = Field(..., description="Развёрнутый комментарий ИИ на человеческом языке")


class ExerciseCheckResponse(BaseModel):
    """Ответ сервиса проверки заданий"""
    success: bool
    result: Optional[ExerciseCheckResult] = None
    error: Optional[str] = None


class ChatMessage(BaseModel):
    """Сообщение в чате с ИИ-ассистентом"""
    role: str = Field(..., description="system | user | assistant")
    content: str


class UserContext(BaseModel):
    """Краткие данные о пользователе, которые можно передать ассистенту"""
    name: Optional[str] = None
    goals: Optional[List[str]] = None
    current_courses: Optional[List[str]] = None
    preferred_topics: Optional[List[str]] = None


class AssistantChatRequest(BaseModel):
    """Запрос к личному ИИ-ассистенту"""
    message: str
    user_context: Optional[UserContext] = None
    history: Optional[List[ChatMessage]] = None
    language: Optional[str] = Field("ru", description="Желаемый язык ответа")


class AssistantChatResponse(BaseModel):
    """Ответ ассистента в чате"""
    success: bool
    reply: Optional[str] = None
    error: Optional[str] = None


class TestQuestion(BaseModel):
    """Вопрос теста"""
    question: str
    options: List[str] = Field(..., description="Список вариантов ответа (4 варианта)")
    correct: int = Field(..., ge=0, le=3, description="Индекс правильного ответа (0-3)")
    explanation: str = Field(..., description="Объяснение правильного ответа")


class ModuleTest(BaseModel):
    """Тест для модуля"""
    tests: List[TestQuestion] = Field(..., description="Список вопросов теста (2-3 вопроса)")


class ModuleTestRequest(BaseModel):
    """Запрос на генерацию теста для модуля"""
    course_title: str
    course_difficulty: str
    module_title: str
    module_description: str
    lessons: List[Dict[str, Any]] = Field(..., description="Список уроков модуля")


class ModuleTestResponse(BaseModel):
    """Ответ с тестом для модуля"""
    success: bool
    test: Optional[ModuleTest] = None
    error: Optional[str] = None


class CourseStructureResponse(BaseModel):
    """Ответ с предварительной структурой курса"""
    success: bool
    structure: Optional[CourseStructurePlan] = None
    error: Optional[str] = None


# ===== Clarifying Questions for Course Wizard =====

class ClarifyingQuestion(BaseModel):
    """Уточняющий вопрос для создания курса"""
    id: str
    question: str
    type: str = Field("text", description="text, choice, or scale")
    options: Optional[List[str]] = Field(None, description="Варианты для choice типа")
    placeholder: Optional[str] = Field(None, description="Подсказка для text типа")
    required: bool = False


class ClarifyingQuestionsRequest(BaseModel):
    """Запрос на генерацию уточняющих вопросов"""
    topic: str = Field(..., description="Тема курса")
    target_audience: Optional[str] = Field(None, description="Целевая аудитория")


class ClarifyingQuestionsResponse(BaseModel):
    """Ответ с уточняющими вопросами"""
    success: bool
    questions: Optional[List[ClarifyingQuestion]] = None
    error: Optional[str] = None