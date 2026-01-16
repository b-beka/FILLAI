"""Агент для создания структуры курса"""
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from typing import Dict, Any, List
import json
import os


class CourseStructureAgent:
    """Агент, отвечающий за создание структуры курса"""
    
    def __init__(self, model_name: str = None, temperature: float = 0.7):
        if model_name is None:
            model_name = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
        self.llm = ChatOpenAI(model=model_name, temperature=temperature)
        self.prompt_template = ChatPromptTemplate.from_template(
            """Ты - ведущий методист и архитектор образовательных треков (Learning Experience Designer). 🎓
Твоя цель - создать не просто "курс", а захватывающее образовательное путешествие!

Параметры курса:
Название: {title}
Описание: {description}
Сложность: {difficulty}
Длительность: {duration_hours} часов
Аудитория: {target_audience}
Цели: {learning_objectives}

🔴 РЕФЕРЕНСЫ:
{reference_files}

ТЫ ДОЛЖЕН создать структуру из Модулей.
Вместо скучных "уроков", используй следующие ТИПЫ ОПЫТА (Experience Types):

1. **interactive_tutor** (ИИ-наставник): Для теории. Объясняет концепции, приводит примеры, задает сократовские вопросы.
2. **simulator** (Симулятор): Для навыков. Сценарий, где ученик принимает решения и видит последствия.
3. **case_study** (Кейс): Для анализа. Реальная ситуация, документы, поиск проблем.
4. **visual_reasoning** (Визуал): Для насмотренности. Работа с графиками, схемами, фото.
5. **practice** (Практика): Кодинг или письменное задание с мгновенной ИИ-проверкой.
6. **video_driven** (Видео-анализ): Анализ видео (подбирается ИИ) с заданиями до и после.

СТРАТЕГИЯ ДИЗАЙНА:
- Чередуй типы! Не делай подряд 3 текстовых урока.
- Начинай модуль с video_driven или interactive_tutor.
- В середине используй simulator или case_study.
- Завершай practice или visual_reasoning.

Верни JSON структуру:
{{
    "modules": [
        {{
            "title": "Название модуля (креативное)",
            "description": "Чему научимся и что сделаем",
            "lessons": [
                {{
                    "title": "Название этапа",
                    "type": "interactive_tutor | simulator | case_study | visual_reasoning | practice | video_driven",
                    "content": "Краткое описание сути этого этапа (о чем будет речь)",
                    "duration_minutes": 20
                }}
            ]
        }}
    ]
}}"""
        )
    
    async def generate_structure(self, course_settings: Dict[str, Any]) -> Dict[str, Any]:
        """Генерирует структуру курса"""
        chain = self.prompt_template | self.llm
        
        learning_objectives_str = "\n".join(
            f"- {obj}" for obj in course_settings.get("learning_objectives", [])
        ) if course_settings.get("learning_objectives") else "Не указаны"

        reference_files = course_settings.get("reference_files") or []
        if reference_files:
            # Полный контент файлов для строгого следования
            reference_summary = "\n\n".join(
                f"=== ФАЙЛ: {item.get('name', 'unnamed')} ===\n{item.get('content', '')}"
                for item in reference_files
            )
            reference_summary = f"ПРЕДОСТАВЛЕНО {len(reference_files)} ФАЙЛОВ:\n\n{reference_summary}\n\nИСПОЛЬЗУЙ ЭТОТ МАТЕРИАЛ КАК ОСНОВУ ДЛЯ КУРСА!"
        else:
            reference_summary = "Референсные файлы не предоставлены. Создай курс на основе общих знаний по теме."
        
        response = await chain.ainvoke({
            "title": course_settings.get("title", ""),
            "description": course_settings.get("description", ""),
            "difficulty": course_settings.get("difficulty", "intermediate"),
            "duration_hours": course_settings.get("duration_hours", 10),
            "target_audience": course_settings.get("target_audience", ""),
            "learning_objectives": learning_objectives_str,
            "reference_files": reference_summary,
        })
        
        # Парсим JSON из ответа
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
            structure = json.loads(content)
            return structure
        except json.JSONDecodeError as e:
            # Если не удалось распарсить, возвращаем базовую структуру
            print(f"Ошибка парсинга JSON: {e}")
            print(f"Содержимое ответа: {content}")
            return self._get_default_structure(course_settings)
    
    def _get_default_structure(self, course_settings: Dict[str, Any]) -> Dict[str, Any]:
        """Возвращает базовую структуру курса при ошибке"""
        duration = course_settings.get("duration_hours", 10)
        modules_count = max(3, min(6, duration // 2))
        
        return {
            "modules": [
                {
                    "title": f"Модуль {i+1}: Введение",
                    "description": "Вводный модуль курса",
                    "lessons": [
                        {
                            "title": f"Урок {j+1}",
                            "type": "interactive_tutor",
                            "content": "Содержание урока",
                            "duration_minutes": 30
                        }
                        for j in range(2)
                    ]
                }
                for i in range(modules_count)
            ]
        }

