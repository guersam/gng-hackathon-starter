import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '관제탑 — 번역되지 않는 시스템',
  description:
    '같은 시스템을 서로 다른 은유로 보는 4~6명이, 클린 랭귀지로 번역해가며 시스템을 안정화시키는 체험학습 게임.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0B0E14',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
