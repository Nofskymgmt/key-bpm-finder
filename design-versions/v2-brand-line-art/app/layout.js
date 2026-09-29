import Link from 'next/link';
import { Oswald, Nunito_Sans, Architects_Daughter } from 'next/font/google';
import Backdrop from './components/Backdrop';
import './globals.css';

// Fonts from the Nofsky art direction guide.
const oswald = Oswald({ subsets: ['latin'], variable: '--font-headline' });
const nunito = Nunito_Sans({ subsets: ['latin'], variable: '--font-body' });
const handwritten = Architects_Daughter({ subsets: ['latin'], weight: '400', variable: '--font-hand' });

export const metadata = {
  title: 'Key & BPM Finder',
  description: 'Upload an MP3 or WAV and instantly see its musical key and tempo.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${oswald.variable} ${nunito.variable} ${handwritten.variable}`}>
      <body>
        <Backdrop />
        <header className="site-header">
          <Link href="/" className="logo" aria-label="Nofsky, home" />
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
