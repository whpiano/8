'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import UserAuth from '@/components/UserAuth';
import PaymentModal from '@/components/PaymentModal';
import { 
  BookOpen, 
  FileQuestion, 
  AlertCircle, 
  Trophy, 
  PenLine, 
  Database,
  Map,
  Leaf,
  TrendingUp
} from 'lucide-react';

interface Stats {
  total: number;
  subject: {
    geography: number;
    biology: number;
  };
  question_type: {
    single: number;
    multiple: number;
    judge: number;
  };
  wrong_questions: number;
  answer_records: number;
}

interface QuotaInfo {
  isLoggedIn: boolean;
  canAnswer: boolean;
  reason: string;
  freeCount: number;
  isVip: boolean;
  vipExpiredAt: string | null;
}

interface SystemConfig {
  free_quota: number;
  vip_price_day: number;
  vip_price_month: number;
  vip_price_year: number;
  friend_links: Array<{ name: string; url: string }>;
  question_notice: string;
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);

  useEffect(() => {
    fetchStats();
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.success) {
        // 解析JSON字符串
        let friendLinks: Array<{ name: string; url: string }> = [];
        try {
          friendLinks = JSON.parse(data.data.friend_links || '[]');
        } catch {
          friendLinks = [];
        }
        
        setSystemConfig({
          free_quota: parseInt(data.data.free_count) || 10,
          vip_price_day: parseInt(data.data.vip_price) || 10,
          vip_price_month: parseInt(data.data.vip_price) || 100,
          vip_price_year: parseInt(data.data.vip_price) || 365,
          friend_links: friendLinks,
          question_notice: data.data.questions_page_notice || ''
        });
      }
    } catch (error) {
      console.error('获取配置失败:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/questions/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('获取统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      title: '顺序练习',
      description: '按章节顺序逐题练习，巩固基础知识',
      icon: PenLine,
      href: '/practice',
      color: 'bg-blue-500',
      badge: stats?.total ? `${stats.total}题` : undefined
    },
    {
      title: '错题本',
      description: '复习错题，查漏补缺',
      icon: AlertCircle,
      href: '/wrong-questions',
      color: 'bg-red-500',
      badge: stats?.wrong_questions ? `${stats.wrong_questions}题` : undefined
    },
    {
      title: '模拟考试',
      description: '全真模拟，检验学习成果',
      icon: Trophy,
      href: '/exam',
      color: 'bg-green-500'
    },
    {
      title: '题库管理',
      description: '导入和管理题库',
      icon: Database,
      href: '/questions',
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-green-500 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8" />
              <h1 className="text-2xl font-bold">初中地生会考练习系统</h1>
            </div>
            <UserAuth 
              onLoginChange={setIsLoggedIn}
              onQuotaChange={setQuota}
              showPayment={() => setShowPayment(true)}
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* 未登录用户免费次数提示 */}
        {quota && !quota.isLoggedIn && quota.freeCount > 0 && (
          <Card className="border-blue-200 bg-blue-50 mb-6">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800">免费试用：剩余 {quota.freeCount} 次答题机会</p>
                  <p className="text-sm text-blue-600">登录后可获得更多免费次数，并记录答题进度</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 未登录用户次数用完提示 */}
        {quota && !quota.isLoggedIn && quota.freeCount <= 0 && (
          <Card className="border-orange-200 bg-orange-50 mb-6">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-orange-800">免费试用次数已用完</p>
                    <p className="text-sm text-orange-600">登录后可获取 10 次免费答题机会</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* VIP 提示 */}
        {quota && !quota.isVip && quota.isLoggedIn && quota.freeCount <= 0 && (
          <Card className="border-orange-200 bg-orange-50 mb-6">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-orange-800">免费答题次数已用完</p>
                    <p className="text-sm text-orange-600">开通 VIP 会员，当日无限次刷题</p>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowPayment(true)}
                  className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600"
                >
                  开通 VIP
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        {!loading && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileQuestion className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-sm text-gray-500">题目总数</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Map className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.subject.geography}</p>
                    <p className="text-sm text-gray-500">地理题</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Leaf className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.subject.biology}</p>
                    <p className="text-sm text-gray-500">生物题</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.wrong_questions}</p>
                    <p className="text-sm text-gray-500">待复习错题</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Features */}
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          功能入口
        </h2>
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {features.map((feature) => (
            <Link key={feature.href} href={feature.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${feature.color}`}>
                        <feature.icon className="w-5 h-5 text-white" />
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </div>
                    {feature.badge && (
                      <Badge variant="secondary">{feature.badge}</Badge>
                    )}
                  </div>
                  <CardDescription className="mt-2">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        {/* Question Type Stats */}
        {!loading && stats && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">题型分布</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">单选题</Badge>
                  <span className="font-medium">{stats.question_type.single}题</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">多选题</Badge>
                  <span className="font-medium">{stats.question_type.multiple}题</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">判断题</Badge>
                  <span className="font-medium">{stats.question_type.judge}题</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Start */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!loading && stats?.total === 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">题库为空</p>
                  <p className="text-sm text-yellow-600">
                    请先前往<Link href="/questions" className="underline mx-1">题库管理</Link>导入题目
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6 text-center text-gray-500 text-sm">
        <p>初中地生会考练习系统 · 助力会考成功</p>
        
        {/* 友情链接 */}
        {systemConfig?.friend_links && systemConfig.friend_links.length > 0 && (
          <div className="mt-4 flex items-center justify-center gap-4 flex-wrap">
            <span className="text-gray-400">友情链接：</span>
            {systemConfig.friend_links.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                {link.name}
              </a>
            ))}
          </div>
        )}
      </footer>

      {/* Payment Modal */}
      <PaymentModal 
        open={showPayment} 
        onOpenChange={setShowPayment}
        onSuccess={() => {
          // 刷新用户权限
          window.location.reload();
        }}
      />
    </div>
  );
}
