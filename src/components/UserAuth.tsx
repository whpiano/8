'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  LogIn, 
  LogOut, 
  Crown, 
  Zap,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface UserInfo {
  id: number;
  username: string;
  free_count: number;
  vip_expired_at: string | null;
  created_at: string;
}

interface QuotaInfo {
  isLoggedIn: boolean;
  canAnswer: boolean;
  reason: string;
  freeCount: number;
  isVip: boolean;
  vipExpiredAt: string | null;
}

interface UserAuthProps {
  onLoginChange?: (isLoggedIn: boolean) => void;
  onQuotaChange?: (quota: QuotaInfo) => void;
  showPayment?: () => void;
}

export default function UserAuth({ onLoginChange, onQuotaChange, showPayment }: UserAuthProps) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 表单状态
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // 获取用户信息和权限
  const fetchUserAndQuota = async () => {
    try {
      // 获取用户信息
      const userRes = await fetch('/api/auth', {
        credentials: 'include'  // 确保携带 cookie
      });
      const userData = await userRes.json();
      
      if (userData.success && userData.isLoggedIn) {
        setUser(userData.data);
        onLoginChange?.(true);
      } else {
        setUser(null);
        onLoginChange?.(false);
      }
      
      // 获取权限信息
      const quotaRes = await fetch('/api/user/quota', {
        credentials: 'include'  // 确保携带 cookie
      });
      const quotaData = await quotaRes.json();
      
      if (quotaData.success) {
        setQuota(quotaData.data);
        onQuotaChange?.(quotaData.data);
      }
    } catch (err) {
      console.error('获取用户信息失败:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAndQuota();
  }, []);

  // 登录
  const handleLogin = async () => {
    if (!username || !password) {
      setError('请填写完整信息');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'  // 确保携带和设置 cookie
      });
      
      const data = await res.json();
      
      if (data.success) {
        // 直接使用登录返回的数据更新状态
        setUser(data.data.user);
        onLoginChange?.(true);
        setOpen(false);
        setUsername('');
        setPassword('');
        
        // 异步刷新权限信息（不阻塞 UI）
        setTimeout(() => {
          fetchUserAndQuota();
        }, 100);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 注册
  const handleRegister = async () => {
    if (!username || !password) {
      setError('请填写完整信息');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'  // 确保携带和设置 cookie
      });
      
      const data = await res.json();
      
      if (data.success) {
        // 直接使用注册返回的数据更新状态
        setUser(data.data.user);
        onLoginChange?.(true);
        setOpen(false);
        setUsername('');
        setPassword('');
        
        // 异步刷新权限信息（不阻塞 UI）
        setTimeout(() => {
          fetchUserAndQuota();
        }, 100);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 退出登录
  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { 
        method: 'DELETE',
        credentials: 'include'  // 确保携带 cookie
      });
      setUser(null);
      fetchUserAndQuota();
    } catch (err) {
      console.error('退出登录失败:', err);
    }
  };

  // 格式化 VIP 过期时间
  const formatVipExpiry = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff <= 0) return '已过期';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  };

  // 加载中状态
  if (initialLoading) {
    return (
      <Button variant="secondary" size="sm" disabled className="bg-white/90 text-gray-600">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        加载中...
      </Button>
    );
  }

  // 未登录状态
  if (!user) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary" size="sm" className="bg-white/90 text-gray-700 hover:bg-white font-medium">
            <LogIn className="w-4 h-4 mr-2" />
            登录
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>用户登录</DialogTitle>
            <DialogDescription>
              登录后可记录答题进度，新用户赠送 10 次免费答题
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-username">用户名</Label>
                <Input
                  id="login-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">密码</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              <Button 
                className="w-full" 
                onClick={handleLogin}
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                登录
              </Button>
            </TabsContent>
            
            <TabsContent value="register" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-username">用户名</Label>
                <Input
                  id="register-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="3-20 个字符"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">密码</Label>
                <Input
                  id="register-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 6 个字符"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              <Button 
                className="w-full" 
                onClick={handleRegister}
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                注册（送 10 次免费答题）
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    );
  }

  // 已登录状态
  return (
    <div className="flex items-center gap-3">
      {/* VIP 状态 */}
      {quota?.isVip ? (
        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
          <Crown className="w-3 h-3 mr-1" />
          VIP {quota.vipExpiredAt && `(${formatVipExpiry(quota.vipExpiredAt)})`}
        </Badge>
      ) : (
        <Badge className="bg-white/90 text-gray-700 gap-1">
          <Zap className="w-3 h-3" />
          剩余 {quota?.freeCount ?? user.free_count} 次
        </Badge>
      )}
      
      {/* 用户名 */}
      <div className="flex items-center gap-2 text-sm text-white">
        <User className="w-4 h-4" />
        <span>{user.username}</span>
      </div>
      
      {/* 充值按钮 */}
      {!quota?.isVip && (
        <Button 
          variant="secondary"
          size="sm"
          onClick={showPayment}
          className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white"
        >
          <Crown className="w-4 h-4 mr-1" />
          开通 VIP
        </Button>
      )}
      
      {/* 退出按钮 */}
      <Button variant="ghost" size="sm" onClick={handleLogout} title="退出登录" className="text-white hover:bg-white/20">
        <LogOut className="w-4 h-4" />
      </Button>
    </div>
  );
}
