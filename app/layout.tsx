import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Card collection',
  description: 'Personal card collection, deck, and pricing tracker',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
