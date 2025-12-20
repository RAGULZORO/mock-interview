# 📍 WHERE THE QUESTIONS ARE IN THE CODE

## 🗄️ Database Tables (Supabase PostgreSQL)

### Main Question Tables

1. **`aptitude_questions`** - Multiple Choice Questions
   ```sql
   -- Columns:
   id, question, options (JSONB), correct_answer, explanation, 
   category, level, created_at, created_by
   ```

2. **`technical_questions`** - Coding Problems
   ```sql
   -- Columns:
   id, title, difficulty, category, description, examples (JSONB), 
   solution, approach, level, created_at, created_by
   ```

3. **`gd_topics`** - Group Discussion Topics
   ```sql
   -- Columns:
   id, title, category, description, points_for (JSONB), 
   points_against (JSONB), tips (JSONB), conclusion, level, created_at, created_by
   ```

4. **`user_progress`** - User Answer Tracking
   ```sql
   -- Columns:
   id, user_id, question_id, question_type, answer, is_correct, 
   time_spent, attempted_at
   ```

---

## 💻 Code Files Where Questions Are Used

### **File #1: `/src/pages/Admin.tsx` (1,713 lines)**
**Purpose:** Admin panel to manage ALL questions

#### Functions to FETCH questions:
```typescript
// Line ~220-290
const fetchAllAptitudeQuestions = async () => {
  const { data } = await supabase
    .from('aptitude_questions')
    .select('*')
    .order('created_at', { ascending: false });
  setAllAptitudeQuestions(data || []);
}

const fetchAllTechnicalQuestions = async () => {
  const { data } = await supabase
    .from('technical_questions')
    .select('*')
    .order('created_at', { ascending: false });
  setAllTechnicalQuestions(data || []);
}

const fetchAllGdQuestions = async () => {
  const { data } = await supabase
    .from('gd_topics')
    .select('*')
    .order('created_at', { ascending: false });
  setAllGdQuestions(data || []);
}
```

#### Functions to CREATE (INSERT) questions:
```typescript
// Line ~370-450
const handleAptitudeSubmit = async () => {
  await supabase.from('aptitude_questions').insert({
    question, options, correct_answer, explanation, category, level
  });
}

const handleTechnicalSubmit = async () => {
  await supabase.from('technical_questions').insert({
    title, difficulty, category, description, examples, solution, approach, level
  });
}

const handleGDSubmit = async () => {
  await supabase.from('gd_topics').insert({
    title, category, description, points_for, points_against, tips, conclusion, level
  });
}
```

#### Functions to UPDATE questions:
```typescript
// Line ~455-540
const handleUpdateAptitude = async () => {
  await supabase
    .from('aptitude_questions')
    .update({ question, options, correct_answer, explanation, category, level })
    .eq('id', editingAptitudeId);
}

const handleUpdateTechnical = async () => {
  await supabase
    .from('technical_questions')
    .update({ title, difficulty, category, description, examples, solution, approach, level })
    .eq('id', editingTechnicalId);
}

const handleUpdateGd = async () => {
  await supabase
    .from('gd_topics')
    .update({ title, category, description, points_for, points_against, tips, conclusion, level })
    .eq('id', editingGdId);
}
```

#### Functions to DELETE questions:
```typescript
// Line ~542-580
const handleDeleteAptitude = async (id: string) => {
  if (confirm('Are you sure...')) {
    await supabase.from('aptitude_questions').delete().eq('id', id);
  }
}

const handleDeleteTechnical = async (id: string) => {
  if (confirm('Are you sure...')) {
    await supabase.from('technical_questions').delete().eq('id', id);
  }
}

const handleDeleteGd = async (id: string) => {
  if (confirm('Are you sure...')) {
    await supabase.from('gd_topics').delete().eq('id', id);
  }
}
```

#### Question Counter Functions:
```typescript
// Line ~210-290
const fetchAptitudeQuestionCounts = async () => {
  // Count questions per level (1-4)
  for (let level = 1; level <= 4; level++) {
    const { count } = await supabase
      .from('aptitude_questions')
      .select('*', { count: 'exact', head: true })
      .eq('level', level);
  }
}

// Similar for technical and GD...
```

#### UI for Add Questions:
- Lines ~600-800: Add Aptitude Question Form
- Lines ~800-1000: Add Technical Question Form
- Lines ~1000-1200: Add GD Topic Form

#### UI for Edit/Delete Questions:
- Lines ~1200-1400: Manage Aptitude Questions Tab
- Lines ~1400-1600: Manage Technical Questions Tab
- Lines ~1600-1713: Manage GD Topics Tab

---

### **File #2: `/src/pages/Aptitude.tsx` (640 lines)**
**Purpose:** Student interface to PRACTICE aptitude questions

#### Function to FETCH and DISPLAY questions:
```typescript
// Line ~45-80
const fetchQuestions = async () => {
  const { data, error } = await supabase
    .from('aptitude_questions')
    .select('*')
    .order('created_at', { ascending: false });

  if (data) {
    setQuestions(data.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options as string[],
      correct: q.correct_answer,
      explanation: q.explanation,
      category: q.category,
      level: q.level
    })));
  }
}
```

#### Shuffled Questions (Anti-Cheating):
```typescript
// Line ~130-150
const handleCategorySelection = (category: string) => {
  const filtered = questions.filter(q => q.category === category);
  
  // Create unique seed for this user + category + level
  const seed = createQuestionSeed(user?.id, category, selectedLevel);
  
  // Shuffle questions deterministically
  const shuffledQuestions = seededShuffle(filtered, seed);
  
  setCurrentQuestionIndex(0);
}
```

#### Recording User Answers:
```typescript
// Line ~200-250
const handleSelectAnswer = async (answerIndex: number) => {
  const isCorrect = answerIndex === currentQuestion.correct;
  
  // Save to user_progress table
  await supabase.from('user_progress').insert({
    user_id: user.id,
    question_id: currentQuestion.id,
    question_type: 'aptitude',
    answer: answerIndex,
    is_correct: isCorrect,
    time_spent: timeSpent
  });
}
```

#### Question Display:
```typescript
// Line ~380-500
// Displays:
// - Question text (currentQuestion.question)
// - 4 Options (currentQuestion.options[0-3])
// - Correct answer indicator
// - Explanation (currentQuestion.explanation)
```

---

### **File #3: `/src/pages/Technical.tsx` (761 lines)**
**Purpose:** Student interface to PRACTICE technical/coding questions

#### Function to FETCH and DISPLAY questions:
```typescript
// Line ~50-90
const fetchQuestions = async () => {
  const { data, error } = await supabase
    .from('technical_questions')
    .select('*')
    .order('created_at', { ascending: false });

  if (data) {
    setQuestions(data.map(q => ({
      id: q.id,
      title: q.title,
      category: q.category,
      difficulty: q.difficulty,
      description: q.description,
      examples: q.examples as Example[],
      solution: q.solution,
      approach: q.approach,
      level: q.level
    })));
  }
}
```

#### Question Display with Code Editor:
```typescript
// Line ~400-600
// Displays:
// - Problem title (currentQuestion.title)
// - Description (currentQuestion.description)
// - Examples (currentQuestion.examples)
// - Code editor (for solving)
// - Solution (currentQuestion.solution)
// - Approach (currentQuestion.approach)
```

---

### **File #4: `/src/pages/GroupDiscussion.tsx` (TBD)**
**Purpose:** Student interface to PRACTICE GD topics

#### Similar to Aptitude & Technical:
```typescript
// Fetches from gd_topics table
const fetchTopics = async () => {
  const { data } = await supabase
    .from('gd_topics')
    .select('*');
  // ...
}
```

---

### **File #5: `/src/contexts/AuthContext.tsx`**
**Purpose:** User authentication (needed for user_id in progress tracking)

---

### **File #6: `/src/integrations/supabase/client.ts`**
**Purpose:** Supabase client initialization

```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);
```

---

### **File #7: `/src/lib/shuffle.ts` (61 lines)**
**Purpose:** Deterministic question shuffling for anti-cheating

```typescript
// Line ~1-20
export function seededShuffle<T>(array: T[], seed: number): T[] {
  // Fisher-Yates shuffle with deterministic seed
  // Same seed = same order (consistency)
  // Different seeds = different orders (uniqueness per user)
}

// Line ~30-45
export function createQuestionSeed(
  userId: string,
  category: string,
  level: number
): number {
  // Creates unique seed from: userId + category + level
  // Ensures same user always gets same order
  // Different users get different orders
}
```

---

## 🔄 Data Flow Diagram

```
┌──────────────────────────────────────────────────────┐
│          SUPABASE DATABASE (PostgreSQL)              │
├──────────────────────────────────────────────────────┤
│  aptitude_questions │ technical_questions │ gd_topics │
└──────────────────────────────────────────────────────┘
                         ↓↑
                    (SELECT, INSERT,
                    UPDATE, DELETE)
                         ↓↑
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
   │  Admin.tsx  │ │Aptitude.tsx │ │Technical.tsx│
   │  CRUD Panel │ │  Practice   │ │  Practice   │
   │  Edit/Delete│ │  Questions  │ │  Questions  │
   └─────────────┘ └─────────────┘ └─────────────┘
        ↓                ↓                ↓
   Add/Edit/Del    Fetch & Shuffle   Fetch & Display
   Questions       User Answers       Solutions
```

---

## 🎯 Quick Reference

| Operation | File | Function | Lines |
|-----------|------|----------|-------|
| **Add Question** | Admin.tsx | handleAptitudeSubmit, handleTechnicalSubmit, handleGDSubmit | 370-450 |
| **Edit Question** | Admin.tsx | handleUpdateAptitude, handleUpdateTechnical, handleUpdateGd | 455-540 |
| **Delete Question** | Admin.tsx | handleDeleteAptitude, handleDeleteTechnical, handleDeleteGd | 542-580 |
| **Fetch All Questions** | Admin.tsx | fetchAllAptitudeQuestions, fetchAllTechnicalQuestions, fetchAllGdQuestions | 220-290 |
| **Display Questions** | Aptitude.tsx | fetchQuestions | 45-80 |
| **Shuffle Questions** | Aptitude.tsx | handleCategorySelection | 130-150 |
| **Record Answers** | Aptitude.tsx | handleSelectAnswer | 200-250 |
| **Count Questions** | Admin.tsx | fetchAptitudeQuestionCounts | 210-290 |

---

## 📝 Summary

**Questions are stored in:**
- ✅ **Supabase Database** → 3 tables (aptitude, technical, gd_topics)

**Questions are managed in:**
- ✅ **`/src/pages/Admin.tsx`** → Add, Edit, Delete (Admin only)

**Questions are displayed in:**
- ✅ **`/src/pages/Aptitude.tsx`** → Show aptitude MCQs to students
- ✅ **`/src/pages/Technical.tsx`** → Show coding problems to students
- ✅ **`/src/pages/GroupDiscussion.tsx`** → Show GD topics to students

**Questions are shuffled in:**
- ✅ **`/src/lib/shuffle.ts`** → Deterministic shuffling per user (anti-cheating)

**User answers tracked in:**
- ✅ **`user_progress` table** → Records what users answered

---

## 🔑 Key Code Snippets

### To fetch questions:
```typescript
const { data } = await supabase
  .from('aptitude_questions')  // or technical_questions, gd_topics
  .select('*');
```

### To add a question:
```typescript
const { error } = await supabase
  .from('aptitude_questions')
  .insert({ question, options, correct_answer, explanation, category, level });
```

### To update a question:
```typescript
const { error } = await supabase
  .from('aptitude_questions')
  .update({ question, options, correct_answer, explanation, category, level })
  .eq('id', questionId);
```

### To delete a question:
```typescript
const { error } = await supabase
  .from('aptitude_questions')
  .delete()
  .eq('id', questionId);
```

---

## 🚀 Example: Adding a New Question Type

If you wanted to add a 4th question type (e.g., "Coding MCQ"), here's what you'd do:

1. **Create table in Supabase:**
   ```sql
   CREATE TABLE coding_mcq_questions (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     question TEXT NOT NULL,
     options JSONB NOT NULL,
     correct_answer INTEGER NOT NULL,
     explanation TEXT NOT NULL,
     category TEXT NOT NULL,
     level INTEGER NOT NULL,
     created_at TIMESTAMP DEFAULT now(),
     created_by uuid REFERENCES auth.users(id)
   );
   ```

2. **Add to Admin.tsx:**
   - Add state: `const [allCodingMcqQuestions, setAllCodingMcqQuestions] = useState([]);`
   - Add fetch: `const fetchAllCodingMcqQuestions = async () => { ... }`
   - Add handlers: `handleUpdateCodingMcq()`, `handleDeleteCodingMcq()`
   - Add UI tabs and forms

3. **Create new page (CodingMcq.tsx):**
   - Similar to Aptitude.tsx
   - Fetch from `coding_mcq_questions` table
   - Display questions and track answers

4. **Add to navigation (App.tsx)**
   - Link to new CodingMcq page

That's it! 🎉

