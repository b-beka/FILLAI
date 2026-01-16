import { Node, Link } from '@/types/graph';
import { categoriesApi, coursesApi } from '@/services/apiClient';
import { adaptApiCourseToCourse } from '@/services/courseAdapter';

// Generate nodes from categories and courses
export async function generateNodes(): Promise<Node[]> {
  try {
    const [apiCategories, apiCourses] = await Promise.all([
      categoriesApi.list(),
      coursesApi.list()
    ]);

    const adaptedCourses = apiCourses.map(adaptApiCourseToCourse);
    
    // Group courses by category
    const categoriesMap = new Map<string, { id: string; label: string; courses: typeof adaptedCourses }>();
    
    apiCategories.forEach(cat => {
      categoriesMap.set(cat.id, {
        id: cat.id,
        label: cat.label,
        courses: []
      });
    });

    adaptedCourses.forEach(course => {
      const categoryId = course.category || 'other';
      if (!categoriesMap.has(categoryId)) {
        categoriesMap.set(categoryId, {
          id: categoryId,
          label: 'Без категории',
          courses: []
        });
      }
      categoriesMap.get(categoryId)!.courses.push(course);
    });

    const categories = Array.from(categoriesMap.values()).filter((cat) => cat.courses.length > 0);
  const nodes: Node[] = [];

  // Центральный узел "Вы" - корень дерева
  nodes.push({
    id: 'center',
    label: 'Вы',
    type: 'center',
    x: 0, // В центре координат
    y: 0,
    vx: 0,
    vy: 0,
    radius: 60,
    color: '#252525', // Темно-серый для центрального узла
    glowColor: 'rgba(37, 37, 37, 0.4)',
  });

  if (categories.length === 0) {
    // Если нет категорий с курсами, возвращаем только центральный узел
    return nodes;
  }

  // Круговое расположение: категории по кругу вокруг центра, курсы по кругу вокруг своих категорий
  const categoryRadius = 200; // Радиус для категорий
  const courseRadius = 120; // Радиус для курсов вокруг категории
  
  // Располагаем категории по кругу вокруг центра
  const categoryAngleStep = (2 * Math.PI) / categories.length;

  categories.forEach((category, catIndex) => {
    const categoryAngle = catIndex * categoryAngleStep;
    const categoryX = Math.cos(categoryAngle) * categoryRadius;
    const categoryY = Math.sin(categoryAngle) * categoryRadius;

    // Узел группы (категории)
    nodes.push({
      id: category.id,
      label: category.label,
      type: 'primary',
      x: categoryX,
      y: categoryY,
      vx: 0,
      vy: 0,
      radius: 44,
      color: '#22252b',
      glowColor: 'rgba(120, 174, 255, 0.35)', // лёгкое синее свечение для групп
    });

    // Узлы курсов — по кругу вокруг своей категории
    const courseCount = category.courses.length;
    if (courseCount > 0) {
      const courseAngleStep = (2 * Math.PI) / courseCount;
      
      category.courses.forEach((course, courseIndex) => {
        const courseAngle = courseIndex * courseAngleStep;
        const courseX = categoryX + Math.cos(courseAngle) * courseRadius;
        const courseY = categoryY + Math.sin(courseAngle) * courseRadius;

        nodes.push({
          id: course.id,
          label:
            course.title.length > 22
              ? course.title.substring(0, 22) + '...'
              : course.title,
          type: 'sub',
          x: courseX,
          y: courseY,
          vx: 0,
          vy: 0,
          radius: 30,
          color: '#30333a',
          glowColor: 'rgba(144, 238, 144, 0.35)', // мягкое зеленоватое свечение для курсов
        });
      });
    }
  });

  return nodes;
}

// Note: generateNodes and generateLinks are now replaced by adaptApiDataToGraph in graphAdapter.ts
// This file is kept for backward compatibility but the main logic is in graphAdapter.ts
// The graphStore uses adaptApiDataToGraph instead of these functions

