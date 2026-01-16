"""Clarifying Questions Agent for course generation"""
import os
import json
from openai import AsyncOpenAI
from typing import List, Dict, Any

class ClarifyingQuestionsAgent:
    """Agent that generates clarifying questions to improve course generation."""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    async def generate_questions(
        self, 
        topic: str, 
        target_audience: str | None = None,
        num_questions: int = 6
    ) -> List[Dict[str, Any]]:
        """
        Generate clarifying questions based on the course topic.
        
        Returns a list of questions with:
        - id: unique identifier
        - question: the question text
        - type: 'text', 'choice', or 'scale'
        - options: list of options (for 'choice' type)
        - placeholder: hint text (for 'text' type)
        - required: whether the question is required
        """
        
        system_prompt = """Ты — помощник для создания образовательных курсов. 
Твоя задача — сгенерировать уточняющие вопросы, которые помогут создать идеальный курс.

ПРАВИЛА:
1. Генерируй от 5 до 8 вопросов
2. Вопросы должны быть конкретными и полезными
3. Используй СМЕШАННЫЕ типы вопросов:
   - "choice" — выбор из вариантов (для уровня, формата, целей)
   - "text" — свободный ввод (для специфических пожеланий, контекста)
4. Первые 2-3 вопроса должны быть обязательными (required: true)
5. Вопросы должны покрывать:
   - Уровень подготовки аудитории
   - Конкретные цели обучения  
   - Формат/интенсивность курса
   - Специфические темы для включения/исключения
   - Практические/теоретические предпочтения

ФОРМАТ ОТВЕТА (JSON массив):
[
  {
    "id": "q1",
    "question": "Текст вопроса",
    "type": "choice" | "text",
    "options": ["Вариант 1", "Вариант 2", ...],  // только для choice
    "placeholder": "Подсказка...",  // только для text
    "required": true | false
  }
]
"""

        user_prompt = f"""Тема курса: "{topic}"
{f'Целевая аудитория: {target_audience}' if target_audience else ''}

Сгенерируй {num_questions} уточняющих вопросов для создания этого курса.
Ответь ТОЛЬКО валидным JSON массивом."""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            result = json.loads(content)
            
            # Handle both array and object with "questions" key
            if isinstance(result, list):
                questions = result
            elif isinstance(result, dict) and "questions" in result:
                questions = result["questions"]
            else:
                questions = []
            
            # Validate and clean up questions
            validated_questions = []
            for i, q in enumerate(questions):
                validated_q = {
                    "id": q.get("id", f"q{i+1}"),
                    "question": q.get("question", ""),
                    "type": q.get("type", "text") if q.get("type") in ["text", "choice", "scale"] else "text",
                    "required": q.get("required", i < 3)  # First 3 are required by default
                }
                
                if validated_q["type"] == "choice" and "options" in q:
                    validated_q["options"] = q["options"]
                elif validated_q["type"] == "text":
                    validated_q["placeholder"] = q.get("placeholder", "Введите ваш ответ...")
                    
                if validated_q["question"]:  # Only add if question text exists
                    validated_questions.append(validated_q)
            
            return validated_questions
            
        except Exception as e:
            # Return fallback questions on error
            return self._get_fallback_questions(topic)
    
    def _get_fallback_questions(self, topic: str) -> List[Dict[str, Any]]:
        """Return fallback questions if AI generation fails."""
        return [
            {
                "id": "q1",
                "question": "Какой уровень подготовки у вашей целевой аудитории?",
                "type": "choice",
                "options": [
                    "Новички — никогда не изучали эту тему",
                    "Базовый уровень — знают основы",
                    "Средний уровень — хотят углубить знания",
                    "Продвинутый — нужны специализированные темы"
                ],
                "required": True
            },
            {
                "id": "q2", 
                "question": "Какова главная цель прохождения курса?",
                "type": "choice",
                "options": [
                    "Получить базовые знания для старта",
                    "Подготовиться к работе/проекту",
                    "Сдать экзамен или сертификацию",
                    "Углубить существующие знания"
                ],
                "required": True
            },
            {
                "id": "q3",
                "question": "Сколько времени планируете уделять обучению в неделю?",
                "type": "choice",
                "options": [
                    "1-2 часа в неделю",
                    "3-5 часов в неделю", 
                    "5-10 часов в неделю",
                    "Более 10 часов в неделю"
                ],
                "required": True
            },
            {
                "id": "q4",
                "question": "Какой формат обучения предпочитаете?",
                "type": "choice",
                "options": [
                    "Больше теории с примерами",
                    "Баланс теории и практики",
                    "Больше практических заданий",
                    "Проектный подход"
                ],
                "required": False
            },
            {
                "id": "q5",
                "question": f"Есть ли конкретные темы в рамках \"{topic}\", которые обязательно нужно включить?",
                "type": "text",
                "placeholder": "Например: работа с API, безопасность, оптимизация...",
                "required": False
            },
            {
                "id": "q6",
                "question": "Дополнительные пожелания к курсу?",
                "type": "text",
                "placeholder": "Любые специфические требования или контекст...",
                "required": False
            }
        ]
