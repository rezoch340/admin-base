'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Blocks, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiRequestError } from '@/lib/api-client';
import { useAuthentication } from '@/lib/auth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, login } = useAuthentication();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [router, user]);

  async function submitLogin(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!username.trim() || !password) {
      toast.error('请输入用户名和密码');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
      router.replace('/');
    } catch (error) {
      toast.error(
        error instanceof ApiRequestError
          ? error.message
          : '登录失败，请稍后重试',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-svh bg-[#edf3f5] lg:grid-cols-[minmax(420px,0.9fr)_1.1fr]">
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-12 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#0b1a20] text-cyan-300">
              <Blocks className="size-5" />
            </span>
            <div>
              <p className="font-heading font-semibold tracking-[0.14em]">
                Admin Base
              </p>
              <p className="font-mono text-[10px] tracking-[0.16em] text-slate-500 uppercase">
                Admin Console
              </p>
            </div>
          </div>

          <div className="mb-8 space-y-2">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              登录控制台
            </h1>
            <p className="text-sm leading-6 text-slate-500">
              使用后台账号登录，管理用户、权限与系统日志。
            </p>
          </div>

          <form className="space-y-5" onSubmit={submitLogin}>
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                value={username}
                autoComplete="username"
                placeholder="admin"
                className="h-11 bg-white"
                onChange={(changeEvent) => setUsername(changeEvent.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                autoComplete="current-password"
                className="h-11 bg-white"
                onChange={(changeEvent) => setPassword(changeEvent.target.value)}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="h-11 w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? '登录中…' : '登录'}
            </Button>
          </form>
        </div>
      </section>

      <section className="relative hidden overflow-hidden bg-[#071218] lg:block">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background:
              'radial-gradient(circle at 30% 28%, rgba(34,211,238,.32), transparent 30rem), radial-gradient(circle at 80% 70%, rgba(14,116,144,.38), transparent 34rem)',
          }}
        />
        <div
          className="ambient-flow absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'repeating-linear-gradient(118deg, rgba(255,255,255,.08) 0 1px, transparent 1px 28px)',
          }}
        />
        <div className="relative flex h-full flex-col justify-end p-14 text-white">
          <span className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <ShieldCheck className="size-6 text-cyan-300" />
          </span>
          <p className="font-mono text-xs tracking-[0.3em] text-cyan-300 uppercase">
            Administration Console
          </p>
          <h2 className="mt-4 max-w-2xl font-heading text-5xl font-semibold leading-[1.05] tracking-tight">
            统一管理入口，
            <br />
            清晰掌控每一项权限。
          </h2>
          <p className="mt-5 max-w-lg text-sm leading-7 text-white/55">
            账号管理、权限分配与操作审计，
            为你的应用提供统一的后台管理体验。
          </p>
        </div>
      </section>
    </main>
  );
}
