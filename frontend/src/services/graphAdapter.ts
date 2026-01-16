import type { Node as GraphNode, Link } from '@/types/graph';
import { ApiCourse, ApiCategory } from './apiClient';

/**
 * Transforms API data into Graph nodes and links.
 * 
 * Logic adapted from lib/graphData.ts but using dynamic API data.
 */
export function adaptApiDataToGraph(
    courses: ApiCourse[],
    categories: ApiCategory[],
    expandedCategories: Set<string> = new Set()
): { nodes: GraphNode[], links: Link[] } {
    const nodes: GraphNode[] = [];
    const links: Link[] = [];

    // 1. Create Center Node
    nodes.push({
        id: 'center',
        label: 'Вы',
        type: 'center',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 60,
        color: '#252525',
        glowColor: 'rgba(37, 37, 37, 0.4)',
    });

    // Filter categories that have at least one course
    const activeCategories = categories.filter(cat =>
        courses.some(c => c.category_id === cat.id)
    );

    if (activeCategories.length === 0) {
        return { nodes, links };
    }

    // 2. Position Categories (Primary Nodes) in a circle around center
    const categoryRadius = 200;
    const categoryAngleStep = (2 * Math.PI) / activeCategories.length;

    activeCategories.forEach((category, catIndex) => {
        const categoryAngle = catIndex * categoryAngleStep;
        const categoryX = Math.cos(categoryAngle) * categoryRadius;
        const categoryY = Math.sin(categoryAngle) * categoryRadius;

        // Add Category Node
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
            glowColor: 'rgba(120, 174, 255, 0.35)',
        });

        // Link: Center -> Category
        links.push({
            id: `center-${category.id}`,
            source: 'center',
            target: category.id,
            strength: 1,
        });

        // 3. Process Courses for this Category
        const categoryCourses = courses.filter(c => c.category_id === category.id);
        const courseCount = categoryCourses.length;

        if (courseCount > 0) {
            const courseRadius = 120;
            const courseAngleStep = (2 * Math.PI) / courseCount;

            categoryCourses.forEach((course, courseIndex) => {
                const courseAngle = courseIndex * courseAngleStep;
                const courseX = categoryX + Math.cos(courseAngle) * courseRadius;
                const courseY = categoryY + Math.sin(courseAngle) * courseRadius;

                nodes.push({
                    id: course.id,
                    label: truncateLabel(course.title),
                    type: 'sub',
                    x: courseX,
                    y: courseY,
                    vx: 0,
                    vy: 0,
                    radius: 30,
                    color: '#30333a',
                    glowColor: 'rgba(144, 238, 144, 0.35)',
                });

                if (expandedCategories.has(category.id)) {
                    links.push({
                        id: `${category.id}-${course.id}`,
                        source: category.id,
                        target: course.id,
                        strength: 0.8,
                    });
                }
            });
        }
    });

    return { nodes, links };
}

/**
 * Adapts a single course structure into a SEQUENTIAL PATH graph.
 * Modules are arranged in a snake/zigzag path.
 * Lessons branch out from each module when expanded.
 */
export function adaptCourseToGraph(
    course: ApiCourse,
    expandedModules: Set<string> = new Set(),
    completedLessons: Set<string> = new Set()
): { nodes: GraphNode[], links: Link[] } {
    const nodes: GraphNode[] = [];
    const links: Link[] = [];

    if (!course.modules || course.modules.length === 0) return { nodes, links };

    // Sequential layout: zigzag pattern
    const pathWidth = 300;
    const verticalGap = 200;
    const zigzagOffset = pathWidth / 2;

    let prevModId: string | null = null;

    course.modules.forEach((mod, modIndex) => {
        const modId = mod.id || `mod-${modIndex}`;

        const isEven = modIndex % 2 === 0;
        const modX = isEven ? -zigzagOffset : zigzagOffset;
        const modY = modIndex * verticalGap;

        // Locking logic
        let isLocked = false;
        if (modIndex > 0) {
            const prevMod = course.modules![modIndex - 1];
            if (prevMod.lessons && prevMod.lessons.length > 0) {
                const prevLessonsCompleted = prevMod.lessons.every((l, lIdx) =>
                    completedLessons.has(l.id || `lesson-${modIndex - 1}-${lIdx}`)
                );
                if (!prevLessonsCompleted) isLocked = true;
            }
        }

        const allLessonsCompleted = mod.lessons && mod.lessons.length > 0 && mod.lessons.every((l, lIdx) =>
            completedLessons.has(l.id || `lesson-${modIndex}-${lIdx}`)
        );

        const hasStarted = mod.lessons && mod.lessons.some((l, lIdx) =>
            completedLessons.has(l.id || `lesson-${modIndex}-${lIdx}`)
        );

        let status: 'locked' | 'available' | 'completed' | 'started' = 'available';
        if (isLocked) status = 'locked';
        else if (allLessonsCompleted) status = 'completed';
        else if (hasStarted) status = 'started';

        nodes.push({
            id: modId,
            label: truncateLabel(mod.title, 20),
            type: 'primary',
            x: modX,
            y: modY,
            vx: 0,
            vy: 0,
            radius: 55,
            color: isLocked ? '#3f3f46' : (allLessonsCompleted ? '#10b981' : '#2563eb'),
            glowColor: isLocked ? 'transparent' : (allLessonsCompleted ? 'rgba(16, 185, 129, 0.5)' : 'rgba(37, 99, 235, 0.5)'),
            data: { ...mod, nodeType: 'module' },
            locked: isLocked,
            status: status,
            icon: isLocked ? 'Lock' : (allLessonsCompleted ? 'CheckCircle2' : 'BookOpen')
        });

        if (prevModId) {
            links.push({
                id: `path-${prevModId}-${modId}`,
                source: prevModId,
                target: modId,
                strength: 1.2,
            });
        }

        prevModId = modId;

        // Expanded lessons
        if (!isLocked && expandedModules.has(modId) && mod.lessons) {
            const lessonCount = mod.lessons.length;
            const lessonSpread = 180;
            const lessonVerticalOffset = 100;

            mod.lessons.forEach((lesson, lessonIndex) => {
                const lessonId = lesson.id || `lesson-${modIndex}-${lessonIndex}`;

                let lessonIcon = 'FileText';
                if (lesson.content.toLowerCase().includes('video') || (lesson.videos && lesson.videos.length > 0)) lessonIcon = 'Play';
                else if (lesson.title.toLowerCase().includes('quiz') || lesson.title.toLowerCase().includes('test')) lessonIcon = 'HelpCircle';
                else if (lesson.content.toLowerCase().includes('practice')) lessonIcon = 'Target';

                const isLessonCompleted = completedLessons.has(lessonId);

                const lessonOffsetX = (lessonIndex - (lessonCount - 1) / 2) * (lessonSpread / Math.max(lessonCount - 1, 1));
                const lessonX = modX + lessonOffsetX;
                const lessonY = modY + lessonVerticalOffset;

                nodes.push({
                    id: lessonId,
                    label: truncateLabel(lesson.title, 15),
                    type: 'sub',
                    x: lessonX,
                    y: lessonY,
                    vx: 0,
                    vy: 0,
                    radius: 38,
                    color: isLessonCompleted ? '#10b981' : '#f59e0b',
                    glowColor: isLessonCompleted ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)',
                    data: { ...lesson, moduleId: modId, nodeType: 'lesson', index: lessonIndex },
                    status: isLessonCompleted ? 'completed' : 'available',
                    icon: lessonIcon
                });

                links.push({
                    id: `${modId}-${lessonId}`,
                    source: modId,
                    target: lessonId,
                    strength: 0.6,
                });
            });
        }
    });

    return { nodes, links };
}

function truncateLabel(label: string, maxLength: number = 22): string {
    if (label.length > maxLength) {
        return label.substring(0, maxLength) + '...';
    }
    return label;
}
