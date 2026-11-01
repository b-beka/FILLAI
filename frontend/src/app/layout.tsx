import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import Shell from '@/components/Shell';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500'],
  variable: '--font-montserrat',
});

const THEME_SCRIPT = `try{var t=localStorage.getItem('fill-theme');if(t==='silver'||t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}`;

export const metadata: Metadata = {
  title: 'FILL AI',
  description: 'Генератор персонализированных мини-курсов на любой запрос: конспект, тесты, задания, видео и граф знаний.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={montserrat.variable} data-theme="silver" suppressHydrationWarning>
      <head>
        {/* Тема до первой отрисовки, чтобы не мигало */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-sans">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
