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
