'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, useUser, formatKey, formatDate, NOT_CONFIGURED } from '../lib/supabase';

export default function HistoryPage() {
  const { user, loading } = useUser();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('analyses')
      .select('id, file_name, bpm, key, scale, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('History error:', error);
          setError(`Couldn’t load your history: ${error.message}`);
        } else {
          setRows(data);
        }
      });
  }, [user]);

  return (
    <section className="analyze">
      <header className="page-head">
        <h1>History</h1>
        <p className="lead">Every song you’ve analyzed, newest first.</p>
      </header>

      {!supabase ? (
        <p className="error">{NOT_CONFIGURED}</p>
      ) : loading ? (
        <p className="status-note">Loading…</p>
      ) : !user ? (
        <div className="panel glass empty">
          <p>Log in to see your saved analyses.</p>
          <Link href="/login" className="button button-teal">
            Log in
          </Link>
        </div>
      ) : error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : rows === null ? (
        <p className="status-note">Loading your history…</p>
      ) : rows.length === 0 ? (
        <div className="panel glass empty">
          <p>No analyses yet. Songs you analyze while logged in show up here.</p>
          <Link href="/analyze" className="button button-olive">
            Analyze a song
          </Link>
        </div>
      ) : (
        <ul className="panel glass history-list">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/history/${row.id}`} className="history-row">
                <span className="history-main">
                  <span className="history-name">{row.file_name}</span>
                  <span className="history-date">{formatDate(row.created_at)}</span>
                </span>
                <span className="history-stats">
                  <span className="pill">{formatKey(row.key, row.scale)}</span>
                  <span className="pill">{row.bpm} BPM</span>
                </span>
                <svg className="chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
