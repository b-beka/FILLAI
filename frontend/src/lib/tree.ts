import type { Course } from './api';

// Дерево тем для графа: сфера → подтема → курсы. Глубина строго 2
export interface SubtopicGroup {
  key: string;
  label: string;
  icon: string;
  courses: Course[];
}

export interface SphereGroup {
  key: string;
  label: string;
  icon: string;
  subtopics: SubtopicGroup[];
}

const GENERAL = { key: 'general', label: 'Общее', icon: 'book' };

// Порядок сфер и подтем — по первому появлению курса, чтобы граф не прыгал
export function buildTree(courses: Course[]): SphereGroup[] {
  const spheres = new Map<string, SphereGroup>();

  for (const course of courses) {
    const cat = course.category ?? null;
    // Категория без родителя — старые данные: курс кладём в «Общее», подтема — сама категория
    const parent = cat?.parent ?? null;
    const sphereSrc = parent ? { key: parent.id, label: parent.label, icon: parent.icon || 'book' } : GENERAL;
    const subSrc = cat ? { key: cat.id, label: cat.label, icon: cat.icon || 'book' } : GENERAL;

    let sphere = spheres.get(sphereSrc.key);
    if (!sphere) {
      sphere = { ...sphereSrc, subtopics: [] };
      spheres.set(sphere.key, sphere);
    }
    let sub = sphere.subtopics.find((s) => s.key === subSrc.key);
    if (!sub) {
      sub = { ...subSrc, courses: [] };
      sphere.subtopics.push(sub);
    }
    sub.courses.push(course);
  }

  return Array.from(spheres.values());
}

// Точка веера: index из count вокруг center на расстоянии radius, середина веера смотрит под углом baseAngle
export function fanOut(center: { x: number; y: number }, baseAngle: number, index: number, count: number, radius: number, step = 0.6) {
  const angle = baseAngle + (index - (count - 1) / 2) * step;
  return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
}
