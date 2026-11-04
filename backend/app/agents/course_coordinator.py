"""Координатор мультиагентной системы для создания курсов"""
from typing import Dict, Any, List
from app.agents.course_agent import CourseStructureAgent
from app.agents.lesson_agent import LessonDetailAgent
from app.agents.experience_agent import ExperienceAgent
from app.agents.material_search_agent import MaterialSearchAgent
from app.agents.layer_agent import LayerAgent
from app.agents.passport_agent import PassportAgent
from app.agents.image_generator_agent import ImageGeneratorAgent
from app.models import (
    CourseSettings, Course, Module, Lesson, CourseDifficulty,
    VideoMaterial, AdditionalMaterial, PracticeExercise,
    CoursePassport, ModuleLayer, ModuleLayerType
)
import asyncio
import json
import uuid

class CourseCoordinator:
    """Координирует работу агентов для создания полного курса"""
    
    def __init__(self):
        self.structure_agent = CourseStructureAgent()
        # self.lesson_agent = LessonDetailAgent() # Deprecated/Backup
        self.experience_agent = ExperienceAgent()
        self.material_agent = MaterialSearchAgent()
        self.layer_agent = LayerAgent()
        self.passport_agent = PassportAgent()
        self.image_agent = ImageGeneratorAgent()
    
    async def generate_course(
        self,
        settings: CourseSettings,
        structure_override: Dict[str, Any] | None = None
    ) -> Course:
        """Генерирует полный курс используя мультиагентную систему (Ideal Format)"""
        
        # 1. Запуск генерации паспорта
        passport_task = self.passport_agent.generate_passport(settings.title, settings.target_audience)
        
        # 2. Получение или генерация структуры
        settings_dict = settings.model_dump()
        if structure_override:
            if hasattr(structure_override, "model_dump"):
                structure = structure_override.model_dump()
            else:
                structure = structure_override
        else:
            structure = await self.structure_agent.generate_structure(settings_dict)
            
        # 3. Ожидание паспорта
        passport_data = await passport_task
        passport = CoursePassport(**passport_data)
        passport_context_str = json.dumps(passport_data, ensure_ascii=False)
        
        # 4. Генерация ОПЫТА (Experiences) для каждого модуля и урока
        modules = []
        total_duration = 0
        
        generate_tasks = []
        
        for module_data in structure.get("modules", []):
            module_title = module_data.get("title", "Модуль")
            module_description = module_data.get("description", "")
            lessons_data = module_data.get("lessons", [])
            
            # Задача для генерации модуля (все уроки параллельно)
            task = self._generate_module_content(
                module_title, 
                lessons_data, 
                settings.title, 
                settings.target_audience, 
                settings.difficulty
            )
            generate_tasks.append((module_data, task))
            
        # Выполнение задач
        results = await asyncio.gather(*[t for _, t in generate_tasks])
        
        for (module_data, _), lessons_list in zip(generate_tasks, results):
            module_title = module_data.get("title", "Модуль")
            module_description = module_data.get("description", "")
            
            module = Module(
                title=module_title,
                description=module_description,
                lessons=lessons_list,
                duration_hours=sum(l.duration_minutes for l in lessons_list) / 60.0
            )
            modules.append(module)
            total_duration += module.duration_hours
        
        # 5. Сборка курса
        category = settings.custom_category_name or "Общее"
        
        return Course(
            id=self._generate_course_id(settings.title),
            title=settings.title,
            description=settings.description or passport.target_result,
            category=category,
            difficulty=settings.difficulty,
            modules=modules,
            total_duration_hours=round(total_duration, 1),
            learning_objectives=settings.learning_objectives or [],
            passport=passport
        )

    async def _generate_module_content(
        self, 
        module_title: str, 
        lessons_data: List[Dict], 
        course_title: str, 
        target_audience: str,
        difficulty: str
    ) -> List[Lesson]:
        """Генерирует контент для всех уроков модуля"""
        generated_lessons = []
        
        for lesson_info in lessons_data:
            l_title = lesson_info.get("title", "Lesson")
            l_summary = lesson_info.get("content", "") # Short summary from structure
            l_type = lesson_info.get("type", "text")
            l_duration = lesson_info.get("duration_minutes", 30)
            
            # Генерируем специфичный контент
            # Генерируем специфичный контент
            content_json = await self.experience_agent.generate_experience(
                experience_type=l_type,
                context={
                    "title": l_title,
                    "course_title": course_title,
                    "summary": l_summary,
                    "target_audience": target_audience,
                    "difficulty": difficulty
                }
            )
            
            # Поиск материалов (видео) для ВСЕХ типов уроков
            # User request: "1 video... corresponding to module/lesson"
            videos = []
            images = []
            try:
                # Use find_materials_for_lesson which generates queries first
                materials = await self.material_agent.find_materials_for_lesson(
                    lesson_title=l_title,
                    course_title=course_title,
                    difficulty=difficulty,
                    target_audience=target_audience,
                    lesson_summary=l_summary
                )
                
                if materials:
                    if "videos" in materials:
                        found_videos = materials["videos"]
                        # Take only 1 video as requested
                        if found_videos:
                            videos = [VideoMaterial(**found_videos[0])]
                    
                    if "images" in materials:
                        images = materials["images"]
            except Exception as e:
                print(f"Error finding videos for lesson {l_title}: {e}")
            
            # Создаем объект урока (Experience)
            lesson = Lesson(
                title=l_title,
                type=l_type, # Pydantic will validate enum
                description=l_summary,
                content=content_json, # Validated as Any
                duration_minutes=l_duration,
                videos=videos,
                images=images
            )
            generated_lessons.append(lesson)
            
        return generated_lessons
    
    def _create_synthetic_lesson_content(self, layers: List[ModuleLayer]) -> str:
        """Создает Markdown-представление слоев для старого интерфейса"""
        md = []
        for layer in layers:
            md.append(f"# {layer.title} ({layer.type.value.upper()})")
            
            c = layer.content
            if isinstance(c, dict):
                if layer.type == ModuleLayerType.MEANING:
                    md.append(f"**Зачем:** {c.get('why_it_matters', '')}\n")
                    md.append(f"**Риски:** {c.get('what_if_not', '')}\n")
                    md.append(f"**Сдвиг:** {c.get('thinking_shift', '')}\n")
                
                elif layer.type == ModuleLayerType.CORE:
                    for a in c.get('assertions', []):
                        md.append(f"### {a.get('statement')}")
                        md.append(f"{a.get('explanation')}")
                        md.append(f"> **Пример**: {a.get('example')}")
                        md.append(f"> **Миф**: {a.get('counter_example')}\n")
                        
                elif layer.type == ModuleLayerType.SIMULATION:
                    md.append(f"**Сценарий:** {c.get('scenario')}")
                    md.append(f"**Роль:** {c.get('role')}")
                    md.append("\n**Выборы:**")
                    for opt in c.get('options', []):
                        md.append(f"- {opt.get('action')} -> {opt.get('consequence')}")

                elif layer.type == ModuleLayerType.PRACTICE:
                    md.append(f"**Задание:** {c.get('task')}")
                    md.append("\n**Критерии:**")
                    for crit in c.get('criteria', []):
                        md.append(f"- {crit}")

                elif layer.type == ModuleLayerType.CONTROL:
                    md.append(f"**Вопрос на размышление:** {c.get('question')}")
            else:
                md.append(str(c))
            
            md.append("\n---\n")
        
        return "\n".join(md)

    
    def _generate_course_id(self, title: str) -> str:
        return str(uuid.uuid4())
