'use client';

import { useState, useEffect } from 'react';
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
import { Crown, Check, Loader2, CreditCard, AlertCircle, Zap } from 'lucide-react';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface SystemConfig {
  vip_price: string;
  vip_duration_hours: string;
}

export default function PaymentModal({ open, onOpenChange, onSuccess }: PaymentModalProps) {
  const [step, setStep] = useState<'pay' | 'verify'>('pay');
  const [paymentCode, setPaymentCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [config, setConfig] = useState<SystemConfig>({
    vip_price: '10',
    vip_duration_hours: '24'
  });

  // 获取系统配置
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/config');
        const data = await res.json();
        if (data.success) {
          setConfig({
            vip_price: data.data.vip_price || '10',
            vip_duration_hours: data.data.vip_duration_hours || '24'
          });
        }
      } catch (error) {
        console.error('获取配置失败:', error);
      }
    };
    fetchConfig();
  }, []);

  const vipPrice = parseFloat(config.vip_price) || 10;
  const vipHours = parseInt(config.vip_duration_hours) || 24;

  // 打开支付
  const handlePay = () => {
    setLoading(true);
    
    // 检查 ZhuPay 是否已加载
    if (typeof window !== 'undefined') {
      const win = window as unknown as { 
        ZhuPay?: { 
          open: (price: number, desc: string, callback: (code: string) => void) => void 
        } 
      };
      if (win.ZhuPay) {
        win.ZhuPay.open(vipPrice, `开通VIP${vipHours}小时`, (code: string) => {
          setLoading(false);
          setPaymentCode(code);
          setStep('verify');
        });
        return;
      }
    }
    
    // 如果 ZhuPay 未加载，模拟跳转
    setTimeout(() => {
      setLoading(false);
      setStep('verify');
    }, 1000);
  };

  // 验证支付凭证
  const handleVerify = async () => {
    if (!paymentCode || paymentCode.length < 6) {
      setError('请输入正确的凭证码');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const res = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: paymentCode })
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onOpenChange(false);
          resetState();
        }, 2000);
      } else {
        setError(data.error || '验证失败');
      }
    } catch (err) {
      setError('验证失败，请重试');
    } finally {
      setVerifying(false);
    }
  };

  // 重置状态
  const resetState = () => {
    setStep('pay');
    setPaymentCode('');
    setError('');
    setSuccess(false);
    setLoading(false);
    setVerifying(false);
  };

  // 关闭时重置
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-xl">开通 VIP 会员</DialogTitle>
          <DialogDescription className="text-base">
            支付 <span className="text-orange-500 font-bold text-lg">¥{vipPrice}</span>，
            {vipHours}小时无限刷题
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-7 h-7 text-green-500" />
            </div>
            <p className="text-lg font-medium text-green-600">VIP 开通成功！</p>
            <p className="text-sm text-gray-500 mt-1">正在刷新页面...</p>
          </div>
        ) : step === 'pay' ? (
          <div className="space-y-4 pt-2">
            {/* VIP 权益 */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>无限次顺序练习</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>无限次模拟考试</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>错题本功能</span>
              </div>
            </div>

            {/* 支付按钮 */}
            <Button 
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-medium py-5 text-base"
              onClick={handlePay}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <CreditCard className="w-5 h-5 mr-2" />
              )}
              {loading ? '正在打开支付...' : `扫码支付 ¥${vipPrice}`}
            </Button>

            {/* 已有凭证 */}
            <Button 
              variant="link" 
              className="w-full text-gray-500"
              onClick={() => setStep('verify')}
            >
              已有支付凭证，去验证
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>支付凭证码</Label>
              <Input
                value={paymentCode}
                onChange={(e) => setPaymentCode(e.target.value.toUpperCase())}
                placeholder="请输入凭证码"
                className="text-center text-lg tracking-wider"
                maxLength={12}
              />
              <p className="text-xs text-gray-400 text-center">支付成功后，输入收到的凭证码</p>
            </div>

            {error && (
              <div className="flex items-center justify-center gap-2 text-sm text-red-500">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setStep('pay')}
                disabled={verifying}
              >
                返回
              </Button>
              <Button 
                className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600"
                onClick={handleVerify}
                disabled={verifying || !paymentCode}
              >
                {verifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                验证并开通
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
