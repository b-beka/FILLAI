'use client';

import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionModal } from '@/components/SubscriptionModal';

// Initialize Sentry on client side (only if DSN is provided)
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  // Sentry is initialized via sentry.client.config.ts
  // This is just a placeholder for any runtime initialization if needed
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        <title>Fill AI - Платформа для создания курсов с ИИ</title>
        <meta name="description" content="Создавайте и изучайте курсы с помощью искусственного интеллекта. Интерактивный граф знаний, ИИ-ментор и автоматическая генерация контента." />
      </head>
      <body>
        <AuthProvider>
          {children}
          <SubscriptionModal />
        </AuthProvider>
      </body>
    </html>
  );
}

