import './globals.css';
import { Shell } from '../components/Shell';

export const metadata = {
  title: 'Geomatrix | Land Acquisition AI',
  description: 'Predictive Intelligence for Smarter Infrastructure',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* suppressHydrationWarning prevents false errors from browser extensions
          (e.g. Grammarly) that inject attributes onto <body> before React hydrates */}
      <body suppressHydrationWarning>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}

