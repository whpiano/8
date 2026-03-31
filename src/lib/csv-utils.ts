// CSV 解析和生成工具

export interface QuestionData {
  subject: string;
  chapter: string;
  question_type: string;
  content: string;
  options: string[];
  answer: string;
  explanation: string;
  difficulty: number;
}

/**
 * 解析 CSV 文本为题目数组
 * CSV 格式：
 * subject,chapter,question_type,content,option_a,option_b,option_c,option_d,answer,explanation,difficulty
 * geography,地球与地图,single,地球的形状是？,正方体,球体,椭圆形,不规则形状,B,地球是一个两极稍扁、赤道略鼓的不规则球体。,1
 */
export function parseCSV(csvText: string): QuestionData[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV 文件至少需要包含标题行和一行数据');
  }

  // 解析标题行
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  
  // 验证必要字段
  const requiredFields = ['subject', 'chapter', 'question_type', 'content', 'answer'];
  for (const field of requiredFields) {
    if (!headers.includes(field)) {
      throw new Error(`CSV 缺少必要字段: ${field}`);
    }
  }

  const questions: QuestionData[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const values = parseCSVLine(line);
      const row: Record<string, string> = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      // 构建选项数组
      const options: string[] = [];
      ['option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'option_f'].forEach(key => {
        if (row[key] && row[key].trim()) {
          options.push(row[key].trim());
        }
      });

      // 验证科目
      const subject = row.subject.toLowerCase().trim();
      if (subject !== 'geography' && subject !== 'biology' && subject !== '地理' && subject !== '生物') {
        throw new Error(`第 ${i + 1} 行: 科目必须是 geography/biology/地理/生物`);
      }
      
      const normalizedSubject = subject === '地理' ? 'geography' : subject === '生物' ? 'biology' : subject;

      // 验证题型
      const questionType = row.question_type.toLowerCase().trim();
      let normalizedType = questionType;
      if (questionType === '单选' || questionType === 'single') {
        normalizedType = 'single';
      } else if (questionType === '多选' || questionType === 'multiple') {
        normalizedType = 'multiple';
      } else if (questionType === '判断' || questionType === 'judge') {
        normalizedType = 'judge';
      }

      // 验证难度
      const difficulty = parseInt(row.difficulty || '1', 10);
      if (isNaN(difficulty) || difficulty < 1 || difficulty > 5) {
        throw new Error(`第 ${i + 1} 行: 难度必须是 1-5 的数字`);
      }

      questions.push({
        subject: normalizedSubject,
        chapter: row.chapter.trim(),
        question_type: normalizedType,
        content: row.content.trim(),
        options: normalizedType === 'judge' ? [] : options,
        answer: row.answer.trim().toUpperCase(),
        explanation: row.explanation?.trim() || '',
        difficulty
      });
    } catch (error) {
      throw new Error(`第 ${i + 1} 行解析失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return questions;
}

/**
 * 解析 CSV 行（处理引号内的逗号）
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // 转义的引号
        current += '"';
        i++;
      } else {
        // 切换引号状态
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

/**
 * 生成 CSV 文本
 */
export function generateCSV(questions: QuestionData[]): string {
  const headers = ['subject', 'chapter', 'question_type', 'content', 'option_a', 'option_b', 'option_c', 'option_d', 'answer', 'explanation', 'difficulty'];
  
  const lines: string[] = [headers.join(',')];
  
  for (const q of questions) {
    const options = q.options || [];
    const row = [
      q.subject,
      q.chapter,
      q.question_type,
      escapeCSVField(q.content),
      options[0] ? escapeCSVField(options[0]) : '',
      options[1] ? escapeCSVField(options[1]) : '',
      options[2] ? escapeCSVField(options[2]) : '',
      options[3] ? escapeCSVField(options[3]) : '',
      q.answer,
      q.explanation ? escapeCSVField(q.explanation) : '',
      q.difficulty.toString()
    ];
    lines.push(row.join(','));
  }
  
  return lines.join('\n');
}

/**
 * 转义 CSV 字段（处理包含逗号、引号或换行的字段）
 */
function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * CSV 示例数据
 */
export const CSV_SAMPLE = `subject,chapter,question_type,content,option_a,option_b,option_c,option_d,answer,explanation,difficulty
geography,地球与地图,single,地球的形状是？,正方体,球体,椭圆形,不规则形状,B,地球是一个两极稍扁、赤道略鼓的不规则球体。,1
biology,细胞,single,细胞的基本结构包括？,细胞壁和细胞膜,细胞膜、细胞质、细胞核,细胞核和线粒体,叶绿体和细胞壁,B,细胞是生物体结构和功能的基本单位。,2
geography,天气与气候,judge,台风属于天气现象。,,,正确,错误,正确,台风是短期的天气现象不是气候。,1
biology,生态系统,multiple,以下哪些是生态系统中的生产者？,绿色植物,藻类,蘑菇,细菌,"A,B",绿色植物和藻类能进行光合作用制造有机物。蘑菇是真菌属于分解者。,3`;
