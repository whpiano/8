import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import ZhuPayScript from '@/components/ZhuPayScript';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '地生会考练习系统',
    template: '%s | 地生会考练习系统',
  },
  description: '初中地理生物会考在线练习系统，支持题库导入、错题本、顺序答题、模拟考试等功能',
  keywords: ['初中会考', '地理', '生物', '练习系统', '题库', '模拟考试'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased bg-gray-50">
        {isDev && <Inspector />}
        <ZhuPayScript />
        {children}
      </body>
    </html>
  );
}
