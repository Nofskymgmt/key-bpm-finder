'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, useUser, NOT_CONFIGURED } from '../lib/supabase';
import Captcha, { CAPTCHA_SITE_KEY } from './Captcha';

// New accounts need at least this many characters (must match Supabase's "Minimum password length").
// Log in doesn't check it, so accounts created under the old 6-character rule still work.
const MIN_PASSWORD = 8;

// The shared log in / sign up form. initialMode picks which one it opens on.
export default function AuthForm({ initialMode = 'login' }) {
  const router = useRouter();
  const { user } = useUser();
  const [mode, setMode] = useState(initialMode); // login | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaRound, setCaptchaRound] = useState(0);
  const onCaptchaToken = useCallback((t) => setCaptchaToken(t), []);

  const isSignup = mode === 'signup';

  async function submit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!supabase) {
      setError(NOT_CONFIGURED);
      return;
    }
    if (CAPTCHA_SITE_KEY && !captchaToken) {
      setError('Please complete the “I’m not a robot” check first.');
      return;
    }
    const captcha = CAPTCHA_SITE_KEY ? { captchaToken } : {};
    setBusy(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/analyze`, ...captcha },
        });
        if (error) throw error;
        if (data.session) {
          router.push('/analyze');
        } else {
          // Supabase has "Confirm email" turned on: the account is active once the link is clicked.
          setNotice(`Almost there. We sent a confirmation link to ${email}. Click it, then log in here.`);
          setMode('login');
          setPassword('');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password, options: captcha });
        if (error) throw error;
        router.push('/analyze');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || String(err));
    } finally {
      setBusy(false);
      setCaptchaRound((n) => n + 1); // captcha tokens are single-use
    }
  }

  if (user) {
    return (
      <section className="narrow">
        <header className="page-head">
          <h1>You’re logged in</h1>
          <p className="lead">{user.email}</p>
        </header>
        <div className="stack-center">
          <Link href="/analyze" className="button button-olive">
            Analyze a song
          </Link>
          <Link href="/history" className="text-link">
            View your history
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="narrow">
      <header className="page-head">
        <h1>{isSignup ? 'Create your account' : 'Welcome back'}</h1>
        <p className="lead">
          {isSignup ? 'Save every analysis and look it up any time.' : 'Log in to see your saved analyses.'}
        </p>
      </header>

      <form className="panel glass form" onSubmit={submit}>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            required
            minLength={isSignup ? MIN_PASSWORD : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {isSignup && <p className="hint field-hint">At least {MIN_PASSWORD} characters.</p>}

        <Captcha onToken={onCaptchaToken} resetKey={`${mode}-${captchaRound}`} />

        <button className="button button-teal button-block" type="submit" disabled={busy}>
          {busy ? <span className="spinner spinner-light" /> : isSignup ? 'Sign up' : 'Log in'}
        </button>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
      </form>

      <p className="switch-mode">
        {isSignup ? 'Already have an account?' : 'New here?'}{' '}
        <button
          type="button"
          className="text-link"
          onClick={() => {
            setMode(isSignup ? 'login' : 'signup');
            setError('');
            setNotice('');
          }}
        >
          {isSignup ? 'Log in' : 'Create an account'}
        </button>
      </p>
    </section>
  );
}
