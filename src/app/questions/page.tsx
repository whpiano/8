'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Upload, Trash2, ChevronLeft, ChevronRight, Lock, ShieldCheck, Download } from 'lucide-react';
import { AdminLogin } from '@/components/AdminLogin';
import { parseCSV, generateCSV, CSV_SAMPLE, type QuestionData } from '@/lib/csv-utils';

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
  created_at: string;
}

interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    page_size: 10,
    total: 0,
    total_pages: 0
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    subject: '',
    chapter: '',
    question_type: ''
  });
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importCsv, setImportCsv] = useState('');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchQuestions();
    }
  }, [isAdmin, pagination.page, filter]);

  const checkAdminStatus = async () => {
    try {
      const res = await fetch('/api/admin/auth');
      const data = await res.json();
      setIsAdmin(data.isAdmin || false);
    } catch {
      setIsAdmin(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('page_size', pagination.page_size.toString());
      if (filter.subject) params.append('subject', filter.subject);
      if (filter.chapter) params.append('chapter', filter.chapter);
      if (filter.question_type) params.append('question_type', filter.question_type);

      const res = await fetch(`/api/questions?${params}`);
      const data = await res.json();
      if (data.success) {
        setQuestions(data.data);
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          total_pages: data.pagination.total_pages
        }));
      }
    } catch (error) {
      console.error('获取题目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importJson.trim()) {
      alert('请输入题目数据');
      return;
    }

    setImporting(true);
    try {
      let questions;
      try {
        questions = JSON.parse(importJson);
      } catch (parseError) {
        alert('JSON 格式错误，请检查：\n1. 确保使用英文引号 "" 而非中文引号 ""\n2. 确保数组/对象括号正确匹配\n3. 确保逗号分隔正确\n\n详细错误: ' + (parseError instanceof Error ? parseError.message : String(parseError)));
        setImporting(false);
        return;
      }
      
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Array.isArray(questions) ? questions : [questions])
      });
      
      if (!res.ok) {
        const text = await res.text();
        let errorMsg = `HTTP 错误 ${res.status}`;
        try {
          const errorData = JSON.parse(text);
          errorMsg = errorData.error || errorMsg;
        } catch {
          errorMsg = text || errorMsg;
        }
        alert('导入失败: ' + errorMsg);
        if (res.status === 401) {
          setIsAdmin(false);
        }
        setImporting(false);
        return;
      }
      
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setImportJson('');
        setImportDialogOpen(false);
        fetchQuestions();
      } else {
        alert('导入失败: ' + data.error);
      }
    } catch (error) {
      alert('网络请求失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setImporting(false);
    }
  };

  const handleImportCSV = async () => {
    if (!importCsv.trim()) {
      alert('请输入 CSV 数据');
      return;
    }

    setImporting(true);
    try {
      const questions = parseCSV(importCsv);
      
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questions)
      });
      
      if (!res.ok) {
        const text = await res.text();
        let errorMsg = `HTTP 错误 ${res.status}`;
        try {
          const errorData = JSON.parse(text);
          errorMsg = errorData.error || errorMsg;
        } catch {
          errorMsg = text || errorMsg;
        }
        alert('导入失败: ' + errorMsg);
        if (res.status === 401) {
          setIsAdmin(false);
        }
        setImporting(false);
        return;
      }
      
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setImportCsv('');
        setImportDialogOpen(false);
        fetchQuestions();
      } else {
        alert('导入失败: ' + data.error);
      }
    } catch (error) {
      alert('CSV 解析失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // 获取所有题目（不限制分页）
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('page_size', '10000'); // 获取大量数据
      if (filter.subject) params.append('subject', filter.subject);
      if (filter.chapter) params.append('chapter', filter.chapter);
      if (filter.question_type) params.append('question_type', filter.question_type);

      const res = await fetch(`/api/questions?${params}`);
      const data = await res.json();
      
      if (!data.success || !data.data || data.data.length === 0) {
        alert('没有可导出的题目');
        return;
      }

      // 转换为 CSV
      const questions: QuestionData[] = data.data.map((q: Question) => ({
        subject: q.subject,
        chapter: q.chapter,
        question_type: q.question_type,
        content: q.content,
        options: q.options || [],
        answer: q.answer,
        explanation: q.explanation || '',
        difficulty: q.difficulty
      }));

      const csv = generateCSV(questions);
      
      // 下载文件
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }); // 添加 BOM 解决中文乱码
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `题库导出_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('导出失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这道题目吗？')) return;
    
    try {
      const res = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchQuestions();
      } else {
        alert(data.error);
        if (res.status === 401) {
          setIsAdmin(false);
        }
      }
    } catch {
      alert('删除失败');
    }
  };

  const getSubjectName = (subject: string) => {
    return subject === 'geography' ? '地理' : '生物';
  };

  const getTypeName = (type: string) => {
    const types: Record<string, string> = {
      single: '单选',
      multiple: '多选',
      judge: '判断'
    };
    return types[type] || type;
  };

  const sampleData = [
    {
      subject: 'geography',
      chapter: '地球与地图',
      question_type: 'single',
      content: '地球的形状是？',
      options: ['正方体', '球体', '椭圆形', '不规则形状'],
      answer: 'B',
      explanation: '地球是一个两极稍扁、赤道略鼓的不规则球体。',
      difficulty: 1
    },
    {
      subject: 'biology',
      chapter: '细胞',
      question_type: 'single',
      content: '细胞的基本结构包括？',
      options: ['细胞壁、细胞膜', '细胞膜、细胞质、细胞核', '细胞核、线粒体', '叶绿体、细胞壁'],
      answer: 'B',
      explanation: '细胞是生物体结构和功能的基本单位。',
      difficulty: 2
    }
  ];

  // 加载中状态
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">题库管理</h1>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </main>
      </div>
    );
  }

  // 非管理员状态 - 只显示登录界面
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold">题库管理</h1>
            </div>
            <AdminLogin 
              isAdmin={isAdmin} 
              onLoginSuccess={() => setIsAdmin(true)}
              onLogout={() => setIsAdmin(false)}
            />
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle>需要管理员权限</CardTitle>
              <CardDescription>
                题库管理功能仅限管理员使用，请点击右上角「管理员登录」按钮
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center text-sm text-gray-500">
              <p>默认管理员密码：<code className="bg-gray-100 px-2 py-1 rounded">admin123</code></p>
              <p className="mt-2">可在环境变量 ADMIN_PASSWORD 中修改</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // 管理员状态 - 显示完整管理界面
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">题库管理</h1>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <ShieldCheck className="w-3 h-3" />
                <span>已登录管理员</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport} disabled={exporting}>
              <Download className="w-4 h-4 mr-2" />
              {exporting ? '导出中...' : '导出CSV'}
            </Button>
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="w-4 h-4 mr-2" />
                  导入题目
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>导入题目</DialogTitle>
                  <DialogDescription>
                    支持 JSON 和 CSV 格式批量导入
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="csv" className="mt-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="csv">CSV 导入</TabsTrigger>
                    <TabsTrigger value="json">JSON 导入</TabsTrigger>
                    <TabsTrigger value="sample">示例数据</TabsTrigger>
                  </TabsList>
                  <TabsContent value="csv" className="space-y-4">
                    <div className="space-y-2">
                      <Label>题目数据 (CSV 格式)</Label>
                      <Textarea
                        placeholder={`subject,chapter,question_type,content,option_a,option_b,option_c,option_d,answer,explanation,difficulty
geography,地球与地图,single,地球的形状是？,正方体,球体,椭圆形,不规则形状,B,地球是一个两极稍扁、赤道略鼓的不规则球体。,1`}
                        value={importCsv}
                        onChange={(e) => setImportCsv(e.target.value)}
                        className="font-mono text-sm min-h-[300px]"
                      />
                    </div>
                    <div className="text-sm text-gray-500 space-y-2">
                      <p><strong>CSV 格式说明：</strong></p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>第一行为标题行，必须包含：subject, chapter, question_type, content, answer</li>
                        <li>选项列：option_a, option_b, option_c, option_d, option_e, option_f（根据需要填写）</li>
                        <li>subject: geography(地理) / biology(生物) / 地理 / 生物</li>
                        <li>question_type: single(单选) / multiple(多选) / judge(判断) / 单选 / 多选 / 判断</li>
                        <li>answer: 正确答案（如 A 或 A,B,C），多选用逗号分隔</li>
                        <li>difficulty: 难度 1-5</li>
                        <li>包含逗号的字段请用双引号包裹，如 "选项A,包含逗号"</li>
                      </ul>
                    </div>
                    <Button onClick={handleImportCSV} disabled={importing} className="w-full">
                      {importing ? '导入中...' : '确认导入 CSV'}
                    </Button>
                  </TabsContent>
                  <TabsContent value="json" className="space-y-4">
                    <div className="space-y-2">
                      <Label>题目数据 (JSON 格式)</Label>
                      <Textarea
                        placeholder={`[
  {
    "subject": "geography",
    "chapter": "章节名称",
    "question_type": "single",
    "content": "题目内容",
    "options": ["选项A", "选项B", "选项C", "选项D"],
    "answer": "A",
    "explanation": "解析说明",
    "difficulty": 1
  }
]`}
                        value={importJson}
                        onChange={(e) => setImportJson(e.target.value)}
                        className="font-mono text-sm min-h-[300px]"
                      />
                    </div>
                    <div className="text-sm text-gray-500">
                      <p><strong>字段说明：</strong></p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>subject: geography(地理) / biology(生物)</li>
                        <li>question_type: single(单选) / multiple(多选) / judge(判断)</li>
                        <li>options: 选项数组（判断题可为空）</li>
                        <li>answer: 正确答案，多选用逗号分隔如 "A,C"</li>
                        <li>difficulty: 难度 1-5</li>
                      </ul>
                    </div>
                    <Button onClick={handleImport} disabled={importing} className="w-full">
                      {importing ? '导入中...' : '确认导入 JSON'}
                    </Button>
                  </TabsContent>
                  <TabsContent value="sample" className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-3">点击下方按钮导入示例数据，快速体验系统功能</p>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => {
                            setImportCsv(CSV_SAMPLE);
                          }}
                          variant="outline"
                        >
                          填充 CSV 示例
                        </Button>
                        <Button 
                          onClick={() => {
                            setImportJson(JSON.stringify(sampleData, null, 2));
                          }}
                          variant="outline"
                        >
                          填充 JSON 示例
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium mb-2">CSV 示例：</p>
                        <pre className="bg-gray-100 p-3 rounded-lg text-xs overflow-x-auto max-h-[200px] overflow-y-auto">
                          {CSV_SAMPLE.split('\n').slice(0, 5).join('\n')}
                        </pre>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">JSON 示例：</p>
                        <pre className="bg-gray-100 p-3 rounded-lg text-xs overflow-x-auto max-h-[200px] overflow-y-auto">
                          {JSON.stringify(sampleData, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
            <AdminLogin 
              isAdmin={isAdmin} 
              onLoginSuccess={() => setIsAdmin(true)}
              onLogout={() => setIsAdmin(false)}
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-sm text-gray-500">科目</Label>
                <Select 
                  value={filter.subject} 
                  onValueChange={(v) => setFilter(prev => ({ ...prev, subject: v === 'all' ? '' : v }))}
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
              <div className="flex-1 min-w-[200px]">
                <Label className="text-sm text-gray-500">题型</Label>
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
              <div className="flex items-end">
                <Button variant="outline" onClick={() => setFilter({ subject: '', chapter: '', question_type: '' })}>
                  重置筛选
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              题目列表 
              {pagination.total > 0 && <span className="text-gray-500 font-normal ml-2">共 {pagination.total} 题</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无题目，请点击「导入题目」按钮添加
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">ID</TableHead>
                        <TableHead className="w-20">科目</TableHead>
                        <TableHead className="w-20">题型</TableHead>
                        <TableHead>题目内容</TableHead>
                        <TableHead className="w-20">答案</TableHead>
                        <TableHead className="w-20">难度</TableHead>
                        <TableHead className="w-20">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {questions.map((q) => (
                        <TableRow key={q.id}>
                          <TableCell>{q.id}</TableCell>
                          <TableCell>
                            <Badge variant={q.subject === 'geography' ? 'default' : 'secondary'}>
                              {getSubjectName(q.subject)}
                            </Badge>
                          </TableCell>
                          <TableCell>{getTypeName(q.question_type)}</TableCell>
                          <TableCell className="max-w-xs truncate">{q.content}</TableCell>
                          <TableCell className="font-mono">{q.answer}</TableCell>
                          <TableCell>{'★'.repeat(q.difficulty)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(q.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-500">
                    第 {pagination.page} / {pagination.total_pages} 页
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.total_pages}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
