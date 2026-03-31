# 初中地生会考练习系统

一个类似驾考宝典的初中地理生物会考在线练习系统，支持题库管理、错题本、顺序练习、模拟考试等功能。

## 功能特点

- **题库管理**：支持 JSON 格式批量导入，支持单选、多选、判断题
- **章节练习**：可按科目、题型、章节筛选练习
- **错题本**：自动收集错题，支持错题练习和标记已掌握
- **模拟考试**：支持地理/生物/综合考试，自动计时和评分
- **多用户系统**：每个用户独立的答题记录和错题本
- **免费试用**：新用户赠送 10 次免费答题
- **VIP 会员**：支付 10 元开通当日无限次刷题

## 技术栈

- **框架**: Next.js 16 (App Router)
- **UI**: shadcn/ui + Tailwind CSS 4
- **数据库**: Supabase (PostgreSQL)
- **支付**: ZhuPay 个人免签支付
- **语言**: TypeScript 5

## 本地开发

### 1. 克隆项目

```bash
git clone <项目地址>
cd projects
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env.local` 并填入配置：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
# Supabase 数据库（必填）
COZE_SUPABASE_URL=https://your-project.supabase.co
COZE_SUPABASE_ANON_KEY=your-anon-key

# 管理员密码（可选，默认 admin123）
ADMIN_PASSWORD=your-secure-password
```

### 4. 初始化数据库

在 Supabase SQL Editor 中执行以下 SQL：

```sql
-- ============ 题库相关表 ============

-- 题库表
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

-- 考试答题详情表
CREATE TABLE IF NOT EXISTS exam_answers (
  id SERIAL PRIMARY KEY,
  exam_session_id INTEGER NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_answer VARCHAR(100),
  is_correct BOOLEAN,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- ============ 创建索引 ============

CREATE INDEX IF NOT EXISTS questions_subject_idx ON questions(subject);
CREATE INDEX IF NOT EXISTS questions_chapter_idx ON questions(chapter);
CREATE INDEX IF NOT EXISTS answer_records_question_id_idx ON answer_records(question_id);
CREATE INDEX IF NOT EXISTS answer_records_user_id_idx ON answer_records(user_id);
CREATE INDEX IF NOT EXISTS wrong_questions_question_id_idx ON wrong_questions(question_id);
CREATE INDEX IF NOT EXISTS wrong_questions_user_id_idx ON wrong_questions(user_id);
CREATE INDEX IF NOT EXISTS exam_sessions_started_at_idx ON exam_sessions(started_at);
CREATE INDEX IF NOT EXISTS exam_sessions_user_id_idx ON exam_sessions(user_id);
CREATE INDEX IF NOT EXISTS exam_answers_session_id_idx ON exam_answers(exam_session_id);
CREATE INDEX IF NOT EXISTS user_sessions_token_idx ON user_sessions(token);
CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS used_payment_codes_code_idx ON used_payment_codes(code);
```

### 5. 启动开发服务

```bash
pnpm dev
```

访问 http://localhost:5000

## 用户系统说明

### 免费用户
- 新用户注册赠送 **10 次** 免费答题
- 答题记录和错题本独立存储
- 免费次数用完后需开通 VIP

### VIP 会员
- 支付 **10 元** 开通当日 VIP
- VIP 有效期内 **无限次** 答题
- 支持顺序练习、模拟考试等全部功能

### 支付流程
1. 点击「开通 VIP」按钮
2. 扫码支付（系统自动生成随机金额避免重复）
3. 支付成功后获得 8 位凭证码
4. 输入凭证码验证并开通 VIP

## 部署文档

详细部署教程请查看：[DEPLOYMENT.md](./DEPLOYMENT.md)

包含：
- Supabase 数据库创建和配置
- Vercel 项目部署和环境变量配置
- 常见问题解答

## Vercel 部署（快速版）

### 方式一：通过 GitHub（推荐）

1. **推送代码到 GitHub**

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **在 Vercel 导入项目**
   - 登录 [vercel.com](https://vercel.com)
   - 点击 "Import Project"
   - 选择你的 GitHub 仓库
   - 点击 "Import"

3. **配置环境变量**

在 Vercel Dashboard → Settings → Environment Variables 中添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `COZE_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase 项目 URL |
| `COZE_SUPABASE_ANON_KEY` | `eyJxxx...` | Supabase Anon Key |
| `ADMIN_PASSWORD` | `your-password` | 管理员密码（可选） |

4. **部署**

点击 "Deploy"，等待部署完成。

### 方式二：通过 Vercel CLI

```bash
# 安装 Vercel CLI
pnpm i -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

## 题目格式说明

支持 JSON 格式批量导入：

```json
[
  {
    "subject": "geography",
    "chapter": "地球与地图",
    "question_type": "single",
    "content": "地球的形状是？",
    "options": ["正方体", "球体", "椭圆形", "不规则形状"],
    "answer": "B",
    "explanation": "地球是一个两极稍扁、赤道略鼓的不规则球体。",
    "difficulty": 1
  },
  {
    "subject": "biology",
    "chapter": "细胞",
    "question_type": "multiple",
    "content": "以下哪些是细胞器？",
    "options": ["线粒体", "核糖体", "细胞壁", "叶绿体"],
    "answer": "A,B,D",
    "explanation": "细胞壁不是细胞器，是植物细胞特有的结构。",
    "difficulty": 2
  },
  {
    "subject": "geography",
    "chapter": "天气与气候",
    "question_type": "judge",
    "content": "台风属于天气现象。",
    "options": [],
    "answer": "正确",
    "explanation": "台风是短期的天气现象，不是气候。",
    "difficulty": 1
  }
]
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `subject` | string | ✅ | 科目：`geography`(地理) / `biology`(生物) |
| `chapter` | string | ✅ | 章节名称 |
| `question_type` | string | ✅ | 题型：`single`(单选) / `multiple`(多选) / `judge`(判断) |
| `content` | string | ✅ | 题目内容 |
| `options` | string[] | | 选项数组（判断题可为空） |
| `answer` | string | ✅ | 正确答案，多选用逗号分隔如 `A,C` |
| `explanation` | string | | 解析说明 |
| `difficulty` | number | | 难度 1-5，默认 1 |

## 默认账号

- **管理员密码**：`admin123`（可在环境变量 `ADMIN_PASSWORD` 中修改）
- **新用户**：赠送 10 次免费答题

## 项目结构

```
src/
├── app/                    # 页面路由
│   ├── api/               # API 接口
│   │   ├── auth/         # 用户认证
│   │   ├── answer/       # 答题记录
│   │   ├── payment/      # 支付验证
│   │   └── user/         # 用户权限
│   ├── exam/              # 模拟考试页面
│   ├── practice/          # 顺序练习页面
│   ├── questions/         # 题库管理页面
│   └── wrong-questions/   # 错题本页面
├── components/            # 组件
│   ├── ui/               # shadcn/ui 组件
│   ├── AdminLogin.tsx    # 管理员登录组件
│   ├── UserAuth.tsx      # 用户登录组件
│   ├── PaymentModal.tsx  # 支付弹窗组件
│   └── ZhuPayScript.tsx  # 支付 SDK
└── storage/database/      # 数据库
    ├── schema.sql        # 表结构定义
    └── supabase-client.ts # Supabase 客户端
```

## 许可证

MIT
