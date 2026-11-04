"""Агент для генерации контента различных типов опыта (Experience Types)"""
from typing import Dict, Any, List
from langchain_core.prompts import ChatPromptTemplate
from app.agents.llm import make_llm
import asyncio
import json
import os

import openai
from app.models import ExperienceType

class ExperienceAgent:
    """Агент, генерирующий специфичный контент для разных типов опыта"""

    def __init__(self, model_name: str = None, temperature: float = 0.7):
        if model_name is None:
            model_name = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
        self.llm = make_llm(model_name, temperature)
        
        # --- PROMPTS ---
        
        # 1. INTERACTIVE TUTOR
        self.tutor_prompt = ChatPromptTemplate.from_template(
            """Ты - идеальный персональный репетитор.
Твоя задача - подготовить вводный материал для интерактивного урока.

Тема урока: {title}
Курс: {course_title}
Контекст: {summary}
Аудитория: {target_audience}

Создай JSON объект для Interactive Tutor:
{{
    "concept_explanation": "Краткое, емкое и харизматичное объяснение сути темы (до 300 слов). Используй аналогии. Говори как эксперт-друг.",
    "character_persona": "Описание роли ИИ (например: 'Строгий, но справедливый Senior Developer' или 'Эмпатичный психолог')",
    "initial_question": "Первый вовлекающий вопрос студенту, чтобы проверить понимание или начать дискуссию.",
    "key_points": ["Главный тезис 1", "Главный тезис 2", "Главный тезис 3"]
}}"""
        )

        # 2. SIMULATOR
        self.simulator_prompt = ChatPromptTemplate.from_template(
            """Ты - создатель бизнес-симуляций и ролевых игр.
Задача: Создать сценарий для симулятора принятия решений.

Тема: {title}
Курс: {course_title}
Суть этапа: {summary}

Создай JSON объект для Simulator:
{{
    "situation": "Описание ситуации, в которой оказывается студент. Будь конкретен.",
    "context": "Дополнительные детали (ресурсы, время, условия).",
    "role": "Кого играет студент (CEO, Junior Dev, Детектив...)",
    "options": [
        {{
            "text": "Вариант действия 1 (Правильный или интересный)",
            "feedback": "Что происходит сразу после этого действия",
            "is_correct": true,
            "consequence": "Долговременные последствия этого выбора"
        }},
        {{
            "text": "Вариант действия 2 (Ошибочный или рискованный)",
            "feedback": "Реакция мира на это действие",
            "is_correct": false,
            "consequence": "Почему это привело к проблемам"
        }}
    ]
}}
В options должно быть 3-4 варианта."""
        )

        # 3. CASE STUDY
        self.case_prompt = ChatPromptTemplate.from_template(
            """Ты - автор кейс-метода (как в Harvard Business School).
Задача: Написать мини-кейс для анализа.

Тема: {title}
Курс: {course_title}
Суть: {summary}

Создай JSON объект Case Study:
{{
    "title": "Интригующее название кейса",
    "scenario": "Детальное описание истории/проблемы (Storytelling). 200-300 слов.",
    "documents": [
        "Текст 'документа' (например, Email от клиента, Лог сервера, Выписка из счета)",
        "Еще один 'артефакт' для анализа"
    ],
    "analysis_questions": ["Вопрос 1 для размышления", "Вопрос 2"],
    "expected_insight": "Какой вывод должен сделать студент после анализа."
}}"""
        )
        
        # 4. VISUAL REASONING
        self.visual_prompt = ChatPromptTemplate.from_template(
            """Ты - эксперт по визуальному обучению.
Задача: Придумать задание, основанное на изображении (график, схема, фото).
Само изображение мы сгенерируем или найдем, тебе нужно описать ЧТО искать и что спрашивать.

Тема: {title}
Курс: {course_title}
Суть: {summary}

Создай JSON Visual Reasoning:
{{
    "image_query": "Точный запрос для поиска/генерации изображения (на английском для лучшего поиска)",
    "description_for_ai": "Описание изображения, чтобы ИИ понимал контекст",
    "question": "Вопрос к студенту, ответ на который можно дать, только проанализировав изображение."
}}"""
        )
        
        # 5. VIDEO DRIVEN
        self.video_prompt = ChatPromptTemplate.from_template(
            """Ты - методист, использующий видео-анализ.
Задача: Подобрать тему видео и задание к нему.

Тема: {title}
Курс: {course_title}
Суть: {summary}

Создай JSON Video Content:
{{
    "video_query": "Поисковый запрос для YouTube, чтобы найти идеальное видео по этой теме",
    "observation_task": "Задание: на что конкретно обратить внимание при просмотре (фокусировка внимания).",
    "discussion_points": ["Вопрос для обсуждения после просмотра 1", "Вопрос 2"]
}}"""
        )

        # 6. TEXT / CONSPECTUS (Presentation Format)
        self.text_prompt = ChatPromptTemplate.from_template(
            """Ты - профессиональный методист и технический писатель.
Твоя задача - создать КРАСИВЫЙ И ПОДРОБНЫЙ конспект урока в формате Markdown.

Тема урока: {title}
Курс: {course_title}
Краткое содержание: {summary}
Аудитория: {target_audience}

ТРЕБОВАНИЯ К КОНТЕНТУ:
1. Используй заголовки ## и ### для структуры
2. ОБЯЗАТЕЛЬНО включи минимум 1 таблицу для сравнения/данных
3. ОБЯЗАТЕЛЬНО включи минимум 1 диаграмму Mermaid (```mermaid ... ```)
4. Включи 3-5 ключевых фактов в формате > 💡 **Факт:** ...
5. ВАЖНО: Добавляй примеры кода ТОЛЬКО если тема связана с программированием, IT или техническими науками. Для тем вроде истории, маркетинга, искусства - НЕ добавляй код!
6. Используй списки (- или 1.) для структурирования
7. Добавь выделение **жирным** и *курсивом* для акцентов
8. Генерируй минимум 3 практических вопроса с вариантами ответа

СТРУКТУРА КОНСПЕКТА:
## Введение
(Краткое введение в тему, почему это важно)

## Основные концепции
(Главная теория с примерами и таблицами)

## Практическое применение
(Примеры использования, код если применимо)

## Ключевые выводы
(Резюме в виде списка)

Создай JSON объект:
{{
    "content": "Полный текст конспекта в формате Markdown...",
    "practice_exercises": [
        {{
            "question": "Вопрос 1",
            "type": "multiple_choice",
            "options": ["Вариант A", "Вариант B", "Вариант C", "Вариант D"],
            "correct_answer": "Вариант A",
            "explanation": "Объяснение почему это правильный ответ"
        }},
        {{
            "question": "Вопрос 2",
            "type": "multiple_choice",
            "options": ["Вариант A", "Вариант B", "Вариант C", "Вариант D"],
            "correct_answer": "Вариант B",
            "explanation": "Объяснение"
        }},
        {{
            "question": "Вопрос 3",
            "type": "multiple_choice",
            "options": ["Вариант A", "Вариант B", "Вариант C", "Вариант D"],
            "correct_answer": "Вариант C",
            "explanation": "Объяснение"
        }}
    ]
}}"""
        )

    async def generate_experience(self, experience_type: str, context: dict) -> dict:
        """
        Generates content based on the type.
        """
        # Extract variables from context
        title = context.get('title', 'Lesson')
        course_title = context.get('course_title', 'Course')
        summary = context.get('summary', '')
        target_audience = context.get('target_audience', 'Students')
        difficulty = context.get('difficulty', 'intermediate')

        if experience_type == 'interactive_tutor':
            chain = self.tutor_prompt | self.llm
        elif experience_type == 'simulator':
            chain = self.simulator_prompt | self.llm
        elif experience_type == 'case_study':
            chain = self.case_prompt | self.llm
        elif experience_type == 'visual_reasoning':
            chain = self.visual_prompt | self.llm
        elif experience_type == 'video_driven':
            chain = self.video_prompt | self.llm
        elif experience_type == 'text':
            chain = self.text_prompt | self.llm
        else:
            # Fallback for PRACTICE, TEXT, HYBRID - use text prompt (conspectus + practice)
            chain = self.text_prompt | self.llm 

        try:
            response = await chain.ainvoke({
                "title": title,
                "course_title": course_title,
                "summary": summary,
                "target_audience": target_audience,
                "difficulty": difficulty
            })
            
            content = response.content.strip()
            # Clean Markdown
            if content.startswith("```json"): content = content[7:]
            if content.startswith("```"): content = content[3:]
            if content.endswith("```"): content = content[:-3]
            content = content.strip()
            
            return json.loads(content)
            
        except (openai.APIError, asyncio.TimeoutError):
            # Ошибки провайдера (429, таймаут) не прячем: иначе получится «успешный» курс с пустыми уроками
            raise
        except json.JSONDecodeError as e:
            print(f"Error generating experience {experience_type}: {e}")
            # Fallback structure
            return {
                "error": "Failed to generate structured content",
                "raw_content": f"Content for {title}. {summary}"
            }
