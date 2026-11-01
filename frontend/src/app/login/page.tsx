'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/Icons';
import { button } from '@/components/PageFrame';
import { useAuth } from '@/lib/auth';

const field =
  'w-full rounded-full bg-black/25 px-5 py-3 font-light text-ink outline-none ring-1 ring-white/15 placeholder:text-ink/45 focus:ring-white/50';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') await login(email, password);
      else await register({ email, username, password });
      const topic = params?.get('topic');
      router.push(topic ? `/?topic=${encodeURIComponent(topic)}` : '/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка';
      setError(msg === 'Incorrect email or password' ? 'Неверная почта или пароль' : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto px-4 py-10">
      <form onSubmit={submit} className="panel w-full max-w-sm rounded-[30px] p-8 text-white">
        <div className="mb-6 flex items-center gap-4">
          <Logo size={52} />
          <div>
            <p className="text-2xl font-light tracking-wide">FILL AI</p>
            <p className="text-sm font-light text-white/75">Вместе к большему</p>
          </div>
        </div>

        <div className="space-y-3">
          <input className={field} type="email" required autoComplete="email" placeholder="Почта" value={email} onChange={(e) => setEmail(e.target.value)} />
          {mode === 'register' && (
            <input className={field} required minLength={3} autoComplete="username" placeholder="Имя пользователя" value={username} onChange={(e) => setUsername(e.target.value)} />
          )}
          <input
            className={field}
            type="password"
            required
            minLength={mode === 'register' ? 8 : 1}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder={mode === 'register' ? 'Пароль (от 8 символов)' : 'Пароль'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-200">{error}</p>}

        <button type="submit" disabled={busy} className={`${button} mt-5 w-full`}>
          {busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === 'login' ? 'register' : 'login'));
            setError('');
          }}
          className="mt-4 w-full text-center text-sm font-light text-white/80 hover:text-white"
        >
          {mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
