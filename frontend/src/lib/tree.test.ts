import { describe, expect, it } from 'vitest';
import type { CategoryBrief, Course } from './api';
import { buildTree, fanOut } from './tree';

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

describe('несколько курсов без категории', () => {
  it('все попадают в Общее, id сохранены', () => {
    const t = buildTree([c('a', null), c('b', null), c('d', null)]);
    expect(t).toHaveLength(1);
    expect(t[0].label).toBe('Общее');
    expect(t[0].subtopics.flatMap((s) => s.courses.map((x) => x.id))).toEqual(['a', 'b', 'd']);
  });
});

describe('fanOut', () => {
  it('для трёх курсов даёт различные точки', () => {
    const pts = [0, 1, 2].map((i) => fanOut({ x: 10, y: 20 }, 0.5, i, 3, 120));
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++) expect(pts[i]).not.toEqual(pts[j]);
  });

  it('один курс стоит ровно на базовом луче', () => {
    const p = fanOut({ x: 0, y: 0 }, 0, 0, 1, 100);
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(0);
  });
});
