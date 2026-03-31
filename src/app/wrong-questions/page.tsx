'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X,
  Lightbulb,
  Trash2,
  RefreshCw,
  Crown,
  Lock
} from 'lucide-react';
import PaymentModal from '@/components/PaymentModal';

interface WrongQuestion {
  id: number;
  question_id: number;
  wrong_count: number;
  last_wrong_at: string;
  mastered: boolean;
  created_at: string;
  questions: {
    id: number;
    subject: string;
    chapter: string;
    question_type: string;
    content: string;
    options: string[] | null;
    answer: string;
    explanation: string | null;
    difficulty: number;
  } | null;
}

interface QuotaInfo {
  isLoggedIn: boolean;
  canAnswer: boolean;
  isVip: boolean;
  reason: string;
}

export default function WrongQuestionsPage() {
  const router = useRouter();
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestion[]>([]);
  const [masteredQuestions, setMasteredQuestions] = useState<WrongQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [selectedMultiple, setSelectedMultiple] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [practiceMode, setPracticeMode] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState('');

  // 检查权限
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/user/quota', { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          setQuota(data.data);
          // 错题本功能需要VIP
          if (!data.data.isVip) {
            setCheckingAuth(false);
            return;
          }
        }
      } catch (error) {
        console.error('获取权限失败:', error);
      }
      setCheckingAuth(false);
    };
    checkAuth();
  }, []);

  const currentList = activeTab === 'pending' ? wrongQuestions : masteredQuestions;
  const filteredList = subjectFilter 
    ? currentList.filter(wq => wq.questions?.subject === subjectFilter)
    : currentList;
  const currentWrong = filteredList[currentIndex];

  const fetchData = useCallback(async () => {
    if (!quota?.isVip) return;
    
    setLoading(true);
    try {
      const [pendingRes, masteredRes] = await Promise.all([
        fetch('/api/wrong-questions?mastered=false&page_size=1000', { credentials: 'include' }),
        fetch('/api/wrong-questions?mastered=true&page_size=1000', { credentials: 'include' })
      ]);
      
      const pendingData = await pendingRes.json();
      const masteredData = await masteredRes.json();
      
      if (pendingData.success) setWrongQuestions(pendingData.data || []);
      if (masteredData.success) setMasteredQuestions(masteredData.data || []);
    } catch (error) {
      console.error('获取错题失败:', error);
    } finally {
      setLoading(false);
    }
  }, [quota?.isVip]);

  useEffect(() => {
    if (quota?.isVip) {
      fetchData();
    }
  }, [fetchData, quota?.isVip]);

  const resetAnswer = () => {
    setSelectedAnswer('');
    setSelectedMultiple([]);
    setSubmitted(false);
    setIsCorrect(false);
  };

  const handleSubmit = async () => {
    if (!currentWrong?.questions) return;

    const question = currentWrong.questions;
    const answer = question.question_type === 'multiple' 
      ? selectedMultiple.sort().join(',')
      : selectedAnswer;

    if (!answer && question.question_type !== 'judge') {
      alert('请选择答案');
      return;
    }

    try {
      const res = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: question.id,
          user_answer: answer
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsCorrect(data.data.is_correct);
        setSubmitted(true);
        
        // 如果答对了，从错题列表移除
        if (data.data.is_correct) {
          setTimeout(() => {
            fetchData();
            if (currentIndex >= filteredList.length - 1) {
              setCurrentIndex(Math.max(0, filteredList.length - 2));
            }
            resetAnswer();
          }, 1500);
        }
      }
    } catch (error) {
      console.error('提交失败:', error);
    }
  };

  const handleNext = () => {
    if (currentIndex < filteredList.length - 1) {
      setCurrentIndex(currentIndex + 1);
      resetAnswer();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      resetAnswer();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要从错题本中移除这道题吗？')) return;
    
    try {
      const res = await fetch(`/api/wrong-questions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
        if (currentIndex >= filteredList.length - 1) {
          setCurrentIndex(Math.max(0, filteredList.length - 2));
        }
      }
    } catch (error) {
      alert('删除失败');
    }
  };

  const handleToggleMastered = async (id: number, mastered: boolean) => {
    try {
      const res = await fetch(`/api/wrong-questions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mastered })
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (error) {
      alert('操作失败');
    }
  };

  const getOptionLabel = (index: number) => String.fromCharCode(65 + index);

  const getSubjectName = (subject: string) => {
    return subject === 'geography' ? '地理' : '生物';
  };

  const getTypeName = (type: string) => {
    const types: Record<string, string> = {
      single: '单选题',
      multiple: '多选题',
      judge: '判断题'
    };
    return types[type] || type;
  };

  // 加载中
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">错题本</h1>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-12 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </main>
      </div>
    );
  }

  // 非VIP用户
  if (!quota?.isVip) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold">错题本</h1>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="pt-8 pb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2">VIP 专属功能</h2>
              <p className="text-gray-500 mb-6">
                错题本功能仅限 VIP 会员使用<br/>
                开通 VIP 即可无限次使用
              </p>
              <Button 
                className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600"
                onClick={() => setShowPayment(true)}
              >
                <Crown className="w-4 h-4 mr-2" />
                开通 VIP
              </Button>
            </CardContent>
          </Card>
        </main>
        <PaymentModal 
          open={showPayment} 
          onOpenChange={setShowPayment}
          onSuccess={() => {
            // 刷新权限
            window.location.reload();
          }}
        />
      </div>
    );
  }

  // 列表模式
  if (!practiceMode) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold">错题本</h1>
            </div>
            {quota?.isVip && (
              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                <Crown className="w-3 h-3 mr-1" /> VIP
              </Badge>
            )}
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6">
          <Tabs value={activeTab} onValueChange={(v) => {
            setActiveTab(v);
            setCurrentIndex(0);
          }}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="pending">
                  待复习 ({wrongQuestions.length})
                </TabsTrigger>
                <TabsTrigger value="mastered">
                  已掌握 ({masteredQuestions.length})
                </TabsTrigger>
              </TabsList>
              {filteredList.length > 0 && (
                <Button onClick={() => {
                  setPracticeMode(true);
                  setCurrentIndex(0);
                  resetAnswer();
                }}>
                  开始练习
                </Button>
              )}
            </div>

            <div className="mb-4">
              <Select value={subjectFilter} onValueChange={(v) => {
                setSubjectFilter(v === 'all' ? '' : v);
                setCurrentIndex(0);
              }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="全部科目" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部科目</SelectItem>
                  <SelectItem value="geography">地理</SelectItem>
                  <SelectItem value="biology">生物</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredList.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  {activeTab === 'pending' ? '太棒了！没有待复习的错题' : '还没有已掌握的错题'}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredList.map((wq, idx) => (
                  <Card key={wq.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">
                              {wq.questions && getSubjectName(wq.questions.subject)}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              错误 {wq.wrong_count} 次
                            </span>
                            <span className="text-sm text-gray-400">
                              {wq.questions?.chapter}
                            </span>
                          </div>
                          <p className="text-gray-700 line-clamp-2">
                            {wq.questions?.content}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {activeTab === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleMastered(wq.id, true)}
                            >
                              <Check className="w-4 h-4 text-green-500" />
                            </Button>
                          )}
                          {activeTab === 'mastered' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleMastered(wq.id, false)}
                            >
                              <RefreshCw className="w-4 h-4 text-blue-500" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(wq.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </Tabs>
        </main>
      </div>
    );
  }

  // 练习模式
  const question = currentWrong?.questions;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setPracticeMode(false)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-bold">错题练习</h1>
                <p className="text-sm text-gray-500">
                  第 {currentIndex + 1} / {filteredList.length} 题
                </p>
              </div>
            </div>
            <Badge variant="destructive">
              错误 {currentWrong?.wrong_count} 次
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : question ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline">{getSubjectName(question.subject)}</Badge>
                <Badge variant="secondary">{getTypeName(question.question_type)}</Badge>
                <span className="text-sm text-gray-500">{question.chapter}</span>
              </div>

              <div className="mb-6">
                <p className="text-lg leading-relaxed">{question.content}</p>
              </div>

              {question.question_type === 'judge' ? (
                <RadioGroup
                  value={selectedAnswer}
                  onValueChange={setSelectedAnswer}
                  disabled={submitted}
                >
                  <div className="space-y-3">
                    {['正确', '错误'].map((option, idx) => {
                      const optionKey = idx === 0 ? 'A' : 'B';
                      const isThisCorrect = question.answer === optionKey;
                      const isSelected = selectedAnswer === optionKey;
                      
                      return (
                        <div
                          key={optionKey}
                          className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                            submitted
                              ? isThisCorrect
                                ? 'bg-green-50 border-green-500'
                                : isSelected
                                ? 'bg-red-50 border-red-500'
                                : ''
                              : isSelected
                              ? 'bg-blue-50 border-blue-500'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <RadioGroupItem value={optionKey} id={optionKey} />
                          <Label htmlFor={optionKey} className="flex-1 cursor-pointer">
                            {optionKey}. {option}
                          </Label>
                          {submitted && isThisCorrect && <Check className="w-5 h-5 text-green-500" />}
                          {submitted && isSelected && !isThisCorrect && <X className="w-5 h-5 text-red-500" />}
                        </div>
                      );
                    })}
                  </div>
                </RadioGroup>
              ) : question.question_type === 'single' ? (
                <RadioGroup
                  value={selectedAnswer}
                  onValueChange={setSelectedAnswer}
                  disabled={submitted}
                >
                  <div className="space-y-3">
                    {question.options?.map((option, idx) => {
                      const optionKey = getOptionLabel(idx);
                      const isThisCorrect = question.answer === optionKey;
                      const isSelected = selectedAnswer === optionKey;
                      
                      return (
                        <div
                          key={optionKey}
                          className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                            submitted
                              ? isThisCorrect
                                ? 'bg-green-50 border-green-500'
                                : isSelected
                                ? 'bg-red-50 border-red-500'
                                : ''
                              : isSelected
                              ? 'bg-blue-50 border-blue-500'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <RadioGroupItem value={optionKey} id={optionKey} />
                          <Label htmlFor={optionKey} className="flex-1 cursor-pointer">
                            {optionKey}. {option}
                          </Label>
                          {submitted && isThisCorrect && <Check className="w-5 h-5 text-green-500" />}
                          {submitted && isSelected && !isThisCorrect && <X className="w-5 h-5 text-red-500" />}
                        </div>
                      );
                    })}
                  </div>
                </RadioGroup>
              ) : (
                <div className="space-y-3">
                  {question.options?.map((option, idx) => {
                    const optionKey = getOptionLabel(idx);
                    const correctAnswers = question.answer.split(',').map(s => s.trim());
                    const isThisCorrect = correctAnswers.includes(optionKey);
                    const isSelected = selectedMultiple.includes(optionKey);
                    
                    return (
                      <div
                        key={optionKey}
                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                          submitted
                            ? isThisCorrect
                              ? 'bg-green-50 border-green-500'
                              : isSelected
                              ? 'bg-red-50 border-red-500'
                              : ''
                            : isSelected
                            ? 'bg-blue-50 border-blue-500'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => {
                          if (!submitted) {
                            setSelectedMultiple(prev =>
                              prev.includes(optionKey)
                                ? prev.filter(k => k !== optionKey)
                                : [...prev, optionKey]
                            );
                          }
                        }}
                      >
                        <Checkbox checked={isSelected} disabled={submitted} className="pointer-events-none" />
                        <span className="flex-1 cursor-pointer">{optionKey}. {option}</span>
                        {submitted && isThisCorrect && <Check className="w-5 h-5 text-green-500" />}
                        {submitted && isSelected && !isThisCorrect && <X className="w-5 h-5 text-red-500" />}
                      </div>
                    );
                  })}
                </div>
              )}

              {submitted && (
                <div className={`mt-6 p-4 rounded-lg ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {isCorrect ? (
                      <>
                        <Check className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-600">回答正确，已从错题本移除</span>
                      </>
                    ) : (
                      <>
                        <X className="w-5 h-5 text-red-600" />
                        <span className="font-medium text-red-600">继续加油</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm">正确答案: <strong>{question.answer}</strong></p>
                  {question.explanation && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5" />
                        <p className="text-sm text-gray-600">{question.explanation}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
                  <ChevronLeft className="w-4 h-4 mr-1" />上一题
                </Button>
                {!submitted ? (
                  <Button onClick={handleSubmit}>提交答案</Button>
                ) : (
                  <Button onClick={handleNext} disabled={currentIndex === filteredList.length - 1}>
                    下一题<ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              没有错题可以练习
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
