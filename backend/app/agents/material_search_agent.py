"""Агент для поиска дополнительных материалов (видео, статьи и т.д.)"""
from langchain_core.prompts import ChatPromptTemplate
from app.agents.llm import make_llm
from typing import List, Dict, Any
import os
try:
    from youtubesearchpython import VideosSearch
except ImportError:
    # Fallback если библиотека не установлена
    VideosSearch = None

try:
    from duckduckgo_search import DDGS
except ImportError:
    print("duckduckgo-search not installed")
    DDGS = None

import json

def normalize_text(value):
    if value is None:
        return None

    if isinstance(value, str):
        return value

    if isinstance(value, list):
        return " ".join(
            item.get("text", "")
            for item in value
            if isinstance(item, dict)
        )

    return str(value)


class MaterialSearchAgent:
    """Агент для поиска релевантных материалов для уроков"""
    
    def __init__(self, model_name: str = None, temperature: float = 0.7):
        if model_name is None:
            model_name = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
        self.llm = make_llm(model_name, temperature)
        self.search_prompt_template = ChatPromptTemplate.from_template(
            """Ты - эксперт по поиску образовательных материалов. 

Для урока по теме "{lesson_title}" в курсе "{course_title}" (уровень: {difficulty}, аудитория: {target_audience}) создай оптимальные поисковые запросы для YouTube и других источников.

Создай 3 очень конкретных поисковых запроса для YouTube, чтобы найти обучающие видео именно по этой теме. 
Исключи развлекательный контент, новости или видео не по теме (например, если тема "История России", не должно быть "История Банка России" или "История игрушек").
Добавь слова "лекция", "урок", "образовательное видео", "документальный фильм".

Верни ТОЛЬКО валидный JSON:
{{
    "youtube_queries": [
        "строгий поисковый запрос 1",
        "строгий поисковый запрос 2",
        "строгий поисковый запрос 3"
    ],
    "image_queries": [
        "описание картинки для поиска 1",
        "описание картинки для поиска 2"
    ],
    "material_suggestions": [
        {{
            "title": "Название материала",
            "type": "article|book|website",
            "description": "Описание почему этот материал полезен"
        }}
    ]
}}"""
        )
    
    async def generate_search_queries(
        self,
        lesson_title: str,
        course_title: str,
        difficulty: str,
        target_audience: str,
        lesson_summary: str
    ) -> Dict[str, Any]:
        """Генерирует поисковые запросы для материалов"""
        chain = self.search_prompt_template | self.llm
        
        response = await chain.ainvoke({
            "lesson_title": lesson_title,
            "course_title": course_title,
            "difficulty": difficulty,
            "target_audience": target_audience,
            "lesson_summary": lesson_summary
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
            queries = json.loads(content)
            return queries
        except json.JSONDecodeError as e:
            print(f"Ошибка парсинга JSON поисковых запросов: {e}")
            # Возвращаем базовые запросы
            return {
                "youtube_queries": [
                    f"{lesson_title} {course_title}",
                    f"{lesson_title} tutorial",
                    f"{lesson_title} объяснение"
                ],
                "material_suggestions": []
            }
    async def search_youtube_videos(self, queries: List[str], max_results: int = 3) -> List[Dict[str, Any]]:
        """Ищет видео на YouTube по списку запросов"""
        unique_videos = {}
        
        if VideosSearch is None:
            print("Библиотека youtubesearchpython не установлена")
            return []

        for query in queries:
            try:
                # Добавляем "tutorial" или "education" для улучшения качества
                search = VideosSearch(query, limit=2)
                results = search.result()
                
                if not results or 'result' not in results:
                    continue

                for video in results['result']:
                    video_id = video.get('id')
                    if not video_id:
                        continue
                        
                    # Basic filtering for irrelevant content
                    title_lower = video.get('title', '').lower()
                    if any(x in title_lower for x in ['gameplay', 'trailer', 'song', 'music video', 'cover', 'реакция', 'reaction']):
                        continue
                        
                    if video_id not in unique_videos:
                        unique_videos[video_id] = {
                            "title": video.get('title'),
                            "url": video.get('link'),
                            "thumbnail": video.get('thumbnails', [{}])[0].get('url'),
                            "duration": video.get('duration'),
                            "views": video.get('viewCount', {}).get('short')
                        }
            except Exception as e:
                print(f"Ошибка поиска YouTube для запроса '{query}': {e}")
                continue
                
        return list(unique_videos.values())[:max_results]

    async def search_images(self, query: str, max_results: int = 3) -> List[str]:
        """Ищет изображения через DuckDuckGo"""
        try:
            from duckduckgo_search import DDGS
            
            results = []
            with DDGS() as ddgs:
                # keywords to ensure educational/diagram content
                enhanced_query = f"{query} educational diagram schema or photo"
                ddgs_gen = ddgs.images(
                    enhanced_query,
                    region="wt-wt",
                    safesearch="on",
                    size=None,
                    color=None,
                    type_image=None,
                    layout=None,
                    license_image=None,
                )
                
                # Take first N results
                for i, r in enumerate(ddgs_gen):
                    if i >= max_results:
                        break
                    if r.get('image'):
                        results.append(r['image'])
                        
            return results
        except ImportError:
            print("duckduckgo-search not installed")
            return []
        except Exception as e:
            print(f"Error searching images: {e}")
            return []    

    async def find_materials_for_lesson(self, lesson_title: str, course_title: str, difficulty: str = "intermediate", target_audience: str = "student", lesson_summary: str = "") -> Dict[str, Any]:
        """Находит видео и изображения для урока"""
        # 1. Генерируем запросы
        search_plan = await self.generate_search_queries(
            lesson_title, 
            course_title, 
            difficulty,
            target_audience,
            lesson_summary
        )
        
        # 2. Ищем видео
        youtube_queries = search_plan.get("youtube_queries", [f"{lesson_title} {course_title}"])
        videos = await self.search_youtube_videos(youtube_queries)
        
        # 3. Ищем изображения (используем лучший запрос или название урока)
        # Choose the most specific query or just lesson title
        image_query = youtube_queries[0] if youtube_queries else f"{lesson_title} {course_title}"
        images = await self.search_images(image_query, max_results=3)
        
        return {
            "videos": videos,
            "images": images,
            "suggestions": search_plan.get("material_suggestions", [])
        }

