import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '서울 아파트 체계도',
  description: '이소장의 서울아파트 가격 체계도 — 네이버 부동산 실시간 최저가 연동',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
