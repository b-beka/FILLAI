"""Агент для генерации слоев модуля (Ideal Course Format)"""
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from typing import Dict, Any, List
import json
import os
from app.models import ModuleLayer, ModuleLayerType

class LayerAgent:
    """Агент для генерации слоев модуля"""
    
    def __init__(self, model_name: str = None, temperature: float = 0.7):
        if model_name is None:
            model_name = os.getenv("OPENAI_MODEL", "gpt-4o") # Use smart model for complex layers
        self.llm = ChatOpenAI(model=model_name, temperature=temperature)
        
        self.prompt_template = ChatPromptTemplate.from_template(
            """Ты - архитектор образовательных продуктов высшего класса. 
Твоя задача - спроектировать содержание модуля курса в формате 'Fill AI Ideal Course'.

Курс: {course_title}
Паспорт курса (контекст): {passport_context}
Модуль: {module_title}
Описание модуля: {module_description}

Твоя задача - создать 5 слоев этого модуля. 
ЭТО НЕ УЧЕБНИК. Это трансформация мышления.

СТРУКТУРА СЛОЕВ:

1. **MEANING (Смысл)**
   - Зачем это знать? (Почему без этого нельзя?)
   - Что будет, если этого не знать? (Риски, потери)
   - Какой сдвиг в мышлении происходит?

2. **CORE (Ядро концепта)**
   - 3-5 Утверждений (Assertions), а не фактов.
   - Каждое утверждение должно быть спорным или неочевидным, но истинным.
   - Для каждого: Утверждение, Объяснение, Пример, Контрпример (Миф).

3. **SIMULATION (Симуляция)**
   - Короткий сценарий (Ситуация).
   - Кем является ученик?
   - Выбор: 2-3 варианта действий.
   - Последствия для каждого выбора (почему это привело к успеху или краху).

4. **PRACTICE (Практика)**
   - Диагностическое задание (не тест).
   - Задача: определи ошибку, составь план, оцени ситуацию.
   - Критерии оценки (что отличает профи от новичка).

5. **CONTROL (Контроль)**
   - Один глубокий вопрос на понимание сути.
   - НЕ на память. На понимание причинно-следственных связей.

ВЕРНИ JSON В СЛЕДУЮЩЕМ ФОРМАТЕ:
{{
    "layers": [
        {{
            "type": "meaning",
            "title": "Смысл модуля",
            "content": {{
                "why_it_matters": "...",
                "what_if_not": "...",
                "thinking_shift": "..."
            }}
        }},
        {{
            "type": "core",
            "title": "Концептуальное ядро",
            "content": {{
                "assertions": [
                    {{
                        "statement": "...",
                        "explanation": "...",
                        "example": "...",
                        "counter_example": "..."
                    }}
                ]
            }}
        }},
        {{
            "type": "simulation",
            "title": "Симуляция",
            "content": {{
                "scenario": "...",
                "role": "...",
                "options": [
                    {{
                        "action": "...",
                        "consequence": "..."
                    }}
                ]
            }}
        }},
        {{
            "type": "practice",
            "title": "Практика",
            "content": {{
                "task": "...",
                "criteria": ["..."]
            }}
        }},
        {{
            "type": "control",
            "title": "Контроль",
            "content": {{
                "question": "..."
            }}
        }}
    ]
}}
"""
        )

    async def generate_layers(
        self,
        course_title: str,
        module_title: str,
        module_description: str,
        passport_context: str
    ) -> List[Dict[str, Any]]:
        """Генерирует слои для модуля"""
        chain = self.prompt_template | self.llm
        
        response = await chain.ainvoke({
            "course_title": course_title,
            "module_title": module_title,
            "module_description": module_description,
            "passport_context": passport_context
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
            return data.get("layers", [])
        except json.JSONDecodeError as e:
            print(f"Error parsing layers JSON: {e}")
            # Fallback mock data
            return []
