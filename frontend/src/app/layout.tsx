import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import Shell from '@/components/Shell';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500'],
  variable: '--font-montserrat',
});

export const metadata: Metadata = {
  title: 'FILL AI',
  description: 'Генератор персонализированных мини-курсов на любой запрос: конспект, тесты, задания, видео и граф знаний.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={montserrat.variable}>
      <body className="font-sans">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
