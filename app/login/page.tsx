'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin() {
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  async function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') await handleLogin();
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-12 h-12 rounded-full border border-surface-600 bg-surface-800 flex items-center justify-center mx-auto mb-4">
            <span className="font-display text-sm text-silver-200">KP</span>
          </div>
          <h1 className="text-2xl text-white font-display tracking-[0.2em]">ADMIN ACCESS</h1>
          <p className="text-silver-500 text-sm mt-2">League control room — authorized personnel only</p>
        </div>

        {/* Card */}
        <div className="card p-7 space-y-4">
          <div>
            <label className="block text-xs font-mono text-silver-500 uppercase tracking-widest mb-1.5">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-silver-500 uppercase tracking-widest mb-1.5">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="input-field"
            />
          </div>

          {error && (
            <div className="bg-surface-700 border border-surface-500 rounded-lg px-3 py-2">
              <p className="text-silver-300 text-sm">{error}</p>
            </div>
          )}

          <button
            id="login-submit"
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="btn-primary w-full mt-2"
          >
            {loading ? 'SIGNING IN…' : 'SIGN IN'}
          </button>
        </div>
      </div>
    </div>
  );
}
