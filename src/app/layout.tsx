import type { Metadata } from 'next';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/barlow-condensed/800-italic.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/jetbrains-mono/400.css';
import './globals.css';
export const metadata: Metadata = { title: 'TypeRacer — Your keyboard is the accelerator', description: 'Type fast. Drive faster. Race colorful cars by typing, practice against AI, or challenge your friends in real time.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
