'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import UserAuth from '@/components/UserAuth';
import PaymentModal from '@/components/PaymentModal';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X,
  Lightbulb,
  Play,
  Crown
} from 'lucide-react';

interface Question {
  id: number;
  subject: string;
  chapter: string;
  question_type: string;
  content: string;
  options: string[] | null;
  answer: string;
  explanation: string | null;
  difficulty: number;
  image_url: string | null;
}

interface QuestionWithIndex extends Question {
  index: number;
}

interface ChapterInfo {
  name: string;
  geography: number;
  biology: number;
  total: number;
}

interface QuotaInfo {
  isLoggedIn: boolean;
  canAnswer: boolean;
  reason: string;
  freeCount: number;
  isVip: boolean;
  vipExpiredAt: string | null;
}

export default function PracticePage() {
  const [questions, setQuestions] = useState<QuestionWithIndex[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [selectedMultiple, setSelectedMultiple] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [filter, setFilter] = useState({
    subject: '',
    question_type: '',
    chapters: [] as string[]
  });
  const [showFilter, setShowFilter] = useState(true);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  
  // 用户相关状态
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [freeCount, setFreeCount] = useState<number | null>(null);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  // 获取章节列表
  useEffect(() => {
    fetchChapters();
  }, []);

  const fetchChapters = async () => {
    try {
      const res = await fetch('/api/questions/chapters');
      const data = await res.json();
      if (data.success) {
        setChapters(data.data || []);
      }
    } catch (error) {
      console.error('获取章节失败:', error);
    }
  };

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('page_size', '1000');
      if (filter.subject) params.append('subject', filter.subject);
      if (filter.question_type) params.append('question_type', filter.question_type);
      
      // 如果选择了章节，逐个查询
      if (filter.chapters.length > 0) {
        const allQuestions: Question[] = [];
        for (const chapter of filter.chapters) {
          const chapterParams = new URLSearchParams(params);
          chapterParams.append('chapter', chapter);
          const res = await fetch(`/api/questions?${chapterParams}`);
          const data = await res.json();
          if (data.success && data.data) {
            allQuestions.push(...data.data);
          }
        }
        const questionsWithIndex = allQuestions.map((q, idx) => ({
          ...q,
          index: idx + 1
        }));
        setQuestions(questionsWithIndex);
      } else {
        const res = await fetch(`/api/questions?${params}`);
        const data = await res.json();
        if (data.success) {
          const questionsWithIndex = data.data.map((q: Question, idx: number) => ({
            ...q,
            index: idx + 1
          }));
          setQuestions(questionsWithIndex);
        }
      }
      
      setCurrentIndex(0);
      resetAnswer();
    } catch (error) {
      console.error('获取题目失败:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!showFilter) {
      fetchQuestions();
    }
  }, [showFilter, fetchQuestions]);

  const resetAnswer = () => {
    setSelectedAnswer('');
    setSelectedMultiple([]);
    setSubmitted(false);
    setIsCorrect(false);
  };

  const handleStartPractice = () => {
    setShowFilter(false);
    setCorrectCount(0);
    setAnsweredCount(0);
  };

  const handleSubmit = async () => {
    if (!currentQuestion) return;

    const answer = currentQuestion.question_type === 'multiple' 
      ? selectedMultiple.sort().join(',')
      : selectedAnswer;

    if (!answer && currentQuestion.question_type !== 'judge') {
      alert('请选择答案');
      return;
    }

    try {
      const res = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          user_answer: answer
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setIsCorrect(data.data.is_correct);
        setSubmitted(true);
        setAnsweredCount(prev => prev + 1);
        if (data.data.is_correct) {
          setCorrectCount(prev => prev + 1);
        }
        // 更新剩余次数
        if (data.freeCount !== undefined) {
          setFreeCount(data.freeCount);
        }
      } else if (data.needLogin) {
        // 未登录用户次数用完，提示登录
        alert('免费答题次数已用完，请登录获取更多次数');
      } else if (data.needPayment) {
        // 需要支付
        setShowPayment(true);
      }
    } catch (error) {
      console.error('提交失败:', error);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
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

  const handleJumpTo = (index: number) => {
    setCurrentIndex(index);
    resetAnswer();
  };

  const toggleChapter = (chapterName: string) => {
    setFilter(prev => ({
      ...prev,
      chapters: prev.chapters.includes(chapterName)
        ? prev.chapters.filter(c => c !== chapterName)
        : [...prev.chapters, chapterName]
    }));
  };

  const selectAllChapters = () => {
    setFilter(prev => ({
      ...prev,
      chapters: chapters.map(c => c.name)
    }));
  };

  const clearChapters = () => {
    setFilter(prev => ({
      ...prev,
      chapters: []
    }));
  };

  const getOptionLabel = (index: number) => {
    return String.fromCharCode(65 + index);
  };

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

  // 获取过滤后的章节
  const filteredChapters = chapters.filter(c => {
    if (filter.subject === 'geography') return c.geography > 0;
    if (filter.subject === 'biology') return c.biology > 0;
    return c.total > 0;
  });

  // 筛选界面
  if (showFilter) {
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
              <h1 className="text-xl font-bold">顺序练习</h1>
            </div>
            <UserAuth 
              onLoginChange={setIsLoggedIn}
              onQuotaChange={setQuota}
              showPayment={() => setShowPayment(true)}
            />
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* 未登录提示 */}
          {!isLoggedIn && (
            <Card className="border-blue-200 bg-blue-50 mb-6">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Lightbulb className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-800">登录后可记录答题进度</p>
                    <p className="text-sm text-blue-600">新用户注册赠送 10 次免费答题</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>选择练习范围</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>科目</Label>
                  <Select 
                    value={filter.subject} 
                    onValueChange={(v) => {
                      setFilter(prev => ({ 
                        ...prev, 
                        subject: v === 'all' ? '' : v,
                        chapters: [] // 切换科目时清空章节选择
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="全部科目" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部科目</SelectItem>
                      <SelectItem value="geography">地理</SelectItem>
                      <SelectItem value="biology">生物</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>题型</Label>
                  <Select 
                    value={filter.question_type} 
                    onValueChange={(v) => setFilter(prev => ({ ...prev, question_type: v === 'all' ? '' : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="全部题型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部题型</SelectItem>
                      <SelectItem value="single">单选题</SelectItem>
                      <SelectItem value="multiple">多选题</SelectItem>
                      <SelectItem value="judge">判断题</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 章节选择 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>章节选择（可选多个）</Label>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAllChapters}>
                      全选
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearChapters}>
                      清空
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-[200px] border rounded-lg p-3">
                  {filteredChapters.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">暂无章节</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredChapters.map((chapter) => (
                        <div
                          key={chapter.name}
                          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                            filter.chapters.includes(chapter.name)
                              ? 'bg-blue-50 border border-blue-200'
                              : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                          onClick={() => toggleChapter(chapter.name)}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={filter.chapters.includes(chapter.name)}
                              className="pointer-events-none"
                            />
                            <span>{chapter.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            {(!filter.subject || filter.subject === 'geography') && chapter.geography > 0 && (
                              <Badge variant="outline" className="text-blue-600">
                                地理 {chapter.geography}
                              </Badge>
                            )}
                            {(!filter.subject || filter.subject === 'biology') && chapter.biology > 0 && (
                              <Badge variant="outline" className="text-green-600">
                                生物 {chapter.biology}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                {filter.chapters.length > 0 && (
                  <p className="text-sm text-gray-500">
                    已选择 {filter.chapters.length} 个章节
                  </p>
                )}
              </div>

              {loading && (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              )}

              {!loading && questions.length === 0 && !showFilter && (
                <p className="text-center text-gray-500 py-4">
                  当前筛选条件下没有题目，请调整筛选条件或前往题库管理添加题目
                </p>
              )}

              <div className="pt-4 border-t">
                <Button onClick={handleStartPractice} className="w-full" size="lg">
                  <Play className="w-4 h-4 mr-2" />
                  开始练习
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        
        {/* Payment Modal */}
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

  // 答题界面
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-bold">顺序练习</h1>
                <p className="text-sm text-gray-500">
                  第 {currentIndex + 1} / {questions.length} 题
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* 显示剩余次数 */}
              {quota && (
                <div className="text-right">
                  {quota.isVip ? (
                    <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                      <Crown className="w-3 h-3 mr-1" />
                      VIP
                    </Badge>
                  ) : (
                    <p className="text-sm">
                      剩余: <strong className={(freeCount !== null ? freeCount <= 0 : quota.freeCount <= 0) ? 'text-red-500' : ''}>
                        {freeCount !== null ? freeCount : quota.freeCount}
                      </strong> 次
                    </p>
                  )}
                </div>
              )}
              <div className="text-right">
                <p className="text-sm">
                  正确率: <strong>{answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0}%</strong>
                </p>
                <p className="text-xs text-gray-500">
                  {correctCount}/{answeredCount}
                </p>
              </div>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : currentQuestion ? (
          <Card>
            <CardContent className="pt-6">
              {/* Question Header */}
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline">
                  {getSubjectName(currentQuestion.subject)}
                </Badge>
                <Badge variant="secondary">
                  {getTypeName(currentQuestion.question_type)}
                </Badge>
                <span className="text-sm text-gray-500">
                  {currentQuestion.chapter}
                </span>
                <span className="text-yellow-500 ml-auto">
                  {'★'.repeat(currentQuestion.difficulty)}
                </span>
              </div>

              {/* Question Content */}
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

              {/* Options */}
              {currentQuestion.question_type === 'judge' ? (
                <RadioGroup
                  value={selectedAnswer}
                  onValueChange={setSelectedAnswer}
                  disabled={submitted}
                >
                  <div className="space-y-3">
                    {['正确', '错误'].map((option, idx) => {
                      const optionKey = idx === 0 ? 'A' : 'B';
                      const isThisCorrect = currentQuestion.answer === optionKey;
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
                          {submitted && isThisCorrect && (
                            <Check className="w-5 h-5 text-green-500" />
                          )}
                          {submitted && isSelected && !isThisCorrect && (
                            <X className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </RadioGroup>
              ) : currentQuestion.question_type === 'single' ? (
                <RadioGroup
                  value={selectedAnswer}
                  onValueChange={setSelectedAnswer}
                  disabled={submitted}
                >
                  <div className="space-y-3">
                    {currentQuestion.options?.map((option, idx) => {
                      const optionKey = getOptionLabel(idx);
                      const isThisCorrect = currentQuestion.answer === optionKey;
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
                          {submitted && isThisCorrect && (
                            <Check className="w-5 h-5 text-green-500" />
                          )}
                          {submitted && isSelected && !isThisCorrect && (
                            <X className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </RadioGroup>
              ) : (
                <div className="space-y-3">
                  {currentQuestion.options?.map((option, idx) => {
                    const optionKey = getOptionLabel(idx);
                    const correctAnswers = currentQuestion.answer.split(',').map(s => s.trim());
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
                        <Checkbox
                          checked={isSelected}
                          disabled={submitted}
                          className="pointer-events-none"
                        />
                        <span className="flex-1 cursor-pointer">
                          {optionKey}. {option}
                        </span>
                        {submitted && isThisCorrect && (
                          <Check className="w-5 h-5 text-green-500" />
                        )}
                        {submitted && isSelected && !isThisCorrect && (
                          <X className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Answer Result */}
              {submitted && (
                <div className={`mt-6 p-4 rounded-lg ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {isCorrect ? (
                      <>
                        <Check className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-600">回答正确</span>
                      </>
                    ) : (
                      <>
                        <X className="w-5 h-5 text-red-600" />
                        <span className="font-medium text-red-600">回答错误</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm">
                    正确答案: <strong>{currentQuestion.answer}</strong>
                  </p>
                  {currentQuestion.explanation && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5" />
                        <p className="text-sm text-gray-600">{currentQuestion.explanation}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  上一题
                </Button>
                
                {!submitted ? (
                  <Button onClick={handleSubmit}>
                    提交答案
                  </Button>
                ) : (
                  <Button onClick={handleNext} disabled={currentIndex === questions.length - 1}>
                    下一题
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Question Navigator */}
        {!loading && questions.length > 0 && (
          <Card className="mt-4">
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2">
                {questions.map((q, idx) => (
                  <Button
                    key={q.id}
                    variant={idx === currentIndex ? 'default' : 'outline'}
                    size="sm"
                    className="w-10 h-10 p-0"
                    onClick={() => handleJumpTo(idx)}
                  >
                    {idx + 1}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      
      {/* Payment Modal */}
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
