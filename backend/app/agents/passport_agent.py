"""Агент для генерации паспорта курса"""
from langchain_core.prompts import ChatPromptTemplate
from app.agents.llm import make_llm
from typing import Dict, Any
import json
import os
from app.models import HallucinationRisk

class PassportAgent:
    """Агент для генерации паспорта курса"""
    
    def __init__(self, model_name: str = None, temperature: float = 0.7):
        if model_name is None:
            model_name = os.getenv("OPENAI_MODEL", "gpt-4o")
        self.llm = make_llm(model_name, temperature)
        
        self.prompt_template = ChatPromptTemplate.from_template(
            """Ты - методолог образовательных продуктов Fill AI.
Твоя задача - создать 'Паспорт курса'. Это не рекламное описание, а честная декларация о продукте.

Тема курса: {topic}
Целевая аудитория: {target_audience}

Заполни следующие поля:
1. **Конечный результат**: Что конкретно человек сможет/поймет? Реалистично.
2. **Уровень мышления**: Какие ментальные модели развивает (стратегическое, системное, критическое...)?
3. **Ограничения**: Чему курс НЕ учит? Где границы применимости?
4. **Глубина**: Оценка от 1 до 10 (где 10 - уровень PhD, 1 - Википедия).
5. **Риск галлюцинаций ИИ**: Насколько тема субъективна или требует факчекинга? (low/medium/high)

ВЕРНИ JSON:
{{
    "target_result": "...",
    "thinking_level": "...",
    "limitations": "...",
    "depth_score": 8,
    "hallucination_risk": "low"
}}
"""
        )

    async def generate_passport(
        self,
        topic: str,
        target_audience: str
    ) -> Dict[str, Any]:
        """Генерирует паспорт курса"""
        chain = self.prompt_template | self.llm
        
        response = await chain.ainvoke({
            "topic": topic,
            "target_audience": target_audience
        })
        
        content = response.content.strip()
        
        # Clean markdown
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        try:
            data = json.loads(content)
            # Validate enum
            if data.get("hallucination_risk") not in ["low", "medium", "high"]:
                data["hallucination_risk"] = "low"
            return data
        except json.JSONDecodeError as e:
            print(f"Error parsing passport JSON: {e}")
            return {
                "target_result": "Базовое понимание темы",
                "thinking_level": "Линейное",
                "limitations": "Курс является обзорным",
                "depth_score": 5,
                "hallucination_risk": "low"
            }
