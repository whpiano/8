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
import { Badge } from '@/components/ui/badge';
import { 
  Crown, 
  Check, 
  Loader2,
  CreditCard,
  AlertCircle
} from 'lucide-react';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function PaymentModal({ open, onOpenChange, onSuccess }: PaymentModalProps) {
  const [step, setStep] = useState<'select' | 'paying' | 'verify'>('select');
  const [paymentCode, setPaymentCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // VIP 价格
  const VIP_PRICE = 10.00;
  const VIP_DURATION = '24 小时';

  // 打开支付弹窗
  const handlePay = () => {
    // 检查 ZhuPay 是否已加载
    if (typeof window !== 'undefined') {
      const win = window as unknown as { 
        ZhuPay?: { 
          open: (price: number, desc: string, callback: (code: string) => void) => void 
        } 
      };
      if (win.ZhuPay) {
        win.ZhuPay.open(VIP_PRICE, '开通VIP', (code: string) => {
          // 支付成功，拿到凭证码
          setPaymentCode(code);
          setStep('verify');
        });
        return;
      }
    }
    // 如果 ZhuPay 未加载，提示用户手动输入
    setStep('paying');
  };

  // 验证支付凭证
  const handleVerify = async () => {
    if (!paymentCode) {
      setError('请输入支付凭证码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        setError(data.error);
      }
    } catch (err) {
      setError('验证失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 重置状态
  const resetState = () => {
    setStep('select');
    setPaymentCode('');
    setError('');
    setSuccess(false);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            开通 VIP 会员
          </DialogTitle>
          <DialogDescription>
            支付 10 元，当日无限次刷题
          </DialogDescription>
        </DialogHeader>

        {/* 选择支付方式 */}
        {step === 'select' && (
          <div className="space-y-4">
            {/* VIP 权益说明 */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">VIP 权益</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  当日无限次刷题
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  支持顺序练习、模拟考试
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  答题记录云端同步
                </li>
              </ul>
            </div>

            {/* 价格信息 */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-2xl font-bold text-orange-500">¥10</p>
                <p className="text-sm text-gray-500">有效期 {VIP_DURATION}</p>
              </div>
              <Badge variant="secondary">一次性支付</Badge>
            </div>

            {/* 支付按钮 */}
            <Button 
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600"
              onClick={handlePay}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              扫码支付 ¥{VIP_PRICE}
            </Button>

            {/* 手动输入凭证 */}
            <Button 
              variant="link" 
              className="w-full"
              onClick={() => setStep('verify')}
            >
              已有支付凭证？点击验证
            </Button>
          </div>
        )}

        {/* 等待支付 */}
        {step === 'paying' && (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">请扫码支付</p>
              <p className="text-sm text-gray-500 mb-4">
                支付成功后，请输入收到的 8 位凭证码
              </p>
              <Button onClick={() => setStep('verify')}>
                我已支付，输入凭证码
              </Button>
            </div>
          </div>
        )}

        {/* 验证凭证 */}
        {step === 'verify' && (
          <div className="space-y-4">
            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-lg font-medium text-green-600">VIP 开通成功！</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="payment-code">支付凭证码</Label>
                  <Input
                    id="payment-code"
                    value={paymentCode}
                    onChange={(e) => setPaymentCode(e.target.value.toUpperCase())}
                    placeholder="请输入 8 位凭证码"
                    maxLength={8}
                    className="text-center text-lg tracking-widest"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-500">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setStep('select')}
                  >
                    返回
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={handleVerify}
                    disabled={loading || paymentCode.length !== 8}
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    验证并开通
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
