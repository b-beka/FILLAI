// Адаптер для преобразования данных из API в формат frontend
import { ApiCourse, ApiModule, ApiLesson } from './apiClient';
import { Course, Module, Lesson } from '@/data/mockStore';

export function adaptApiCourseToCourse(apiCourse: ApiCourse): Course {
  return {
    id: apiCourse.id,
    title: apiCourse.title,
    description: apiCourse.description || '',
    category: apiCourse.category_id || '',
    format: apiCourse.format || 'Онлайн',
    level: apiCourse.level || 'Beginner',
    duration: apiCourse.duration || '4 недели',
    intensity: apiCourse.intensity || 'Средняя',
    goal: apiCourse.goal || '',
    createdAt: apiCourse.created_at,
    isPaid: apiCourse.is_paid || false,
    price: apiCourse.price,
    isPublic: apiCourse.is_public !== false,
    isPrivate: apiCourse.is_private || false,
    createdBy: apiCourse.created_by || 'Неизвестный автор',
    modules: apiCourse.modules ? apiCourse.modules.map(adaptApiModuleToModule) : [],
    passport: apiCourse.passport,
  };
}

export function adaptApiModuleToModule(apiModule: ApiModule): Module {
  return {
    id: apiModule.id,
    title: apiModule.title,
    description: apiModule.description,
    lessons: apiModule.lessons ? apiModule.lessons.map(adaptApiLessonToLesson) : [],
    layers: apiModule.layers,
  };
}

export function adaptApiLessonToLesson(apiLesson: ApiLesson): Lesson {
  let content: any = apiLesson.content || '';
  let videos: any[] = [];
  let images: string[] = [];
  let practice_exercises: any[] = [];
  let additional_materials: any[] = [];
  let slides: any[] = []; // Fix: Declare slides variable

  // Attempt to parse structured content from JSON string (stored in DB Text column)
  if (typeof apiLesson.content === 'string' && (apiLesson.content.trim().startsWith('{') || apiLesson.content.trim().startsWith('['))) {
    try {
      const parsed = JSON.parse(apiLesson.content);
      if (typeof parsed === 'object' && parsed !== null) {

        // 1. Check for nested structure from our backend serialization
        if (parsed.content) {
          content = parsed.content; // The actual lesson content/json
        } else {
          content = parsed; // Fallback
        }

        // 2. Extract videos
        if (Array.isArray(parsed.videos)) {
          videos = parsed.videos;
        }

        // 3. Extract Images
        if (Array.isArray(parsed.images)) {
          images = parsed.images;
        }

        // 4. Extract Practice
        if (Array.isArray(parsed.practice_exercises)) {
          practice_exercises = parsed.practice_exercises;
        }

        // 4. Extract Additional Materials
        if (Array.isArray(parsed.additional_materials)) {
          additional_materials = parsed.additional_materials;
        }

        // Parse slides if available
        if (Array.isArray(parsed.slides)) {
          slides = parsed.slides;
          // If slides are present, we assume this is a slide-based lesson and return early
          return {
            id: apiLesson.id + '', // Enforce string
            title: apiLesson.title,
            duration_minutes: apiLesson.duration_minutes || 15,
            completed: (apiLesson as any).is_completed || false, // Cast to any to access potentially missing prop
            type: (apiLesson.type?.toLowerCase() as any) || 'text',
            content: parsed.content || '',
            slides: slides,
            videos: parsed.videos || [],
            images: images.length > 0 ? images : apiLesson.images || [],
            practice_exercises: parsed.practice_exercises || [],
            additional_materials: parsed.additional_materials || []
          };
        }
      }
    } catch (e) {
      console.error("Failed to parse lesson content JSON", e); // Changed from warn to error
      // Keep content as string
    }
  }

  // Default return if no slides were parsed or parsing failed
  return {
    id: apiLesson.id,
    title: apiLesson.title,
    content: content,
    type: apiLesson.type as any || 'text',
    duration_minutes: apiLesson.duration_minutes,
    videos: videos.length > 0 ? videos : apiLesson.videos || [], // Prefer parsed videos, fallback to apiLesson.videos
    practice_exercises: practice_exercises.length > 0 ? practice_exercises : apiLesson.practice_exercises || [], // Prefer parsed practice, fallback to apiLesson.practice_exercises
    additional_materials: additional_materials.length > 0 ? additional_materials : apiLesson.additional_materials || [], // Prefer parsed additional_materials, fallback to apiLesson.additional_materials
    images: images.length > 0 ? images : apiLesson.images || [], // Prefer parsed images, fallback to apiLesson.images
    slides: slides, // Will be empty array if not parsed
    completed: apiLesson.is_completed || false, // Add completed field
  };
}

export function adaptCourseToApiCourse(course: Partial<Course>): Partial<ApiCourse> {
  return {
    title: course.title,
    description: course.description,
    category_id: course.category,
    format: course.format,
    level: course.level,
    duration: course.duration,
    intensity: course.intensity,
    goal: course.goal,
    is_paid: course.isPaid,
    price: course.price,
    is_public: course.isPublic,
    is_private: course.isPrivate,
  };
}

