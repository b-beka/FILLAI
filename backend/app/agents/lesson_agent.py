"""Агент для детализации уроков"""
from langchain_core.prompts import ChatPromptTemplate
from app.agents.llm import make_llm
from typing import Dict, Any, List
import json
import os


class LessonDetailAgent:
    """Агент, отвечающий за создание детального содержания уроков"""
    
    def __init__(self, model_name: str = None, temperature: float = 0.7):
        if model_name is None:
            model_name = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
        self.llm = make_llm(model_name, temperature)
        self.prompt_template = ChatPromptTemplate.from_template(
            """Ты - крутой и харизматичный преподаватель который обожает свой предмет! 🎯
Твоя цель - влюбить студентов в тему и сделать обучение настоящим удовольствием!

Название урока: {lesson_title}
Модуль: {module_title}
Курс: {course_title}
Уровень сложности: {difficulty}
Целевая аудитория: {target_audience}
Краткое описание: {lesson_summary}

🔴 КРИТИЧЕСКИ ВАЖНО - РЕФЕРЕНСНЫЕ ФАЙЛЫ 🔴
{reference_files_context}

ТЫ ДОЛЖЕН:
- СТРОГО следовать содержанию референсных файлов
- Использовать конкретные примеры, термины и концепции из файлов
- Не добавлять информацию, которой нет в файлах (кроме базовых объяснений для начинающих)
- Если в файлах есть код - включи его в урок с объяснениями
- Если в файлах есть диаграммы/схемы - опиши их или создай аналогичные в Mermaid

ВАЖНО! Создай ПРИКОЛЬНОЕ и УВЛЕКАТЕЛЬНОЕ содержание урока в формате MARKDOWN! 

✨ ФОРМАТ MARKDOWN ✨
Используй богатые возможности markdown для визуализации:

**Заголовки:**
- # Главный заголовок (используй эмоджи)
- ## Подзаголовки для секций
- ### Для подтем

**Текстовое форматирование:**
- **Жирный текст** для ключевых понятий
- *Курсив* для акцентов
- `код` для технических терминов
- > Цитаты для важных мыслей

**Списки:**
- Маркированные списки для перечислений
- 1. Нумерованные для шагов
- [ ] Чекбоксы для задач

**Таблицы:**
Обязательно используй таблицы для сравнений, классификаций, примеров:

| Концепция | Описание | Аналогия из жизни |
|-----------|----------|------------------|
| Пример 1  | Что это  | Как в Netflix    |

**Блоки кода:**
```язык
код с подсветкой синтаксиса
```

**Специальные блоки (callouts):**
> 💡 **Совет:** Полезная подсказка для студента
> 
> ⚠️ **Важно:** Критически важная информация
> 
> ✅ **На заметку:** Интересный факт
> 
> ❌ **Частая ошибка:** Чего избегать

**Диаграммы Mermaid** (когда нужно показать процесс/связи):
```mermaid
graph LR
    A[Начало] --> B[Процесс]
    B --> C[Результат]
```

📚 СТРУКТУРА КОНТЕНТА 📚

1. **Крутое введение** (1-2 абзаца)
   - Зацепи внимание! 
   - Почему это круто? 
   - Где используется в реальной жизни?

2. **Основная теория** (разбей на подсекции с ##)
   - Используй таблицы для классификации
   - Добавь примеры кода где уместно
   - Используй callout-блоки для советов
   - Диаграммы для визуализации процессов

3. **Практические примеры** 
   - Реальные кейсы с кодом
   - Пошаговые инструкции
   - "Попробуй сам" секции

4. **Выводы и польза** (1 абзац)
   - Что студент получил?
   - Где пригодится?

5. **Практические упражнения**
   - 3-5 заданий с четкими инструкциями

💪 ПРАВИЛА ДЛЯ КОНТЕНТА 💪
- ✅ Используй РАЗГОВОРНЫЙ тон (как объясняешь другу)
- ✅ Добавляй эмоджи для позитива 🚀💡🎨
- ✅ Используй РЕАЛЬНЫЕ примеры (Instagram, Netflix, кофе, пицца)
- ✅ Короткие предложения и параграфы
- ✅ Мотивируй ("Ты справишься!", "Это проще чем кажется!")
- ✅ Используй яркие метафоры
- ✅ ОБЯЗАТЕЛЬНО используй минимум 2 таблицы
- ✅ Добавь минимум 3 callout-блока
- ❌ НЕ добавляй ссылки на видео (видео обрабатываются отдельно!)
- ❌ Избегай сухих академических формулировок

Верни ТОЛЬКО валидный JSON без дополнительных комментариев:
{{
    "content": "MARKDOWN содержание урока со всеми элементами: заголовками ##, таблицами, callouts > 💡, блоками кода ```python, диаграммами ```mermaid. Минимум 800 слов. БЕЗ ссылок на YouTube!",
    "exercises": [
        "Упражнение 1: интересное описание задания",
        "Упражнение 2: практическое применение",
        "Упражнение 3: творческое задание"
    ],
    "practice_exercises": [
        {{
            "title": "🎯 Название задания",
            "description": "Подробное описание с пошаговыми инструкциями",
            "difficulty": "easy|medium|hard",
            "estimated_time": "30 минут",
            "solution_hint": "Дружелюбная подсказка"
        }}
    ],
    "terms": [
        {{
            "term": "Термин",
            "explanation": "Простое объяснение с примером из жизни"
        }}
    ]
}}"""
        )
    
    async def generate_lesson_details(
        self, 
        lesson_title: str,
        module_title: str,
        course_title: str,
        difficulty: str,
        target_audience: str,
        lesson_summary: str,
        reference_files: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Генерирует детальное содержание урока"""
        chain = self.prompt_template | self.llm
        
        # Формируем контекст референсных файлов
        if reference_files:
            reference_context = "\n\n".join(
                f"=== ФАЙЛ: {item.get('name', 'unnamed')} ===\n{item.get('content', '')}"
                for item in reference_files
            )
            reference_context = f"РЕФЕРЕНСНЫЕ ФАЙЛЫ ДЛЯ ИСПОЛЬЗОВАНИЯ В УРОКЕ:\n\n{reference_context}\n\nСТРОГО СЛЕДУЙ ЭТОМУ МАТЕРИАЛУ!"
        else:
            reference_context = "Референсные файлы не предоставлены. Используй общие знания по теме."
        
        response = await chain.ainvoke({
            "lesson_title": lesson_title,
            "module_title": module_title,
            "course_title": course_title,
            "difficulty": difficulty,
            "target_audience": target_audience,
            "lesson_summary": lesson_summary,
            "reference_files_context": reference_context
        })
        
        content = response.content.strip()
        
        # Убираем markdown код блоки если есть
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        try:
            details = json.loads(content)
            return details
        except json.JSONDecodeError as e:
            print(f"Ошибка парсинга JSON урока: {e}")
            return {
                "content": f"Содержание урока '{lesson_title}'. {lesson_summary}",
                "exercises": [
                    f"Практическое упражнение 1 по теме '{lesson_title}'",
                    f"Практическое упражнение 2 по теме '{lesson_title}'",
                    f"Практическое упражнение 3 по теме '{lesson_title}'"
                ]
            }

