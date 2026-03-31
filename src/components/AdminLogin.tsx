'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, LogOut } from 'lucide-react';

interface AdminLoginProps {
  isAdmin: boolean;
  onLoginSuccess: () => void;
  onLogout: () => void;
}

export function AdminLogin({ isAdmin, onLoginSuccess, onLogout }: AdminLoginProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await res.json();

      if (data.success) {
        setOpen(false);
        setPassword('');
        onLoginSuccess();
      } else {
        setError(data.error || '登录失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
      onLogout();
    } catch {
      console.error('退出失败');
    }
  };

  if (isAdmin) {
    return (
      <Button variant="outline" onClick={handleLogout}>
        <LogOut className="w-4 h-4 mr-2" />
        退出管理
      </Button>
    );
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Lock className="w-4 h-4 mr-2" />
        管理员登录
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>管理员登录</DialogTitle>
            <DialogDescription>
              请输入管理员密码以管理题库
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入管理员密码"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            <Button 
              onClick={handleLogin} 
              disabled={loading || !password}
              className="w-full"
            >
              {loading ? '登录中...' : '登录'}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              默认密码：admin123（可在环境变量 ADMIN_PASSWORD 中修改）
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
