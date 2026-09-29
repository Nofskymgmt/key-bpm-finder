import Link from 'next/link';
import { Inter } from 'next/font/google';
import Backdrop from './components/Backdrop';
import NavLinks from './components/NavLinks';
import { SOURCE_URL } from './lib/site';
import './globals.css';

// Apple devices use San Francisco via the system font stack; Inter is the fallback elsewhere.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'Key & BPM Finder',
  description: 'Upload an MP3 or WAV and instantly see its musical key and tempo.',
};

export const viewport = {
  themeColor: '#f6f3ed',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Backdrop />
        <header className="nav-wrap">
          <nav className="nav glass">
            <Link href="/" className="logo" aria-label="Nofsky, home" />
            <span className="nav-divider" />
            <NavLinks />
          </nav>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          <span className="footer-logo" aria-label="Nofsky" role="img" />
          <span>
            © 2026 Nofsky · Key &amp; BPM Finder ·{' '}
            <a href={SOURCE_URL} className="footer-link" target="_blank" rel="noopener noreferrer">
              Source code
            </a>
          </span>
        </footer>
      </body>
    </html>
  );
}
