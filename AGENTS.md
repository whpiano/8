# 项目上下文

## 项目概述

初中地理生物会考在线练习系统，类似驾考宝典。支持题库导入、错题本、顺序答题、模拟考试等功能。

### 核心功能
- **题库管理**：支持 JSON 格式批量导入题目，支持单选、多选、判断题
- **顺序练习**：按章节顺序逐题练习，实时显示正确率
- **错题本**：自动收集错题，支持错题练习和标记已掌握
- **模拟考试**：支持地理/生物/综合考试，自动计时和评分
- **多用户系统**：每个用户独立的答题记录和错题本
- **免费试用**：新用户赠送 10 次免费答题
- **VIP 会员**：支付 10 元开通当日无限次刷题

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Payment**: ZhuPay 个人免签支付

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
├── src/
│   ├── app/                # 页面路由与布局
│   │   ├── api/            # API 路由
│   │   │   ├── admin/      # 管理员认证接口
│   │   │   ├── auth/       # 用户认证接口
│   │   │   ├── answer/     # 答题记录接口
│   │   │   ├── exam/       # 考试相关接口
│   │   │   ├── payment/    # 支付验证接口
│   │   │   ├── questions/  # 题库相关接口
│   │   │   ├── user/       # 用户权限接口
│   │   │   └── wrong-questions/  # 错题本接口
│   │   ├── exam/           # 模拟考试页面
│   │   ├── practice/       # 顺序练习页面
│   │   ├── questions/      # 题库管理页面
│   │   └── wrong-questions/  # 错题本页面
│   ├── components/         # 组件
│   │   ├── ui/             # Shadcn UI 组件库
│   │   ├── AdminLogin.tsx  # 管理员登录组件
│   │   ├── UserAuth.tsx    # 用户登录组件
│   │   ├── PaymentModal.tsx # 支付弹窗组件
│   │   └── ZhuPayScript.tsx # 支付 SDK
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # 工具库
│   │   ├── utils.ts        # 通用工具函数
│   │   └── auth.ts         # 用户认证工具函数
│   └── storage/database/   # 数据库相关
│       ├── schema.sql      # 数据库表结构定义
│       └── supabase-client.ts  # Supabase 客户端
├── next.config.ts          # Next.js 配置
├── package.json            # 项目依赖管理
└── tsconfig.json           # TypeScript 配置
```

## 数据库表结构

### 题库相关表
| 表名 | 说明 | 主要字段 |
|------|------|---------|
| questions | 题库表 | id, subject, chapter, question_type, content, options, answer, explanation, difficulty |
| answer_records | 答题记录表 | id, question_id, user_answer, is_correct, answered_at, user_id |
| wrong_questions | 错题本表 | id, question_id, wrong_count, last_wrong_at, mastered, user_id |
| exam_sessions | 模拟考试表 | id, subject, total_questions, correct_count, score, duration, user_id |
| exam_answers | 考试答题详情表 | id, exam_session_id, question_id, user_answer, is_correct |

### 用户相关表
| 表名 | 说明 | 主要字段 |
|------|------|---------|
| users | 用户表 | id, username, password_hash, free_count, vip_expired_at |
| user_sessions | 用户会话表 | id, user_id, token, expired_at |
| used_payment_codes | 已使用支付凭证表 | id, code, user_id, amount, used_at |

## API 接口

### 用户认证
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth` - 获取当前用户信息
- `DELETE /api/auth` - 退出登录

### 用户权限
- `GET /api/user/quota` - 获取用户答题权限和剩余次数

### 支付相关
- `POST /api/payment/verify` - 验证支付凭证并开通 VIP

### 管理员认证
- `POST /api/admin/auth` - 管理员登录
- `GET /api/admin/auth` - 检查管理员状态
- `DELETE /api/admin/auth` - 管理员退出

### 题库相关
- `GET /api/questions` - 获取题目列表（支持分页和筛选）
- `POST /api/questions` - 批量导入题目（需管理员权限）
- `GET /api/questions/[id]` - 获取单个题目
- `PUT /api/questions/[id]` - 更新题目（需管理员权限）
- `DELETE /api/questions/[id]` - 删除题目（需管理员权限）
- `GET /api/questions/stats` - 获取统计数据
- `GET /api/questions/chapters` - 获取章节列表

### 答题相关
- `POST /api/answer` - 提交答题记录（检查用户权限）
- `GET /api/answer` - 获取答题记录

### 错题本相关
- `GET /api/wrong-questions` - 获取错题列表
- `PUT /api/wrong-questions/[id]` - 更新错题状态
- `DELETE /api/wrong-questions/[id]` - 删除错题记录

### 考试相关
- `POST /api/exam/start` - 开始模拟考试
- `POST /api/exam/[id]/submit` - 提交考试答案
- `GET /api/exam/[id]` - 获取考试详情
- `GET /api/exam/history` - 获取考试历史

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。

## 开发规范

- **项目理解加速**：初始可以依赖项目下`package.json`文件理解项目类型
- **Hydration 错误预防**：严禁在 JSX 渲染逻辑中直接使用 typeof window、Date.now()、Math.random() 等动态数据
- **数据库操作**：使用 Supabase SDK 进行 CRUD 操作，所有字段名使用 snake_case
- **用户认证**：使用 Cookie 存储 session token，有效期 7 天
- **密码存储**：使用简单哈希（生产环境应使用 bcrypt）

## UI 设计与组件规范

- 项目使用 shadcn/ui 组件库，位于 `src/components/ui/` 目录下
- 使用 Lucide React 图标库
- 遵循 Tailwind CSS 4 规范

## 支付集成

使用 ZhuPay 个人免签支付系统：
- 支付网关：`https://pay.0728.im`
- 验证接口：`POST /api/query_reply`
- VIP 价格：10 元
- VIP 有效期：24 小时
