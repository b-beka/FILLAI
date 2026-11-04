import { describe, expect, it } from 'vitest';
import type { CategoryBrief, Course } from './api';
import { buildTree } from './tree';

const c = (id: string, category: CategoryBrief | null) => ({ id, title: id, created_by: 'u', created_at: '', views: 0, category }) as Course;
const lang = { id: 'l', label: 'Языки', icon: 'globe' };

describe('buildTree', () => {
  it('группирует подтемы одной сферы', () => {
    const t = buildTree([c('a', { id: 'e', label: 'Английский', parent: lang }), c('b', { id: 'k', label: 'Казахский', parent: lang })]);
    expect(t).toHaveLength(1);
    expect(t[0].subtopics.map((s) => s.label)).toEqual(['Английский', 'Казахский']);
  });

  it('курс без категории уходит в Общее', () => {
    expect(buildTree([c('a', null)])[0].label).toBe('Общее');
  });

  it('категория без родителя считается сферой в Общем не теряя курс', () => {
    const t = buildTree([c('a', { id: 'x', label: 'Старая' })]);
    expect(t[0].label).toBe('Общее');
    expect(t[0].subtopics[0].courses[0].id).toBe('a');
  });

  it('несколько курсов одной подтемы остаются в ней', () => {
    const sub = { id: 'e', label: 'Английский', parent: lang };
    expect(buildTree([c('a', sub), c('b', sub)])[0].subtopics[0].courses).toHaveLength(2);
  });
});
