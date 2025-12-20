# Admin Panel Question Count Feature - Implementation

## Overview

Added the "Questions Added per Level (Max 20)" status panel to **every admin panel** (Aptitude, Technical, and Group Discussion). This feature provides administrators with a clear visual overview of how many questions/topics have been added to each level.

## Changes Made

### 1. **State Management**
Added tracking states for question counts across all three sections:

```typescript
const [aptitudeQuestionCounts, setAptitudeQuestionCounts] = useState<Record<number, number>>({...});
const [technicalQuestionCounts, setTechnicalQuestionCounts] = useState<Record<number, number>>({...});
const [gdQuestionCounts, setGdQuestionCounts] = useState<Record<number, number>>({...});
```

### 2. **Fetch Functions**
Created three new async functions to fetch question counts from the database:

- **`fetchAptitudeQuestionCounts()`** - Counts questions per level from `aptitude_questions` table
- **`fetchTechnicalQuestionCounts()`** - Counts questions per level from `technical_questions` table
- **`fetchGdQuestionCounts()`** - Counts topics per level from `gd_topics` table

Each function:
- Queries the database for each level (1-4)
- Counts exact number of records per level
- Updates the corresponding state

### 3. **Initial Load**
Updated `useEffect` to fetch all three counts on component mount:

```typescript
useEffect(() => {
  fetchAptitudeQuestionCounts();
  fetchTechnicalQuestionCounts();
  fetchGdQuestionCounts();
}, []);
```

### 4. **Visual Status Panels**

#### Aptitude Panel
- Displays in the first section of the Aptitude tab
- Shows count for all 4 levels with color coding:
  - **Green** (Success): 20/20 - Level is complete
  - **Orange** (Warning): 15-19/20 - Level is nearly full
  - **Default**: 0-14/20 - Level has space

#### Technical Panel
- Displays in the first section of the Technical tab
- Same styling and color coding as Aptitude
- Label reads "Questions Added per Level"

#### GD Panel
- Displays in the first section of the Group Discussion tab
- Same styling and color coding
- Label reads "Topics Added per Level" (context-appropriate terminology)

### 5. **Validation & Warnings**

Each section now validates before allowing submissions:

```typescript
const currentCount = technicalQuestionCounts[technicalForm.level] || 0;
if (currentCount >= 20) {
  toast({ title: 'Error', description: `Level ${level} already has 20 questions...` });
  return;
}
```

#### Dynamic Alerts
- When a level reaches 20 items, a red warning alert appears below the panel
- Alert text varies by section:
  - Aptitude: "Level X already has 20 questions..."
  - Technical: "Level X already has 20 questions..."
  - GD: "Level X already has 20 topics..."

### 6. **Count Refresh**
After successful submission, counts are automatically refreshed:

```typescript
if (error) {
  // handle error
} else {
  toast({ title: 'Success', description: '...' });
  // Reset form
  await fetchTechnicalQuestionCounts(); // Refresh counts
}
```

## UI Components

### Status Card Layout
```
┌─────────────────────┐
│ Level 1             │     2/20  ✓
│ Beginner            │
└─────────────────────┘

┌─────────────────────┐
│ Level 2             │     0/20
│ Intermediate        │
└─────────────────────┘

(etc.)
```

### Color Coding
- **Border & Background**: Changes based on fill percentage
  - Empty: Gray border, card background
  - 75%+ (15-19): Orange border, warning background
  - Full (20): Green border, success background
- **Text Color**: Primary/Accent/Warning/Success based on level

### Completion Indicator
- Green checkmark icon (✓) appears when level reaches 20/20
- Only visible when count === 20

## Files Modified

- **`src/pages/Admin.tsx`**
  - Added 3 new state variables
  - Created 3 new fetch functions
  - Updated useEffect hook
  - Modified Aptitude tab (already had the panel)
  - Added panel to Technical tab
  - Added panel to GD tab
  - Updated form validation in submit handlers
  - Added count refresh after successful submissions

## Features & Benefits

✅ **Clear Visual Status**: Admins see at a glance how many questions exist per level
✅ **Consistent UI**: Same styling across all three sections
✅ **Prevention of Overload**: Can't add more than 20 questions per level
✅ **Real-time Updates**: Counts refresh after each submission
✅ **Color-coded Warnings**: Visual indicators for levels that are nearly full
✅ **User Feedback**: Clear error messages when limit is reached
✅ **Database Accurate**: Always synced with actual database content

## Database Queries

The feature performs COUNT queries on:
- `aptitude_questions` table (grouped by level)
- `technical_questions` table (grouped by level)
- `gd_topics` table (grouped by level)

All queries filter by `level` (1, 2, 3, 4) and use `count: 'exact'` for accurate counting.

## Testing Checklist

- [ ] Load Admin page - all counts should display
- [ ] Add an Aptitude question - count should increase
- [ ] Add a Technical question - count should increase
- [ ] Add a GD topic - count should increase
- [ ] Try adding when a level has 20 - should show error
- [ ] Verify alert message appears for full levels
- [ ] Check color transitions (0→14→15→20)
- [ ] Verify checkmark appears at 20/20

## Future Enhancements

Possible improvements:
- Add filtering by category in the count display
- Show count by category (not just by level)
- Add export functionality for question inventory
- Display creation date of newest question per level
- Add bulk import functionality with count validation
