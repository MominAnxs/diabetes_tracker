// app/layout.js

import { Providers } from './providers';
import './globals.css';

export const metadata = {
  title: 'Diabetes Tracker',
  description: 'Track your diabetes readings',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}