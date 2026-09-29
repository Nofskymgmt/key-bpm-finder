'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase, useUser, NOT_CONFIGURED } from '../lib/supabase';
import { useUsage, notifyUsageChanged } from '../lib/billing';
import ResultTiles from '../components/ResultTiles';
import Paywall from '../components/Paywall';

// Postgres "row-level security" rejection: the database refused a free user's save over the limit.
const RLS_VIOLATION = '42501';
// Postgres "check constraint" rejection: a value the database considers invalid (see security-fixes.sql).
const CHECK_VIOLATION = '23514';

const SAMPLE_RATE = 44100; // Essentia's rhythm and key algorithms expect 44.1 kHz
const ALLOWED_EXTENSIONS = ['.mp3', '.wav'];
// Decoding needs roughly 10x the song's length in memory; these keep a browser tab from running out.
const MAX_FILE_MB = 150;
const MAX_MINUTES = 20;

function isAllowedFile(file) {
  const name = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

// Read just the duration (cheap) before decoding the whole file (expensive). null if unknown.
function getDurationSeconds(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (value) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const timer = setTimeout(() => done(null), 10000);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      clearTimeout(timer);
      done(Number.isFinite(audio.duration) ? audio.duration : null);
    };
    audio.onerror = () => {
      clearTimeout(timer);
      done(null);
    };
    audio.src = url;
  });
}

// Decode the file and mix it down to a single mono channel at 44.1 kHz.
async function decodeToMono(file) {
  const bytes = await file.arrayBuffer();
  const ctx = new OfflineAudioContext(1, 1, SAMPLE_RATE);
  const audio = await ctx.decodeAudioData(bytes);

  const mono = new Float32Array(audio.length);
  for (let ch = 0; ch < audio.numberOfChannels; ch++) {
    const data = audio.getChannelData(ch);
    for (let i = 0; i < data.length; i++) mono[i] += data[i] / audio.numberOfChannels;
  }
  return mono;
}

function runAnalysis(worker, samples) {
  return new Promise((resolve, reject) => {
    worker.onmessage = (event) => {
      if (event.data.ok) resolve(event.data);
      else reject(new Error(event.data.error));
    };
    worker.onerror = (event) => reject(new Error(event.message || 'The analyzer failed to load.'));
    worker.postMessage({ samples }, [samples.buffer]);
  });
}

export default function AnalyzePage() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const [saveError, setSaveError] = useState('');
  const [checkoutNote, setCheckoutNote] = useState(''); // activating | active | slow | cancelled
  const { user, loading } = useUser();
  const { usage, isPro, remaining, atLimit, refresh } = useUsage(user);
  const inputRef = useRef(null);
  const workerRef = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker('/analyzer-worker.js');
    return () => workerRef.current.terminate();
  }, []);

  // Back from Stripe Checkout. The webhook (not this redirect) upgrades the account, so wait for it.
  useEffect(() => {
    if (!user) return;
    const result = new URLSearchParams(window.location.search).get('checkout');
    if (!result) return;
    window.history.replaceState(null, '', '/analyze');
    if (result === 'cancelled') {
      setCheckoutNote('cancelled');
      return;
    }
    setCheckoutNote('activating');
    let cancelled = false;
    (async () => {
      for (let i = 0; i < 20 && !cancelled; i++) {
        const u = await refresh();
        if (u?.plan === 'pro') {
          notifyUsageChanged();
          setCheckoutNote('active');
          return;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (!cancelled) setCheckoutNote('slow');
    })();
    return () => {
      cancelled = true;
    };
  }, [user, refresh]);

  function chooseFile(selected) {
    setResult(null);
    if (!selected) return;
    if (!isAllowedFile(selected)) {
      setFile(null);
      setStatus('error');
      setError(`"${selected.name}" isn't an MP3 or WAV file. Please choose a .mp3 or .wav file.`);
      return;
    }
    if (selected.size > MAX_FILE_MB * 1024 * 1024) {
      setFile(null);
      setStatus('error');
      setError(
        `"${selected.name}" is ${Math.round(selected.size / 1024 / 1024)} MB. Files up to ${MAX_FILE_MB} MB are supported.`
      );
      return;
    }
    setFile(selected);
    setStatus('idle');
    setError('');
  }

  async function analyze() {
    if (!file) return;
    // Check this month's count right before analyzing, in case it changed in another tab.
    const latest = await refresh();
    if (latest && latest.plan !== 'pro' && latest.used >= latest.monthly_limit) return;
    setStatus('loading');
    setResult(null);
    setError('');
    setSaveState('idle');

    // Long files can be small (e.g. low-bitrate MP3s) but still take huge memory to decode.
    const seconds = await getDurationSeconds(file);
    if (seconds && seconds > MAX_MINUTES * 60) {
      setStatus('error');
      setError(
        `"${file.name}" is ${Math.round(seconds / 60)} minutes long. Songs up to ${MAX_MINUTES} minutes are supported.`
      );
      return;
    }

    let samples;
    try {
      samples = await decodeToMono(file);
    } catch (err) {
      console.error('Decode error:', err);
      setStatus('error');
      setError(`Couldn't read "${file.name}". It may be damaged or not a real MP3/WAV file.`);
      return;
    }

    let saved;
    try {
      const analysis = await runAnalysis(workerRef.current, samples);
      saved = {
        fileName: file.name,
        bpm: Math.round(analysis.bpm),
        key: analysis.key,
        scale: analysis.scale,
      };
      setResult(saved);
      setStatus('done');
    } catch (err) {
      console.error('Analysis error:', err);
      setStatus('error');
      setError(`Analysis failed: ${err.message}`);
      return;
    }

    if (user) await saveToHistory(saved);
  }

  // Only the results are stored; the audio never leaves the browser.
  async function saveToHistory(r) {
    setSaveState('saving');
    setSaveError('');
    const { error } = await supabase
      .from('analyses')
      // the database accepts file names up to 255 characters
      .insert({ file_name: r.fileName.slice(0, 255), bpm: r.bpm, key: r.key, scale: r.scale });
    if (error) {
      console.error('Save error:', error);
      setSaveState(error.code === RLS_VIOLATION ? 'limit' : 'error');
      setSaveError(
        error.code === CHECK_VIOLATION
          ? 'this result has an unexpected key or tempo, so it wasn’t saved.'
          : error.message
      );
    } else {
      setSaveState('saved');
    }
    notifyUsageChanged();
  }

  if (loading) return <p className="status-note">Loading…</p>;

  if (!supabase)
    return (
      <section className="analyze">
        <p className="error">{NOT_CONFIGURED}</p>
      </section>
    );

  if (!user)
    return (
      <section className="analyze">
        <header className="page-head">
          <h1>Analyze a song</h1>
          <p className="lead">Create a free account to start. You get 5 analyses a month, free.</p>
        </header>
        <div className="panel glass empty">
          <p>Your results are saved to your history, so you can look them up any time.</p>
          <Link href="/signup" className="button button-teal">
            Sign up free
          </Link>
          <p className="switch-mode">
            Already have an account? <Link href="/login" className="text-link">Log in</Link>
          </p>
        </div>
      </section>
    );

  return (
    <section className="analyze">
      <header className="page-head">
        <h1>Analyze a song</h1>
        <p className="lead">Key and tempo, measured right on your device.</p>
        {usage && (
          <p className={`usage-pill${isPro ? ' usage-pro' : ''}`}>
            {isPro
              ? 'Pro · unlimited analyses'
              : `${remaining} of ${usage.monthly_limit} free analyses left this month`}
          </p>
        )}
      </header>

      {checkoutNote && (
        <p className={checkoutNote === 'slow' ? 'error' : 'notice'} role="status">
          {checkoutNote === 'activating' && 'Payment received. Activating Pro…'}
          {checkoutNote === 'active' && '🎉 You’re on Pro. Analyze as many songs as you like.'}
          {checkoutNote === 'cancelled' && 'Checkout cancelled. You’re still on the Free plan.'}
          {checkoutNote === 'slow' &&
            'Your payment went through, but Pro hasn’t switched on yet. Refresh in a minute; if it still says Free, the Stripe webhook may not be reaching the site.'}
        </p>
      )}

      <div className="panel glass">
        <div
          className={`dropzone${dragging ? ' dragging' : ''}${file ? ' has-file' : ''}`}
          role="button"
          tabIndex={0}
          aria-label="Choose an MP3 or WAV file"
          onClick={() => inputRef.current.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            chooseFile(e.dataTransfer.files[0]);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".mp3,.wav,audio/mpeg,audio/wav"
            hidden
            onChange={(e) => {
              chooseFile(e.target.files[0]);
              e.target.value = '';
            }}
          />
          <svg className="drop-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {file ? (
              <path d="M9 18V6l10-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm10-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            ) : (
              <path d="M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
            )}
          </svg>
          {file ? (
            <>
              <p className="drop-title file-name">{file.name}</p>
              <p className="hint">Click to choose a different song</p>
            </>
          ) : (
            <>
              <p className="drop-title">Drop a song here</p>
              <p className="hint">or click to browse · MP3 or WAV</p>
            </>
          )}
        </div>

        {atLimit && status !== 'loading' ? (
          <Paywall />
        ) : (
          <button className="button button-olive button-block" onClick={analyze} disabled={!file || status === 'loading'}>
            {status === 'loading' ? (
              <>
                <span className="spinner" /> Analyzing…
              </>
            ) : (
              'Analyze'
            )}
          </button>
        )}

        {status === 'loading' && <p className="status-note">Listening to your song. This can take a few seconds.</p>}

        {status === 'error' && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {status === 'done' && result && (
          <div className="results" aria-live="polite">
            <p className="result-file">{result.fileName}</p>
            <ResultTiles keyName={result.key} scale={result.scale} bpm={result.bpm} />
            <p className={`save-note${saveState === 'error' || saveState === 'limit' ? ' save-error' : ''}`}>
              {saveState === 'saving' && 'Saving to your history…'}
              {saveState === 'saved' && (
                <>
                  ✓ Saved to your <Link href="/history">history</Link>
                </>
              )}
              {saveState === 'limit' && 'Not saved: you’ve reached this month’s free limit.'}
              {saveState === 'error' && `Couldn’t save to your history: ${saveError}`}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
