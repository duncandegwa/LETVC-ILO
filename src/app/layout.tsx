import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'LETVC ILO — Industrial Attachment System',
  description: 'Laikipia East TVC Industrial Liaison Office — Attachment Management System',
  icons: { icon: '/letvc-logo.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans bg-white dark:bg-gray-950 text-gray-900 dark:text-white antialiased">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#fff',
                  color: '#111',
                  borderRadius: '12px',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  fontSize: '14px',
                },
                success: { iconTheme: { primary: '#4a7c2f', secondary: '#fff' } },
                error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
