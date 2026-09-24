import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';

export const metadata: Metadata = {
  title: 'Chadi0x VANTA // Institutional Financial Intelligence',
  description: 'Zero-latency macroeconomic terminal, deviation engine, and volatility intelligence portal.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-black">
      <body className="min-h-screen bg-black text-neutral-100 font-mono antialiased selection:bg-vanta-green selection:text-black">
        <AuthProvider>
          <SocketProvider>
            {children}
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
