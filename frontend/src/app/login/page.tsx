'use client';

import { Suspense, useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon, Logo } from '@/components/Icons';
import { button } from '@/components/PageFrame';
import { useAuth } from '@/lib/auth';

const field =
  'w-full rounded-full bg-black/25 px-5 py-3 font-light text-white outline-none ring-1 ring-white/15 placeholder:text-white/45 focus:ring-white/60';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block pl-4 text-xs font-light text-white/75">{label}</span>
      {children}
      {hint && <span className="mt-1 block pl-4 text-xs font-light text-white/55">{hint}</span>}
    </label>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading, login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const topic = params?.get('topic');
  const destination = topic ? `/?topic=${encodeURIComponent(topic)}` : params?.get('next') || '/';

  // Уже вошли — на страницу входа незачем
  useEffect(() => {
    if (!loading && user) router.replace(destination);
  }, [loading, user, router, destination]);

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setError('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') await login(identifier.trim(), password);
      else await register({ email: email.trim(), username: username.trim(), password, full_name: name.trim() || undefined });
      router.push(destination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не получилось — попробуйте ещё раз');
    } finally {
      setBusy(false);
    }
  };

  const trackCaps = (e: KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState?.('CapsLock') ?? false);

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto px-4 py-10">
      <form onSubmit={submit} className="panel w-full max-w-sm rounded-[30px] p-8 text-white" noValidate={false}>
        <div className="mb-6 flex items-center gap-4">
          <Logo size={52} />
          <div>
            <p className="text-2xl font-light tracking-wide">FILL AI</p>
            <p className="text-sm font-light text-white/75">Вместе к большему</p>
          </div>
        </div>

        <div role="tablist" className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-black/20 p-1">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className={`rounded-full py-2 text-sm transition ${mode === m ? 'bg-white/90 text-[#202020]' : 'font-light text-white/80 hover:text-white'}`}
            >
              {m === 'login' ? 'Вход' : 'Регистрация'}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {mode === 'login' ? (
            <Field label="Логин или почта">
              <input
                className={field}
                required
                autoFocus
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </Field>
          ) : (
            <>
              <Field label="Имя" hint="Необязательно — так вас увидят друзья">
                <input className={field} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Логин">
                <input
                  className={field}
                  required
                  minLength={3}
                  maxLength={100}
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </Field>
              <Field label="Почта">
                <input className={field} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
            </>
          )}

          <Field label="Пароль" hint={mode === 'register' ? 'Не короче 8 символов' : undefined}>
            <span className="relative block">
              <input
                className={`${field} pr-12`}
                type={showPassword ? 'text' : 'password'}
                required
                minLength={mode === 'register' ? 8 : 1}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={trackCaps}
                onKeyDown={trackCaps}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} size={20} />
              </button>
            </span>
          </Field>
          {capsLock && <p className="pl-4 text-xs text-white/80">Включён Caps Lock</p>}
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-2xl bg-black/25 px-4 py-2.5 text-sm text-white">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className={`${button} mt-6 w-full`}>
          {busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
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
