import Link from 'next/link';

export default function Home() {
  return (
    <section className="hero">
      <h1>Key &amp; BPM Finder</h1>
      <p className="lead">
        Drop in an MP3 or WAV and instantly see the song&apos;s musical key and tempo.
        Everything runs right in your browser. Your file is never uploaded anywhere.
      </p>
      <Link href="/analyze" className="button button-teal">
        Analyze a song
      </Link>
      <p className="hand-note">find the key, feel the tempo</p>
    </section>
  );
}
