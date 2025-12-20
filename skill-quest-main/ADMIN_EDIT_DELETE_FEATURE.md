# Admin Question Edit/Delete Feature

## Overview

Admins can now **edit** and **delete** existing questions across all three sections:
- ✏️ **Aptitude Questions**
- ✏️ **Technical Questions** 
- ✏️ **GD (Group Discussion) Topics**

## Features

### 1. **View All Questions**
- Click "Load All Questions" button in Manage tabs
- Displays all questions/topics in a scrollable list
- Shows key details: Title, Category, Level, Difficulty

### 2. **Edit Questions**
- Click the **Edit** button on any question card
- Form expands with all editable fields
- Modify any aspect of the question
- Click **Save Changes** to update in database
- Click **Cancel** to discard changes

### 3. **Delete Questions**
- Click the **Delete** button on any question card
- Confirmation dialog appears for safety
- Question is permanently removed after confirmation
- Question count automatically updates

### 4. **Real-time Updates**
- After edit/delete, question counts refresh automatically
- Changes are immediately reflected in database
- Success toast notifications confirm actions

---

## User Interface

### Admin Tabs
The admin panel now has **7 tabs**:

1. **Aptitude** - Add new aptitude questions
2. **Technical** - Add new technical questions
3. **GD Topics** - Add new GD topics
4. **Manage (Apt)** - Edit/Delete aptitude questions ✨ NEW
5. **Manage (Tech)** - Edit/Delete technical questions ✨ NEW
6. **Manage (GD)** - Edit/Delete GD topics ✨ NEW
7. **Progress** - View user progress analytics

### Question Card Layout

**View Mode:**
```
┌────────────────────────────────────┐
│ Question Title/Text                │
│ [Category] [Difficulty] [Level]    │
│          [Edit] [Delete]           │
└────────────────────────────────────┘
```

**Edit Mode:**
```
┌────────────────────────────────────┐
│ Form Fields:                       │
│ - Title/Question                   │
│ - Category                         │
│ - Level                            │
│ - Difficulty (Tech only)           │
│ - Description/Content              │
│ - Additional fields...             │
│                                    │
│ [Save Changes]  [Cancel]           │
└────────────────────────────────────┘
```

---

## Aptitude Questions - Edit Fields

When editing an aptitude question, admins can modify:
- ✏️ **Question** - The MCQ text
- ✏️ **Category** - Quantitative / Logical Reasoning / Verbal Ability
- ✏️ **Level** - 1 (Beginner) to 4 (Expert)
- ✏️ **Option 1, 2, 3, 4** - All four answer choices
- ✏️ **Correct Answer** - Index of correct option (0-3)
- ✏️ **Explanation** - Detailed explanation for the answer

---

## Technical Questions - Edit Fields

When editing a technical question, admins can modify:
- ✏️ **Title** - Problem name (e.g., "Two Sum")
- ✏️ **Category** - Arrays / Strings / Linked Lists / Dynamic Programming / etc.
- ✏️ **Difficulty** - Easy / Medium / Hard
- ✏️ **Level** - 1 (Beginner) to 4 (Expert)
- ✏️ **Description** - Problem statement
- ✏️ **Solution** - Code solution
- ✏️ **Approach** - Algorithm explanation

---

## GD Topics - Edit Fields

When editing a GD topic, admins can modify:
- ✏️ **Title** - Topic name (e.g., "AI in Healthcare")
- ✏️ **Category** - Technology / Social / Business / Finance / etc.
- ✏️ **Level** - 1 (Beginner) to 4 (Expert)
- ✏️ **Description** - Topic overview
- ✏️ **Conclusion** - Model conclusion/summary

---

## How to Use

### Step 1: Navigate to Manage Tab
- Go to Admin panel
- Click one of the "Manage" tabs (Manage questions for Aptitude, Technical, or GD)

### Step 2: Load Questions
- Click **"Load All Questions"** button
- Wait for questions to load

### Step 3: Edit a Question
- Find the question you want to edit
- Click **Edit** button
- Modify the fields
- Click **Save Changes**
- Success message appears, question is updated

### Step 4: Delete a Question
- Find the question you want to delete
- Click **Delete** button
- Confirm in the dialog
- Question is permanently removed

---

## State Management

### New State Variables Added

```typescript
// Questions list state for editing
const [allAptitudeQuestions, setAllAptitudeQuestions] = useState<any[]>([]);
const [allTechnicalQuestions, setAllTechnicalQuestions] = useState<any[]>([]);
const [allGdQuestions, setAllGdQuestions] = useState<any[]>([]);

// Edit mode state
const [editingAptitudeId, setEditingAptitudeId] = useState<string | null>(null);
const [editingTechnicalId, setEditingTechnicalId] = useState<string | null>(null);
const [editingGdId, setEditingGdId] = useState<string | null>(null);

// Edit forms
const [editAptitudeForm, setEditAptitudeForm] = useState<any>(null);
const [editTechnicalForm, setEditTechnicalForm] = useState<any>(null);
const [editGdForm, setEditGdForm] = useState<any>(null);

const [loadingQuestions, setLoadingQuestions] = useState(false);
```

---

## API Functions

### Fetch Functions (Load Questions)
- `fetchAllAptitudeQuestions()` - Get all aptitude questions
- `fetchAllTechnicalQuestions()` - Get all technical questions
- `fetchAllGdQuestions()` - Get all GD topics

### Update Functions (Save Changes)
- `handleUpdateAptitude()` - Update aptitude question in database
- `handleUpdateTechnical()` - Update technical question in database
- `handleUpdateGd()` - Update GD topic in database

### Delete Functions (Remove Questions)
- `handleDeleteAptitude(id)` - Delete aptitude question
- `handleDeleteTechnical(id)` - Delete technical question
- `handleDeleteGd(id)` - Delete GD topic

---

## Database Operations

### Update Query Structure
```typescript
await supabase
  .from('table_name')
  .update({ field1, field2, ... })
  .eq('id', questionId);
```

### Delete Query Structure
```typescript
await supabase
  .from('table_name')
  .delete()
  .eq('id', questionId);
```

All operations include:
- ✅ Error handling with toast notifications
- ✅ Automatic count refresh after changes
- ✅ Loading states during save
- ✅ Confirmation dialogs for deletion

---

## Validation

Before saving edits, the system validates:

**Aptitude Questions:**
- ✓ Question text is not empty
- ✓ All 4 options have text
- ✓ Explanation is provided
- ✓ Correct answer is 0-3

**Technical Questions:**
- ✓ Title is not empty
- ✓ Description is not empty
- ✓ Solution is not empty
- ✓ Approach is not empty

**GD Topics:**
- ✓ Title is not empty
- ✓ Description is not empty
- ✓ Conclusion is not empty

If validation fails, error toast appears with message.

---

## User Feedback

### Toast Notifications
- ✅ "Aptitude question updated!" - Successful edit
- ✅ "Question deleted!" - Successful deletion
- ❌ Error messages - If something goes wrong

### Button States
- Buttons show "Saving..." while saving
- Edit/Delete buttons disabled during save
- Cancel button allows discarding changes

---

## Files Modified

### `/src/pages/Admin.tsx`

**Added:**
- 20+ new state variables for edit mode
- 3 fetch functions (`fetchAllAptitudeQuestions`, `fetchAllTechnicalQuestions`, `fetchAllGdQuestions`)
- 3 update handlers (`handleUpdateAptitude`, `handleUpdateTechnical`, `handleUpdateGd`)
- 3 delete handlers (`handleDeleteAptitude`, `handleDeleteTechnical`, `handleDeleteGd`)
- 3 new TabsContent sections (manage-apt, manage-tech, manage-gd)
- Updated TabsList from 4 to 7 tabs

**Total Lines Added:** ~700 lines of edit/delete functionality

---

## Security Considerations

### Row Level Security (RLS)
- Admin policies already exist in Supabase
- Only admins can update/delete questions
- Users cannot modify questions via API

### Validation
- All inputs validated before save
- Confirmation dialog for destructive actions
- Error handling for failed operations

---

## Performance

### Optimization
- Questions loaded on-demand (click "Load All" button)
- Scrollable list with max-height (prevents long page)
- Lazy loading of edit forms (only when needed)
- Debounced input fields

### Database
- Indexed queries by ID
- Minimal data transferred
- Efficient updates

---

## Future Enhancements

Possible improvements:
- [ ] Bulk edit functionality
- [ ] Search/filter in manage tabs
- [ ] Undo/redo for edits
- [ ] Edit history tracking
- [ ] Template creation from existing questions
- [ ] Import/export questions
- [ ] Duplicate question feature

---

## Testing Checklist

- [ ] Load questions in Manage tab
- [ ] Edit an aptitude question successfully
- [ ] Edit a technical question successfully
- [ ] Edit a GD topic successfully
- [ ] Cancel edit (changes discarded)
- [ ] Delete a question (with confirmation)
- [ ] Verify counts update after edit
- [ ] Verify counts update after delete
- [ ] Try invalid input (should show error)
- [ ] Check success toast messages

---

## Quick Start

1. **Go to Admin Panel** → Click any "Manage" tab
2. **Click "Load All Questions"** → Questions appear
3. **Click "Edit"** → Form opens
4. **Modify fields** → Make your changes
5. **Click "Save Changes"** → Updates database
6. **Success!** → Toast confirms update

Or for deletion:
1. **Click "Delete"** → Confirmation dialog
2. **Confirm** → Question removed
3. **Done!** → Counts update automatically

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Ensure you're logged in as admin
3. Verify question data is valid
4. Check network tab for failed requests
5. Review error toast messages for hints

Happy editing! 🎉
