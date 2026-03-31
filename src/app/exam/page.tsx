'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
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
  Trophy,
  Clock,
  Play,
  Crown
} from 'lucide-react';
import PaymentModal from '@/components/PaymentModal';

interface Question {
  id: number;
  subject: string;
  chapter: string;
  question_type: string;
  content: string;
  options: string[] | null;
  difficulty: number;
  image_url: string | null;
}

interface ExamSession {
  session_id: number;
  subject: string;
  total_questions: number;
  started_at: string;
  questions: Question[];
}

interface ExamHistory {
  id: number;
  subject: string;
  total_questions: number;
  correct_count: number;
  score: number;
  duration: number;
  started_at: string;
  finished_at: string;
}

interface QuotaInfo {
  isLoggedIn: boolean;
  canAnswer: boolean;
  isVip: boolean;
  reason: string;
}

export default function ExamPage() {
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [examMode, setExamMode] = useState<'select' | 'exam' | 'result'>('select');
  const [subject, setSubject] = useState('');
  const [questionCount, setQuestionCount] = useState(30);
  const [loading, setLoading] = useState(false);
  const [examSession, setExamSession] = useState<ExamSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [result, setResult] = useState<{
    session_id: number;
    total_questions: number;
    correct_count: number;
    score: number;
    results: Array<{
      question_id: number;
      user_answer: string | null;
      correct_answer: string;
      is_correct: boolean;
    }>;
  } | null>(null);
  const [history, setHistory] = useState<ExamHistory[]>([]);

  const currentQuestion = examSession?.questions[currentIndex];
  const progress = examSession ? ((currentIndex + 1) / examSession.total_questions) * 100 : 0;

  // 检查权限
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/user/quota', { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          setQuota(data.data);
        }
      } catch (error) {
        console.error('获取权限失败:', error);
      }
      setCheckingAuth(false);
    };
    checkAuth();
  }, []);

  // 获取考试历史
  useEffect(() => {
    if (quota?.isVip) {
      fetchHistory();
    }
  }, [quota?.isVip]);

  // 计时器
  useEffect(() => {
    if (examMode === 'exam' && examSession) {
      const timer = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [examMode, examSession]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/exam/history');
      const data = await res.json();
      if (data.success) {
        setHistory(data.data || []);
      }
    } catch (error) {
      console.error('获取历史失败:', error);
    }
  };

  const startExam = async () => {
    if (!subject) {
      alert('请选择考试科目');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/exam/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, count: questionCount })
      });
      const data = await res.json();
      if (data.success) {
        setExamSession(data.data);
        setAnswers({});
        setCurrentIndex(0);
        setTimeElapsed(0);
        setExamMode('exam');
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('开始考试失败');
    } finally {
      setLoading(false);
    }
  };

  const submitExam = async () => {
    if (!examSession) return;

    const unanswered = examSession.questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      if (!confirm(`还有 ${unanswered.length} 题未作答，确定要交卷吗？`)) {
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/exam/${examSession.session_id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        setExamMode('result');
        fetchHistory();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('提交失败');
    } finally {
      setLoading(false);
    }
  };

  const getOptionLabel = (index: number) => String.fromCharCode(65 + index);

  const getSubjectName = (s: string) => {
    const names: Record<string, string> = {
      geography: '地理',
      biology: '生物',
      mixed: '综合'
    };
    return names[s] || s;
  };

  const getTypeName = (type: string) => {
    const types: Record<string, string> = {
      single: '单选题',
      multiple: '多选题',
      judge: '判断题'
    };
    return types[type] || type;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
            <h1 className="text-xl font-bold">模拟考试</h1>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-12 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </main>
      </div>
    );
  }

  // 非VIP用户
  if (!quota?.isVip && examMode === 'select') {
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
              <h1 className="text-xl font-bold">模拟考试</h1>
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
                模拟考试功能仅限 VIP 会员使用<br/>
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
            window.location.reload();
          }}
        />
      </div>
    );
  }

  // 选择考试页面
  if (examMode === 'select') {
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
              <h1 className="text-xl font-bold">模拟考试</h1>
            </div>
            {quota?.isVip && (
              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                <Crown className="w-3 h-3 mr-1" /> VIP
              </Badge>
            )}
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>开始新考试</CardTitle>
                <CardDescription>选择科目和题量开始模拟考试</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>考试科目</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择科目" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="geography">地理</SelectItem>
                      <SelectItem value="biology">生物</SelectItem>
                      <SelectItem value="mixed">综合（地理+生物）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>题目数量</Label>
                  <Select value={questionCount.toString()} onValueChange={(v) => setQuestionCount(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 题</SelectItem>
                      <SelectItem value="20">20 题</SelectItem>
                      <SelectItem value="30">30 题</SelectItem>
                      <SelectItem value="50">50 题</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={startExam} 
                  disabled={!subject || loading}
                  className="w-full"
                  size="lg"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {loading ? '准备中...' : '开始考试'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>考试记录</CardTitle>
                <CardDescription>最近的考试成绩</CardDescription>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">暂无考试记录</p>
                ) : (
                  <div className="space-y-3">
                    {history.slice(0, 5).map((h) => (
                      <div key={h.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{getSubjectName(h.subject)}</Badge>
                            <span className="font-medium">{h.score}分</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {h.correct_count}/{h.total_questions} 正确 · {Math.floor(h.duration / 60)}分{h.duration % 60}秒
                          </p>
                        </div>
                        <div className="text-right text-xs text-gray-400">
                          {new Date(h.started_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // 考试结果页面
  if (examMode === 'result' && result) {
    const passed = result.score >= 60;
    
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">考试结果</h1>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6">
          <Card className={`border-2 ${passed ? 'border-green-500' : 'border-red-500'}`}>
            <CardContent className="pt-8 pb-8 text-center">
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
                passed ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {passed ? (
                  <Trophy className="w-10 h-10 text-green-600" />
                ) : (
                  <X className="w-10 h-10 text-red-600" />
                )}
              </div>
              <h2 className={`text-2xl font-bold mb-2 ${passed ? 'text-green-600' : 'text-red-600'}`}>
                {passed ? '恭喜通过！' : '未能通过'}
              </h2>
              <p className="text-5xl font-bold my-4">{result.score}分</p>
              <div className="flex justify-center gap-8 text-gray-600">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{result.correct_count}</p>
                  <p className="text-sm">正确</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{result.total_questions - result.correct_count}</p>
                  <p className="text-sm">错误</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{formatTime(timeElapsed)}</p>
                  <p className="text-sm">用时</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>答题详情</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {examSession?.questions.map((q, idx) => {
                  const answerResult = result.results.find(r => r.question_id === q.id);
                  const userAnswer = answers[q.id] || answerResult?.user_answer;
                  
                  return (
                    <div key={q.id} className={`p-4 rounded-lg border ${
                      answerResult?.is_correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-start gap-2 mb-2">
                        <span className="font-medium">{idx + 1}.</span>
                        <div className="flex-1">
                          <p>{q.content}</p>
                          <div className="mt-2 text-sm">
                            <p>
                              你的答案: 
                              <span className={`font-medium ml-1 ${answerResult?.is_correct ? 'text-green-600' : 'text-red-600'}`}>
                                {userAnswer || '未作答'}
                              </span>
                            </p>
                            {!answerResult?.is_correct && (
                              <p className="text-green-600">
                                正确答案: <strong>{answerResult?.correct_answer}</strong>
                              </p>
                            )}
                          </div>
                        </div>
                        {answerResult?.is_correct ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <X className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 mt-6">
            <Button variant="outline" onClick={() => setExamMode('select')} className="flex-1">
              返回首页
            </Button>
            <Button onClick={startExam} className="flex-1">
              再考一次
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // 考试页面
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <h1 className="font-bold">模拟考试</h1>
              <Badge variant="outline">{getSubjectName(examSession?.subject || '')}</Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-gray-600">
                <Clock className="w-4 h-4" />
                <span className="font-mono">{formatTime(timeElapsed)}</span>
              </div>
              <Button variant="destructive" size="sm" onClick={submitExam}>
                交卷
              </Button>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-gray-500 mt-1">
            第 {currentIndex + 1} / {examSession?.total_questions} 题
            {Object.keys(answers).length > 0 && ` · 已答 ${Object.keys(answers).length} 题`}
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {currentQuestion ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary">{getTypeName(currentQuestion.question_type)}</Badge>
                <span className="text-sm text-gray-500">{currentQuestion.chapter}</span>
              </div>

              <div className="mb-6">
                <p className="text-lg leading-relaxed">{currentQuestion.content}</p>
                {currentQuestion.image_url && (
                  <img 
                    src={currentQuestion.image_url} 
                    alt="题目图片" 
                    className="mt-4 max-w-full rounded-lg"
                  />
                )}
              </div>

              {currentQuestion.question_type === 'judge' ? (
                <RadioGroup
                  value={answers[currentQuestion.id] || ''}
                  onValueChange={(v) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: v }))}
                >
                  <div className="space-y-3">
                    {['正确', '错误'].map((option, idx) => {
                      const optionKey = idx === 0 ? 'A' : 'B';
                      const isSelected = answers[currentQuestion.id] === optionKey;
                      
                      return (
                        <div
                          key={optionKey}
                          className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                            isSelected ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'
                          }`}
                        >
                          <RadioGroupItem value={optionKey} id={optionKey} />
                          <Label htmlFor={optionKey} className="flex-1 cursor-pointer">
                            {optionKey}. {option}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </RadioGroup>
              ) : currentQuestion.question_type === 'single' ? (
                <RadioGroup
                  value={answers[currentQuestion.id] || ''}
                  onValueChange={(v) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: v }))}
                >
                  <div className="space-y-3">
                    {currentQuestion.options?.map((option, idx) => {
                      const optionKey = getOptionLabel(idx);
                      const isSelected = answers[currentQuestion.id] === optionKey;
                      
                      return (
                        <div
                          key={optionKey}
                          className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                            isSelected ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'
                          }`}
                        >
                          <RadioGroupItem value={optionKey} id={optionKey} />
                          <Label htmlFor={optionKey} className="flex-1 cursor-pointer">
                            {optionKey}. {option}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </RadioGroup>
              ) : (
                <div className="space-y-3">
                  {currentQuestion.options?.map((option, idx) => {
                    const optionKey = getOptionLabel(idx);
                    const currentAnswers = (answers[currentQuestion.id] || '').split(',').filter(Boolean);
                    const isSelected = currentAnswers.includes(optionKey);
                    
                    return (
                      <div
                        key={optionKey}
                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                          isSelected ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => {
                          const newAnswers = isSelected
                            ? currentAnswers.filter(k => k !== optionKey)
                            : [...currentAnswers, optionKey];
                          setAnswers(prev => ({
                            ...prev,
                            [currentQuestion.id]: newAnswers.sort().join(',')
                          }));
                        }}
                      >
                        <Checkbox checked={isSelected} className="pointer-events-none" />
                        <span className="flex-1 cursor-pointer">{optionKey}. {option}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setCurrentIndex(prev => prev - 1)}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />上一题
                </Button>
                <Button
                  onClick={() => setCurrentIndex(prev => prev + 1)}
                  disabled={currentIndex === (examSession?.total_questions || 0) - 1}
                >
                  下一题<ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Question Navigator */}
        <Card className="mt-4">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-2">
              {examSession?.questions.map((q, idx) => (
                <Button
                  key={q.id}
                  variant={answers[q.id] ? 'default' : 'outline'}
                  size="sm"
                  className={`w-10 h-10 p-0 ${idx === currentIndex ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setCurrentIndex(idx)}
                >
                  {idx + 1}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
