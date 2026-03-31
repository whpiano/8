-- =============================================
-- 禁用 Supabase 行级安全策略 (RLS)
-- =============================================
-- 在 Supabase SQL Editor 中执行此脚本
-- =============================================

-- 禁用所有表的 RLS
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE used_payment_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE answer_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE wrong_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_answers DISABLE ROW LEVEL SECURITY;

-- 删除可能存在的 RLS 策略（如果有）
DROP POLICY IF EXISTS "Enable all for authenticated users" ON questions;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON user_sessions;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON used_payment_codes;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON answer_records;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON wrong_questions;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON exam_sessions;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON exam_answers;

-- 验证 RLS 已禁用（应该返回空结果）
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
