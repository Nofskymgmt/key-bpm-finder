'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase, useUser, formatDate, NOT_CONFIGURED } from '../../lib/supabase';
import ResultTiles from '../../components/ResultTiles';

export default function HistoryEntryPage() {
  const { id } = useParams();
  const { user, loading } = useUser();
  const [row, setRow] = useState(undefined); // undefined = loading, null = not found
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('analyses')
      .select('id, file_name, bpm, key, scale, created_at')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('History entry error:', error);
          setError(`Couldn’t load this analysis: ${error.message}`);
        } else {
          setRow(data);
        }
      });
  }, [user, id]);

  let body;
  if (!supabase) body = <p className="error">{NOT_CONFIGURED}</p>;
  else if (loading || (user && row === undefined && !error)) body = <p className="status-note">Loading…</p>;
  else if (!user)
    body = (
      <div className="panel glass empty">
        <p>Log in to see your saved analyses.</p>
        <Link href="/login" className="button button-teal">
          Log in
        </Link>
      </div>
    );
  else if (error)
    body = (
      <p className="error" role="alert">
        {error}
      </p>
    );
  else if (!row) body = <p className="error">This analysis wasn’t found in your history.</p>;
  else
    body = (
      <div className="panel glass detail">
        <p className="detail-name">{row.file_name}</p>
        <p className="detail-date">Analyzed {formatDate(row.created_at)}</p>
        <ResultTiles keyName={row.key} scale={row.scale} bpm={row.bpm} />
      </div>
    );

  return (
    <section className="analyze">
      <Link href="/history" className="back-link">
        <svg className="chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m15 6-6 6 6 6" />
        </svg>
        History
      </Link>
      {body}
    </section>
  );
}
