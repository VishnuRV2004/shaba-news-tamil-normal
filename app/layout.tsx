import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Newsroom | Shaba News Tamil',
  description: 'Local reporting from Salem and across Tamil Nadu.',
  icons: { icon: '/shaba-mark.webp' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="ta"><body>{children}</body></html>;
}
