import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import PWA from '@/components/PWA'

const inter = Inter({ subsets: ['latin'] })

// Añadimos el enlace al manifest aquí
export const metadata: Metadata = {
  title: 'Pachangueo - Gestión de Partidos',
  description: 'Organiza partidos, vota a los MVP y gestiona tu comunidad.',
  manifest: '/manifest.json', // <--- FUNDAMENTAL PARA LA PWA
}

export const viewport: Viewport = {
  themeColor: '#0a0f1c', // Color de la barra de estado del móvil
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {/* Ejecutamos el Service Worker de fondo */}
        <PWA />
        {children}
      </body>
    </html>
  )
}