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

// Сфера курса: родитель категории или сама категория без родителя (это и есть сфера)
function sphereOf(course: Course) {
  const cat = course.category ?? null;
  if (!cat) return null;
  const src = cat.parent ?? cat;
  return { key: src.id, label: src.label, icon: src.icon || 'book' };
}

// Порядок сфер и подтем — по первому появлению курса, чтобы граф не прыгал.
// /my отдаёт новые курсы первыми, поэтому идём от старых к новым
export function buildTree(courses: Course[]): SphereGroup[] {
  const spheres = new Map<string, SphereGroup>();
  const ordered = [...courses].sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
  // Курсы без категории идут в настоящую сферу «Общее», если она уже есть в дереве
  const general = ordered.map(sphereOf).find((s) => s?.label === GENERAL.label) ?? GENERAL;

  for (const course of ordered) {
    const cat = course.category ?? null;
    const sphereSrc = sphereOf(course) ?? general;
    // Курс на сфере или без категории лежит прямо под сферой: ключ подтемы совпадает с ключом сферы
    const subSrc = cat?.parent ? { key: cat.id, label: cat.label, icon: cat.icon || 'book' } : sphereSrc;

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
