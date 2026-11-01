'use client';

import { LivingGraph, Stage, type GraphNode } from '@/components/Graph';
import { Icon, UserSolid } from '@/components/Icons';
import { u } from '@/lib/units';

// Кадр «MacBook Pro 16 - 3»: два графа, связанные общей темой
const icon = (name: Parameters<typeof Icon>[0]['name']) => <Icon name={name} size={u(28)} strokeWidth={1.3} />;

const NODES: GraphNode[] = [
  { id: 'shared', x: 19, y: 2, size: 72, content: icon('globe'), label: 'Общая тема', showLabel: true },
  { id: 'me', x: -135, y: 2, size: 90, content: <UserSolid size={u(40)} />, label: 'Вы', showLabel: true },
  { id: 'friend', x: 172, y: 2, size: 90, content: <UserSolid size={u(40)} />, label: 'Друг', showLabel: true },
  { id: 'a1', x: -231, y: -142, size: 64, content: icon('sparkles'), delay: 80 },
  { id: 'a2', x: -244, y: 130, size: 64, content: icon('dumbbell'), delay: 120 },
  { id: 'b1', x: 221, y: -166, size: 64, content: icon('code'), delay: 160 },
  { id: 'b2', x: 312, y: 93, size: 64, content: icon('book'), delay: 200 },
];

const EDGES: [string, string][] = [
  ['me', 'shared'],
  ['shared', 'friend'],
  ['me', 'a1'],
  ['me', 'a2'],
  ['friend', 'b1'],
  ['friend', 'b2'],
];

export default function FriendsPage() {
  return (
    <>
      <p className="absolute font-light text-ink/85" style={{ left: u(60), top: u(70), fontSize: u(20), maxWidth: u(460), lineHeight: 1.45 }}>
        Делитесь курсами и графами знаний с другом, коллегой, одноклассником.
      </p>
      <Stage>
        <LivingGraph nodes={NODES} edges={EDGES} />
      </Stage>
      <div
        className="panel absolute left-1/2 -translate-x-1/2 text-center text-white"
        style={{ bottom: u(100), width: u(560), borderRadius: u(24), padding: `${u(18)} ${u(24)}`, fontSize: u(17) }}
      >
        <p className="font-normal">Друзья скоро появятся</p>
        <p className="font-light text-white/80" style={{ marginTop: u(6), fontSize: u(15) }}>
          А пока поделитесь курсом по ссылке — кнопка в панели курса на графе.
        </p>
      </div>
    </>
  );
}
