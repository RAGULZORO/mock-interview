/**
 * CSV Parser and Validator for Question Bulk Import
 * Handles parsing and validation for Aptitude, Technical, and GD questions
 */

export interface ParsedQuestion {
  type: 'aptitude' | 'technical' | 'gd';
  data: Record<string, any>;
  rowNumber: number;
  errors: string[];
}

export interface ParseResult {
  success: boolean;
  questions: ParsedQuestion[];
  errors: string[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    byType: Record<string, number>;
  };
}

/**
 * Parse CSV file and return structured data
 */
export const parseCSV = (fileContent: string): string[][] => {
  const lines = fileContent.split('\n');
  const rows: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue; // Skip empty lines

    // Handle quoted fields with commas inside
    const fields: string[] = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        // Field separator
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }

    // Add last field
    if (currentField || line.endsWith(',')) {
      fields.push(currentField.trim());
    }

    if (fields.some(f => f)) {
      // Only add non-empty rows
      rows.push(fields.map(f => f.replace(/^"|"$/g, ''))); // Remove surrounding quotes
    }
  }

  return rows;
};

/**
 * Validate aptitude question
 */
const validateAptitudeQuestion = (data: Record<string, any>, rowNumber: number): string[] => {
  const errors: string[] = [];

  // Required fields
  if (!data.question || data.question.toString().trim() === '') {
    errors.push(`Row ${rowNumber}: Missing "question" field`);
  }
  if (!data.category || data.category.toString().trim() === '') {
    errors.push(`Row ${rowNumber}: Missing "category" field`);
  }
  if (data.level === undefined || data.level === '') {
    errors.push(`Row ${rowNumber}: Missing "level" field`);
  }

  // Validate options (need 4)
  const options = [data.option_a, data.option_b, data.option_c, data.option_d];
  const filledOptions = options.filter(opt => opt && opt.toString().trim() !== '');

  if (filledOptions.length < 4) {
    errors.push(`Row ${rowNumber}: Must have 4 options (option_a, option_b, option_c, option_d)`);
  }

  // Validate correct answer
  if (data.correct_answer === undefined || data.correct_answer === '') {
    errors.push(`Row ${rowNumber}: Missing "correct_answer" field`);
  } else {
    const answerIndex = parseInt(data.correct_answer.toString());
    if (isNaN(answerIndex) || answerIndex < 0 || answerIndex > 3) {
      errors.push(`Row ${rowNumber}: "correct_answer" must be 0-3`);
    }
  }

  // Validate explanation
  if (!data.explanation || data.explanation.toString().trim() === '') {
    errors.push(`Row ${rowNumber}: Missing "explanation" field`);
  }

  // Validate level
  const level = parseInt(data.level?.toString() || '');
  if (isNaN(level) || level < 1 || level > 4) {
    errors.push(`Row ${rowNumber}: "level" must be 1-4`);
  }

  // Validate category
  const validCategories = ['Quantitative', 'Logical Reasoning', 'Verbal Ability', 'Data Interpretation'];
  if (data.category && !validCategories.includes(data.category.toString().trim())) {
    errors.push(`Row ${rowNumber}: Invalid category. Must be one of: ${validCategories.join(', ')}`);
  }

  return errors;
};

/**
 * Validate technical question
 */
const validateTechnicalQuestion = (data: Record<string, any>, rowNumber: number): string[] => {
  const errors: string[] = [];

  // Required fields
  if (!data.title || data.title.toString().trim() === '') {
    errors.push(`Row ${rowNumber}: Missing "title" field`);
  }
  if (!data.category || data.category.toString().trim() === '') {
    errors.push(`Row ${rowNumber}: Missing "category" field`);
  }
  if (!data.difficulty || data.difficulty.toString().trim() === '') {
    errors.push(`Row ${rowNumber}: Missing "difficulty" field`);
  }
  if (!data.description || data.description.toString().trim() === '') {
    errors.push(`Row ${rowNumber}: Missing "description" field`);
  }
  if (!data.solution || data.solution.toString().trim() === '') {
    errors.push(`Row ${rowNumber}: Missing "solution" field`);
  }
  if (!data.approach || data.approach.toString().trim() === '') {
    errors.push(`Row ${rowNumber}: Missing "approach" field`);
  }
  if (data.level === undefined || data.level === '') {
    errors.push(`Row ${rowNumber}: Missing "level" field`);
  }

  // Validate level
  const level = parseInt(data.level?.toString() || '');
  if (isNaN(level) || level < 1 || level > 4) {
    errors.push(`Row ${rowNumber}: "level" must be 1-4`);
  }

  // Validate difficulty
  const validDifficulties = ['Easy', 'Medium', 'Hard'];
  if (data.difficulty && !validDifficulties.includes(data.difficulty.toString().trim())) {
    errors.push(`Row ${rowNumber}: Invalid difficulty. Must be one of: ${validDifficulties.join(', ')}`);
  }

  // Validate category
  const validCategories = ['Arrays', 'Strings', 'Linked Lists', 'Trees', 'Graphs', 'Dynamic Programming', 'Sorting', 'Searching'];
  if (data.category && !validCategories.includes(data.category.toString().trim())) {
    errors.push(`Row ${rowNumber}: Invalid category. Suggested: ${validCategories.slice(0, 3).join(', ')}...`);
  }

  return errors;
};

/**
 * Validate GD question
 */
const validateGdQuestion = (data: Record<string, any>, rowNumber: number): string[] => {
  const errors: string[] = [];

  // Required fields
  if (!data.title || data.title.toString().trim() === '') {
    errors.push(`Row ${rowNumber}: Missing "title" field`);
  }
  if (!data.category || data.category.toString().trim() === '') {
    errors.push(`Row ${rowNumber}: Missing "category" field`);
  }
  if (!data.description || data.description.toString().trim() === '') {
    errors.push(`Row ${rowNumber}: Missing "description" field`);
  }
  if (!data.conclusion || data.conclusion.toString().trim() === '') {
    errors.push(`Row ${rowNumber}: Missing "conclusion" field`);
  }
  if (data.level === undefined || data.level === '') {
    errors.push(`Row ${rowNumber}: Missing "level" field`);
  }

  // Validate level
  const level = parseInt(data.level?.toString() || '');
  if (isNaN(level) || level < 1 || level > 4) {
    errors.push(`Row ${rowNumber}: "level" must be 1-4`);
  }

  return errors;
};

/**
 * Parse and validate CSV file based on type
 */
export const validateAndParseCSV = (
  fileContent: string,
  type: 'aptitude' | 'technical' | 'gd'
): ParseResult => {
  try {
    const rows = parseCSV(fileContent);

    if (rows.length === 0) {
      return {
        success: false,
        questions: [],
        errors: ['CSV file is empty'],
        summary: { total: 0, valid: 0, invalid: 0, byType: { aptitude: 0, technical: 0, gd: 0 } }
      };
    }

    // First row is headers
    const headers = rows[0];
    const dataRows = rows.slice(1);

    if (dataRows.length === 0) {
      return {
        success: false,
        questions: [],
        errors: ['CSV file has no data rows (only headers)'],
        summary: { total: 0, valid: 0, invalid: 0, byType: { aptitude: 0, technical: 0, gd: 0 } }
      };
    }

    const questions: ParsedQuestion[] = [];
    const globalErrors: string[] = [];
    let validCount = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2; // +2 because row 1 is headers, rows are 1-indexed

      // Create object from headers and values
      const data: Record<string, any> = {};
      for (let j = 0; j < headers.length; j++) {
        const headerKey = headers[j].toLowerCase().trim();
        data[headerKey] = row[j] || '';
      }

      // Skip completely empty rows
      if (Object.values(data).every(v => !v || v.toString().trim() === '')) {
        continue;
      }

      // Validate based on type
      let errors: string[] = [];
      switch (type) {
        case 'aptitude':
          errors = validateAptitudeQuestion(data, rowNumber);
          break;
        case 'technical':
          errors = validateTechnicalQuestion(data, rowNumber);
          break;
        case 'gd':
          errors = validateGdQuestion(data, rowNumber);
          break;
      }

      const parsedQuestion: ParsedQuestion = {
        type,
        data,
        rowNumber,
        errors
      };

      questions.push(parsedQuestion);

      if (errors.length === 0) {
        validCount++;
      } else {
        globalErrors.push(...errors);
      }
    }

    return {
      success: globalErrors.length === 0,
      questions,
      errors: globalErrors,
      summary: {
        total: questions.length,
        valid: validCount,
        invalid: questions.length - validCount,
        byType: {
          aptitude: type === 'aptitude' ? questions.length : 0,
          technical: type === 'technical' ? questions.length : 0,
          gd: type === 'gd' ? questions.length : 0
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      questions: [],
      errors: [`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`],
      summary: { total: 0, valid: 0, invalid: 0, byType: { aptitude: 0, technical: 0, gd: 0 } }
    };
  }
};

/**
 * Convert parsed questions to database insert format
 */
export const formatForDatabase = (parsedQuestions: ParsedQuestion[], userId: string) => {
  return parsedQuestions
    .filter(pq => pq.errors.length === 0) // Only valid questions
    .map(pq => {
      const data = pq.data;

      if (pq.type === 'aptitude') {
        return {
          question: data.question.toString().trim(),
          options: [
            data.option_a?.toString().trim() || '',
            data.option_b?.toString().trim() || '',
            data.option_c?.toString().trim() || '',
            data.option_d?.toString().trim() || ''
          ],
          correct_answer: parseInt(data.correct_answer.toString()),
          explanation: data.explanation.toString().trim(),
          category: data.category.toString().trim(),
          level: parseInt(data.level.toString()),
          created_by: userId
        };
      } else if (pq.type === 'technical') {
        // Parse examples if provided as JSON string
        let examples = [];
        if (data.examples && data.examples.toString().trim()) {
          try {
            examples = JSON.parse(data.examples.toString());
          } catch {
            examples = [];
          }
        }

        return {
          title: data.title.toString().trim(),
          difficulty: data.difficulty.toString().trim(),
          category: data.category.toString().trim(),
          description: data.description.toString().trim(),
          examples: examples,
          solution: data.solution.toString().trim(),
          approach: data.approach.toString().trim(),
          level: parseInt(data.level.toString()),
          created_by: userId
        };
      } else {
        // GD type
        // Parse JSON arrays if provided
        const parseArray = (str: string) => {
          if (!str || str.trim() === '') return [];
          try {
            return JSON.parse(str);
          } catch {
            return str.split(';').map(s => s.trim()).filter(s => s);
          }
        };

        return {
          title: data.title.toString().trim(),
          category: data.category.toString().trim(),
          description: data.description.toString().trim(),
          points_for: parseArray(data.points_for?.toString() || ''),
          points_against: parseArray(data.points_against?.toString() || ''),
          tips: parseArray(data.tips?.toString() || ''),
          conclusion: data.conclusion.toString().trim(),
          level: parseInt(data.level.toString()),
          created_by: userId
        };
      }
    });
};
