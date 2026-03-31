# 部署指南：Supabase + Vercel

本文档详细介绍如何将初中地生会考练习系统部署到 Vercel，并使用 Supabase 作为数据库。

---

## 📋 目录

1. [准备工作](#准备工作)
2. [第一步：创建 Supabase 项目](#第一步创建-supabase-项目)
3. [第二步：配置数据库表](#第二步配置数据库表)
4. [第三步：获取 API 密钥](#第三步获取-api-密钥)
5. [第四步：部署到 Vercel](#第四步部署到-vercel)
6. [第五步：配置环境变量](#第五步配置环境变量)
7. [第六步：验证部署](#第六步验证部署)
8. [常见问题](#常见问题)

---

## 准备工作

在开始之前，请确保你有以下账号：

- [GitHub 账号](https://github.com) - 用于存放代码
- [Supabase 账号](https://supabase.com) - 免费的 PostgreSQL 数据库
- [Vercel 账号](https://vercel.com) - 免费的部署平台

---

## 第一步：创建 Supabase 项目

### 1.1 登录 Supabase

访问 [https://supabase.com](https://supabase.com)，点击 **Start your project** 登录或注册。

### 1.2 创建新项目

1. 点击 **New Project**
2. 填写项目信息：
   - **Name**: `geo-bio-exam` （或你喜欢的名称）
   - **Database Password**: 设置一个强密码（**请保存好，后续无法查看**）
   - **Region**: 选择 `Northeast Asia (Tokyo)` 或 `Southeast Asia (Singapore)` 以获得更低的延迟
3. 点击 **Create new project**
4. 等待约 2 分钟，项目创建完成

---

## 第二步：配置数据库表

### 2.1 打开 SQL 编辑器

1. 在 Supabase 项目仪表板中，点击左侧菜单的 **SQL Editor**
2. 点击 **New query** 创建新查询

### 2.2 执行建表 SQL

复制以下 SQL 语句，粘贴到编辑器中，然后点击 **Run** 执行：

```sql
-- ============ 题目相关表 ============

-- 题目表
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  subject VARCHAR(20) NOT NULL,
  chapter VARCHAR(100) NOT NULL,
  question_type VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  options JSONB,
  answer VARCHAR(100) NOT NULL,
  explanation TEXT,
  difficulty INTEGER DEFAULT 1 NOT NULL,
  image_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============ 用户相关表 ============

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  free_count INTEGER DEFAULT 10 NOT NULL,
  vip_expired_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expired_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 已使用的支付凭证码表
CREATE TABLE IF NOT EXISTS used_payment_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============ 答题相关表 ============

-- 答题记录表
CREATE TABLE IF NOT EXISTS answer_records (
  id SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_answer VARCHAR(100) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

-- 错题本表
CREATE TABLE IF NOT EXISTS wrong_questions (
  id SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  wrong_count INTEGER DEFAULT 1 NOT NULL,
  last_wrong_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  mastered BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

-- ============ 考试相关表 ============

-- 模拟考试表
CREATE TABLE IF NOT EXISTS exam_sessions (
  id SERIAL PRIMARY KEY,
  subject VARCHAR(20) NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_count INTEGER DEFAULT 0 NOT NULL,
  score INTEGER DEFAULT 0 NOT NULL,
  duration INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  finished_at TIMESTAMP WITH TIME ZONE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

-- 考试答案表
CREATE TABLE IF NOT EXISTS exam_answers (
  id SERIAL PRIMARY KEY,
  exam_session_id INTEGER NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_answer VARCHAR(100),
  is_correct BOOLEAN,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ 创建索引 ============

-- 题目索引
CREATE INDEX IF NOT EXISTS questions_subject_idx ON questions(subject);
CREATE INDEX IF NOT EXISTS questions_chapter_idx ON questions(chapter);
CREATE INDEX IF NOT EXISTS questions_type_idx ON questions(question_type);

-- 答题记录索引
CREATE INDEX IF NOT EXISTS answer_records_question_id_idx ON answer_records(question_id);
CREATE INDEX IF NOT EXISTS answer_records_user_id_idx ON answer_records(user_id);

-- 错题本索引
CREATE INDEX IF NOT EXISTS wrong_questions_question_id_idx ON wrong_questions(question_id);
CREATE INDEX IF NOT EXISTS wrong_questions_user_id_idx ON wrong_questions(user_id);

-- 考试索引
CREATE INDEX IF NOT EXISTS exam_sessions_user_id_idx ON exam_sessions(user_id);
CREATE INDEX IF NOT EXISTS exam_answers_session_id_idx ON exam_answers(exam_session_id);

-- 用户会话索引
CREATE INDEX IF NOT EXISTS user_sessions_token_idx ON user_sessions(token);
CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions(user_id);

-- 支付凭证索引
CREATE INDEX IF NOT EXISTS used_payment_codes_code_idx ON used_payment_codes(code);
```

### 2.3 验证表创建成功

1. 点击左侧菜单的 **Table Editor**
2. 确认能看到以下表：
   - `questions` - 题目表
   - `users` - 用户表
   - `user_sessions` - 会话表
   - `answer_records` - 答题记录表
   - `wrong_questions` - 错题本表
   - `exam_sessions` - 考试表
   - `exam_answers` - 考试答案表
   - `used_payment_codes` - 支付凭证表

---

## 第三步：获取 API 密钥

### 3.1 获取项目 URL 和 API Key

1. 点击左侧菜单的 **Settings** (齿轮图标)
2. 点击 **API**
3. 找到以下信息并保存：

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **注意**：
- `anon key` 是公开的，可以暴露在前端代码中
- `service_role key` 是私密的，**绝对不要暴露**

---

## 第四步：部署到 Vercel

### 4.1 推送代码到 GitHub

1. 在 GitHub 创建新仓库
2. 将本地代码推送到 GitHub：

```bash
# 初始化 Git（如果还没有）
git init

# 添加远程仓库
git remote add origin https://github.com/你的用户名/你的仓库名.git

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit"

# 推送到 GitHub
git branch -M main
git push -u origin main
```

### 4.2 连接 Vercel

1. 访问 [https://vercel.com](https://vercel.com)
2. 使用 GitHub 账号登录
3. 点击 **Add New...** → **Project**
4. 选择你刚才推送的仓库
5. 点击 **Import**

### 4.3 配置项目

Vercel 会自动检测 Next.js 项目，无需额外配置：

- **Framework Preset**: Next.js (自动检测)
- **Root Directory**: `./`
- **Build Command**: `pnpm run build` (自动检测)
- **Output Directory**: `.next` (自动检测)

点击 **Deploy** 开始部署。

⚠️ **注意**：首次部署会失败，因为还没配置环境变量，这是正常的。

---

## 第五步：配置环境变量

### 5.1 添加环境变量

1. 部署完成后（或失败后），点击项目仪表板
2. 点击 **Settings** 选项卡
3. 点击左侧 **Environment Variables**
4. 添加以下变量：

| Name | Value | Environment |
|------|-------|-------------|
| `COZE_SUPABASE_URL` | `https://xxxxxxxxxxxxx.supabase.co` | Production, Preview, Development |
| `COZE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Production, Preview, Development |
| `ADMIN_PASSWORD` | `你的管理员密码` | Production |

### 5.2 重新部署

1. 点击 **Deployments** 选项卡
2. 找到最新的部署，点击右侧的 **...**
3. 点击 **Redeploy**
4. 确认重新部署

---

## 第六步：验证部署

### 6.1 访问网站

部署成功后，Vercel 会分配一个域名：
```
https://你的项目名.vercel.app
```

### 6.2 测试功能

1. **测试注册**：点击登录按钮，注册新用户
2. **测试登录**：使用注册的账号登录
3. **测试题库**：访问题库管理页面，导入示例题目
4. **测试练习**：访问顺序练习，开始答题

### 6.3 绑定自定义域名（可选）

1. 在 Vercel 项目仪表板，点击 **Settings** → **Domains**
2. 输入你的域名
3. 按照提示在域名服务商处添加 DNS 记录

---

## 常见问题

### Q1: 部署后访问报错 "Internal Server Error"

**原因**：环境变量未正确配置

**解决方案**：
1. 检查 Vercel 环境变量是否正确设置
2. 确认 Supabase URL 和 Key 正确
3. 重新部署项目

### Q2: 注册时报错 "Could not find the table"

**原因**：数据库表未创建

**解决方案**：
1. 登录 Supabase 控制台
2. 执行第二步中的建表 SQL
3. 确认 Table Editor 中能看到所有表

### Q3: 登录后状态未保持

**原因**：Cookie 设置问题

**解决方案**：
1. 确保访问的是 HTTPS 地址
2. 清除浏览器缓存后重试
3. 检查浏览器是否禁用了 Cookie

### Q4: 如何修改管理员密码

**方案一**：修改环境变量
1. 在 Vercel 设置中修改 `ADMIN_PASSWORD` 变量
2. 重新部署

**方案二**：使用默认密码
- 默认密码：`admin123`

### Q5: 数据库连接超时

**原因**：Supabase 项目可能进入休眠

**解决方案**：
1. Supabase 免费版项目 7 天无活动会暂停
2. 访问 Supabase 控制台唤醒项目
3. 考虑升级到 Pro 版避免休眠

### Q6: 如何备份数据

**方案一**：Supabase 控制台导出
1. 进入 Supabase 控制台
2. 点击 **Database** → **Backups**
3. 创建备份或导出 SQL

**方案二**：使用 pg_dump
```bash
pg_dump "postgresql://postgres:[密码]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres" > backup.sql
```

---

## 🎉 部署完成

恭喜！你已经成功将初中地生会考练习系统部署到 Vercel。

现在可以：
1. 导入题目（支持 JSON 和 CSV 格式）
2. 分享给同学使用
3. 根据需要自定义功能

如有问题，请参考 [常见问题](#常见问题) 或提交 Issue。
