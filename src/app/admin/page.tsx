'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Settings, Users, Link as LinkIcon, Save, Plus, Trash2, Clock, Zap, ShieldCheck } from 'lucide-react';
import { AdminLogin } from '@/components/AdminLogin';

interface SystemConfig {
  free_count: { value: string; description: string };
  vip_price: { value: string; description: string };
  vip_duration_hours: { value: string; description: string };
  friend_links: { value: string; description: string };
  questions_page_notice: { value: string; description: string };
  [key: string]: { value: string; description: string };
}

interface User {
  id: number;
  username: string;
  free_count: number;
  vip_expired_at: string | null;
  created_at: string;
}

interface FriendLink {
  name: string;
  url: string;
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [userPagination, setUserPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [searchUsername, setSearchUsername] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 编辑用户弹窗
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAction, setEditAction] = useState<'add_vip_hours' | 'set_vip_expired' | 'add_free_count' | 'set_free_count'>('add_vip_hours');
  const [editValue, setEditValue] = useState('');

  // 友情链接
  const [friendLinks, setFriendLinks] = useState<FriendLink[]>([]);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchConfig();
      fetchUsers();
    }
  }, [isAdmin, userPagination.page, searchUsername]);

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

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/config');
      const data = await res.json();
      if (data.success) {
        setConfig(data.data);
        // 解析友情链接
        try {
          const links = JSON.parse(data.data.friend_links?.value || '[]');
          setFriendLinks(links);
        } catch {
          setFriendLinks([]);
        }
      }
    } catch (error) {
      console.error('获取配置失败:', error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', userPagination.page.toString());
      params.append('pageSize', userPagination.pageSize.toString());
      if (searchUsername) params.append('search', searchUsername);

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
        setUserPagination(data.pagination);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (key: string, value: string) => {
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      const data = await res.json();
      if (data.success) {
        alert('配置已更新');
        fetchConfig();
      } else {
        alert('更新失败: ' + data.error);
      }
    } catch (error) {
      alert('更新失败');
    }
  };

  const updateUser = async () => {
    if (!editUser || !editValue) {
      alert('请输入值');
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editUser.id,
          action: editAction,
          value: editValue
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('操作成功');
        setEditDialogOpen(false);
        setEditUser(null);
        setEditValue('');
        fetchUsers();
      } else {
        alert('操作失败: ' + data.error);
      }
    } catch (error) {
      alert('操作失败');
    }
  };

  const deleteUser = async (userId: number, username: string) => {
    if (!confirm(`确定要删除用户 "${username}" 吗？此操作不可恢复！`)) return;

    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        alert('用户已删除');
        fetchUsers();
      } else {
        alert('删除失败: ' + data.error);
      }
    } catch (error) {
      alert('删除失败');
    }
  };

  const saveFriendLinks = async () => {
    await updateConfig('friend_links', JSON.stringify(friendLinks));
  };

  const addFriendLink = () => {
    setFriendLinks([...friendLinks, { name: '', url: '' }]);
  };

  const updateFriendLink = (index: number, field: 'name' | 'url', value: string) => {
    const newLinks = [...friendLinks];
    newLinks[index][field] = value;
    setFriendLinks(newLinks);
  };

  const removeFriendLink = (index: number) => {
    setFriendLinks(friendLinks.filter((_, i) => i !== index));
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const isVipActive = (expiredAt: string | null) => {
    if (!expiredAt) return false;
    return new Date(expiredAt) > new Date();
  };

  // 加载中
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 非管理员
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
              <h1 className="text-xl font-bold">管理员后台</h1>
            </div>
            <AdminLogin 
              isAdmin={isAdmin} 
              onLoginSuccess={() => setIsAdmin(true)}
              onLogout={() => setIsAdmin(false)}
            />
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto text-center">
            <CardHeader>
              <ShieldCheck className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <CardTitle>需要管理员权限</CardTitle>
              <CardDescription>请点击右上角「管理员登录」按钮</CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

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
              <h1 className="text-xl font-bold">管理员后台</h1>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> 已登录
              </p>
            </div>
          </div>
          <AdminLogin 
            isAdmin={isAdmin} 
            onLoginSuccess={() => setIsAdmin(true)}
            onLogout={() => setIsAdmin(false)}
          />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="config">
          <TabsList className="mb-6">
            <TabsTrigger value="config"><Settings className="w-4 h-4 mr-2 inline" />系统配置</TabsTrigger>
            <TabsTrigger value="users"><Users className="w-4 h-4 mr-2 inline" />用户管理</TabsTrigger>
            <TabsTrigger value="links"><LinkIcon className="w-4 h-4 mr-2 inline" />友情链接</TabsTrigger>
          </TabsList>

          {/* 系统配置 */}
          <TabsContent value="config">
            <Card>
              <CardHeader>
                <CardTitle>系统配置</CardTitle>
                <CardDescription>配置系统的基本参数</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>新用户免费答题次数</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        value={config?.free_count?.value || '10'} 
                        onChange={(e) => setConfig(prev => prev ? { ...prev, free_count: { ...prev.free_count, value: e.target.value }} : prev)}
                      />
                      <Button onClick={() => updateConfig('free_count', config?.free_count?.value || '10')}>
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">{config?.free_count?.description}</p>
                  </div>

                  <div className="space-y-2">
                    <Label>VIP 价格（元）</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        value={config?.vip_price?.value || '10'} 
                        onChange={(e) => setConfig(prev => prev ? { ...prev, vip_price: { ...prev.vip_price, value: e.target.value }} : prev)}
                      />
                      <Button onClick={() => updateConfig('vip_price', config?.vip_price?.value || '10')}>
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">{config?.vip_price?.description}</p>
                  </div>

                  <div className="space-y-2">
                    <Label>VIP 有效期（小时）</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        value={config?.vip_duration_hours?.value || '24'} 
                        onChange={(e) => setConfig(prev => prev ? { ...prev, vip_duration_hours: { ...prev.vip_duration_hours, value: e.target.value }} : prev)}
                      />
                      <Button onClick={() => updateConfig('vip_duration_hours', config?.vip_duration_hours?.value || '24')}>
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">{config?.vip_duration_hours?.description}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>题库管理页面非管理员提示</Label>
                  <div className="flex gap-2">
                    <Textarea 
                      value={config?.questions_page_notice?.value || ''} 
                      onChange={(e) => setConfig(prev => prev ? { ...prev, questions_page_notice: { ...prev.questions_page_notice, value: e.target.value }} : prev)}
                      rows={3}
                    />
                    <Button onClick={() => updateConfig('questions_page_notice', config?.questions_page_notice?.value || '')}>
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">非管理员访问题库管理页面时显示的提示内容</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 用户管理 */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>用户管理</CardTitle>
                <CardDescription>管理注册用户，调整会员时长和免费次数</CardDescription>
              </CardHeader>
              <CardContent>
                {/* 搜索 */}
                <div className="flex gap-4 mb-4">
                  <Input 
                    placeholder="搜索用户名..." 
                    value={searchUsername}
                    onChange={(e) => {
                      setSearchUsername(e.target.value);
                      setUserPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    className="max-w-xs"
                  />
                </div>

                {/* 用户列表 */}
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>用户名</TableHead>
                          <TableHead>VIP 状态</TableHead>
                          <TableHead>免费次数</TableHead>
                          <TableHead>注册时间</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>{user.id}</TableCell>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>
                              {isVipActive(user.vip_expired_at) ? (
                                <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                                  VIP至 {formatDateTime(user.vip_expired_at)}
                                </Badge>
                              ) : (
                                <Badge variant="secondary">普通用户</Badge>
                              )}
                            </TableCell>
                            <TableCell>{user.free_count}</TableCell>
                            <TableCell>{formatDateTime(user.created_at)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setEditUser(user);
                                    setEditAction('add_vip_hours');
                                    setEditValue('24');
                                    setEditDialogOpen(true);
                                  }}
                                >
                                  <Clock className="w-4 h-4 mr-1" /> VIP
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setEditUser(user);
                                    setEditAction('add_free_count');
                                    setEditValue('10');
                                    setEditDialogOpen(true);
                                  }}
                                >
                                  <Zap className="w-4 h-4 mr-1" /> 次数
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => deleteUser(user.id, user.username)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* 分页 */}
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-gray-500">
                        共 {userPagination.total} 个用户
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={userPagination.page <= 1}
                          onClick={() => setUserPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        >
                          上一页
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={userPagination.page >= userPagination.totalPages}
                          onClick={() => setUserPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        >
                          下一页
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 友情链接 */}
          <TabsContent value="links">
            <Card>
              <CardHeader>
                <CardTitle>友情链接</CardTitle>
                <CardDescription>配置页面底部显示的友情链接</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {friendLinks.map((link, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Input 
                      placeholder="链接名称" 
                      value={link.name}
                      onChange={(e) => updateFriendLink(index, 'name', e.target.value)}
                      className="w-40"
                    />
                    <Input 
                      placeholder="链接地址 https://..." 
                      value={link.url}
                      onChange={(e) => updateFriendLink(index, 'url', e.target.value)}
                    />
                    <Button variant="destructive" size="icon" onClick={() => removeFriendLink(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={addFriendLink}>
                    <Plus className="w-4 h-4 mr-2" /> 添加链接
                  </Button>
                  <Button onClick={saveFriendLinks}>
                    <Save className="w-4 h-4 mr-2" /> 保存配置
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* 编辑用户弹窗 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户: {editUser?.username}</DialogTitle>
            <DialogDescription>
              当前 VIP: {editUser?.vip_expired_at ? formatDateTime(editUser.vip_expired_at) : '未开通'}，
              免费次数: {editUser?.free_count}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>操作类型</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant={editAction === 'add_vip_hours' ? 'default' : 'outline'}
                  onClick={() => setEditAction('add_vip_hours')}
                >
                  增加VIP时长
                </Button>
                <Button 
                  variant={editAction === 'set_vip_expired' ? 'default' : 'outline'}
                  onClick={() => setEditAction('set_vip_expired')}
                >
                  设置VIP过期时间
                </Button>
                <Button 
                  variant={editAction === 'add_free_count' ? 'default' : 'outline'}
                  onClick={() => setEditAction('add_free_count')}
                >
                  增加免费次数
                </Button>
                <Button 
                  variant={editAction === 'set_free_count' ? 'default' : 'outline'}
                  onClick={() => setEditAction('set_free_count')}
                >
                  设置免费次数
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                {editAction === 'add_vip_hours' && '增加小时数'}
                {editAction === 'set_vip_expired' && '过期时间 (ISO格式，如 2024-12-31T23:59:59)'}
                {editAction === 'add_free_count' && '增加次数'}
                {editAction === 'set_free_count' && '设置次数'}
              </Label>
              <Input 
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                type={editAction === 'set_vip_expired' ? 'text' : 'number'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
            <Button onClick={updateUser}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
