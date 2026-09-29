'use client';

import { useEffect, useRef } from 'react';

// Cloudflare Turnstile bot check for sign up / log in. Only active when NEXT_PUBLIC_TURNSTILE_SITE_KEY
// is set AND Supabase → Authentication → Attack Protection → CAPTCHA is turned on with the matching
// secret key; Supabase then rejects sign-ups/log-ins without a valid token.
export const CAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function loadScript() {
  if (window.turnstile) return Promise.resolve();
  if (!window.__turnstileLoading) {
    window.__turnstileLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT_SRC;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error('The bot check failed to load.'));
      document.head.appendChild(s);
    });
  }
  return window.__turnstileLoading;
}

// Renders the widget and reports each new token (tokens are single-use: change `resetKey` to get a fresh one).
export default function Captcha({ onToken, resetKey }) {
  const box = useRef(null);

  useEffect(() => {
    if (!CAPTCHA_SITE_KEY) return;
    let widgetId;
    let cancelled = false;
    onToken('');
    loadScript()
      .then(() => {
        if (cancelled || !box.current) return;
        widgetId = window.turnstile.render(box.current, {
          sitekey: CAPTCHA_SITE_KEY,
          callback: (token) => onToken(token),
          'expired-callback': () => onToken(''),
          'error-callback': () => onToken(''),
        });
      })
      .catch((err) => console.error('Captcha error:', err));
    return () => {
      cancelled = true;
      if (widgetId !== undefined) window.turnstile?.remove(widgetId);
    };
  }, [onToken, resetKey]);

  if (!CAPTCHA_SITE_KEY) return null;
  return <div ref={box} className="captcha" />;
}
