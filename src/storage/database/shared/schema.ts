import { pgTable, serial, varchar, text, timestamp, boolean, integer, jsonb, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// 保留系统表
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 题库表
export const questions = pgTable(
  "questions",
  {
    id: serial().primaryKey(),
    subject: varchar("subject", { length: 20 }).notNull(), // 'geography' | 'biology'
    chapter: varchar("chapter", { length: 100 }).notNull(), // 章节
    question_type: varchar("question_type", { length: 20 }).notNull(), // 'single' | 'multiple' | 'judge'
    content: text("content").notNull(), // 题目内容
    options: jsonb("options").$type<string[]>(), // 选项数组 ['选项A', '选项B', ...]
    answer: varchar("answer", { length: 100 }).notNull(), // 正确答案，多选用逗号分隔
    explanation: text("explanation"), // 解析说明
    difficulty: integer("difficulty").default(1).notNull(), // 1-5 难度等级
    image_url: varchar("image_url", { length: 500 }), // 题目图片URL
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("questions_subject_idx").on(table.subject),
    index("questions_chapter_idx").on(table.chapter),
    index("questions_type_idx").on(table.question_type),
  ]
);

// 答题记录表
export const answerRecords = pgTable(
  "answer_records",
  {
    id: serial().primaryKey(),
    question_id: integer("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
    user_answer: varchar("user_answer", { length: 100 }).notNull(), // 用户答案
    is_correct: boolean("is_correct").notNull(), // 是否正确
    answered_at: timestamp("answered_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("answer_records_question_id_idx").on(table.question_id),
    index("answer_records_answered_at_idx").on(table.answered_at),
  ]
);

// 错题本表
export const wrongQuestions = pgTable(
  "wrong_questions",
  {
    id: serial().primaryKey(),
    question_id: integer("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
    wrong_count: integer("wrong_count").default(1).notNull(), // 错误次数
    last_wrong_at: timestamp("last_wrong_at", { withTimezone: true }).defaultNow().notNull(),
    mastered: boolean("mastered").default(false).notNull(), // 是否已掌握
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("wrong_questions_question_id_idx").on(table.question_id),
    index("wrong_questions_mastered_idx").on(table.mastered),
  ]
);

// 模拟考试表
export const examSessions = pgTable(
  "exam_sessions",
  {
    id: serial().primaryKey(),
    subject: varchar("subject", { length: 20 }).notNull(), // 'geography' | 'biology' | 'mixed'
    total_questions: integer("total_questions").notNull(), // 总题数
    correct_count: integer("correct_count").default(0).notNull(), // 正确数
    score: integer("score").default(0).notNull(), // 分数（百分制）
    duration: integer("duration"), // 考试时长（秒）
    started_at: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    finished_at: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    index("exam_sessions_subject_idx").on(table.subject),
    index("exam_sessions_started_at_idx").on(table.started_at),
  ]
);

// 考试答题详情表
export const examAnswers = pgTable(
  "exam_answers",
  {
    id: serial().primaryKey(),
    exam_session_id: integer("exam_session_id").notNull().references(() => examSessions.id, { onDelete: "cascade" }),
    question_id: integer("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
    user_answer: varchar("user_answer", { length: 100 }), // 用户答案
    is_correct: boolean("is_correct"), // 是否正确
    answered_at: timestamp("answered_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("exam_answers_session_id_idx").on(table.exam_session_id),
    index("exam_answers_question_id_idx").on(table.question_id),
  ]
);

// 类型导出
export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;
export type AnswerRecord = typeof answerRecords.$inferSelect;
export type WrongQuestion = typeof wrongQuestions.$inferSelect;
export type ExamSession = typeof examSessions.$inferSelect;
export type ExamAnswer = typeof examAnswers.$inferSelect;
