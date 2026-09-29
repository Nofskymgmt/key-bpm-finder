'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const SAMPLE_RATE = 44100; // Essentia's rhythm and key algorithms expect 44.1 kHz
const ALLOWED_EXTENSIONS = ['.mp3', '.wav'];

function isAllowedFile(file) {
  const name = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
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
  const inputRef = useRef(null);
  const workerRef = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker('/analyzer-worker.js');
    return () => workerRef.current.terminate();
  }, []);

  function chooseFile(selected) {
    setResult(null);
    if (!selected) return;
    if (!isAllowedFile(selected)) {
      setFile(null);
      setStatus('error');
      setError(`"${selected.name}" isn't an MP3 or WAV file. Please choose a .mp3 or .wav file.`);
      return;
    }
    setFile(selected);
    setStatus('idle');
    setError('');
  }

  async function analyze() {
    if (!file) return;
    setStatus('loading');
    setResult(null);
    setError('');

    let samples;
    try {
      samples = await decodeToMono(file);
    } catch (err) {
      console.error('Decode error:', err);
      setStatus('error');
      setError(`Couldn't read "${file.name}". It may be damaged or not a real MP3/WAV file.`);
      return;
    }

    try {
      const analysis = await runAnalysis(workerRef.current, samples);
      setResult({
        fileName: file.name,
        bpm: Math.round(analysis.bpm),
        key: `${analysis.key} ${analysis.scale}`,
      });
      setStatus('done');
    } catch (err) {
      console.error('Analysis error:', err);
      setStatus('error');
      setError(`Analysis failed: ${err.message}`);
    }
  }

  return (
    <section>
      <Link href="/" className="back">
        ← Back
      </Link>
      <h1>Analyze a song</h1>

      <div
        className={`dropzone${dragging ? ' dragging' : ''}`}
        onClick={() => inputRef.current.click()}
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
        {file ? (
          <p className="file-name">{file.name}</p>
        ) : (
          <p>
            <strong>Click to choose a file</strong> or drag and drop it here
          </p>
        )}
        <p className="hint">MP3 or WAV</p>
      </div>

      <button className="button button-olive" onClick={analyze} disabled={!file || status === 'loading'}>
        {status === 'loading' ? 'Analyzing…' : 'Analyze'}
      </button>

      {status === 'loading' && (
        <div className="loading">
          <span className="spinner" /> Listening to your song… this can take a few seconds.
        </div>
      )}

      {status === 'error' && <p className="error">{error}</p>}

      {status === 'done' && result && (
        <div className="results">
          <p className="result-file">{result.fileName}</p>
          <div className="result-grid">
            <div>
              <span className="label">Key</span>
              <span className="value marked">{result.key}</span>
            </div>
            <div>
              <span className="label">Tempo</span>
              <span className="value">{result.bpm} BPM</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
