// 1 единица = 1px макета Figma (кадр 1728×1117); --u задан в globals.css
export const u = (n: number) => `calc(${n} * var(--u))`;

// Холст справа от сайдбара в макете: 1353×1117, центр пользователя — (710, 549)
export const STAGE = { w: 1353, h: 1117, ox: 710, oy: 549 } as const;
