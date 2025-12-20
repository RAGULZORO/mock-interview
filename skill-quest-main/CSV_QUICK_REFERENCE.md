# 🚀 CSV BULK IMPORT - QUICK REFERENCE

## 📍 Where to Find It

**Admin Panel → Import Tab** (one for each question type)

```
[Aptitude] [Technical] [GD] [Manage] [Manage] [Manage] [Import] [Import] [Import] [Progress]
                                                             ↑       ↑       ↑
                                                     CLICK THESE!
```

---

## ⚡ Quick Steps

### **1️⃣ Download Template**
```
Admin > Import (Aptitude/Technical/GD) 
  ↓
Click "Download Template" 
  ↓
Opens CSV file with examples
```

### **2️⃣ Prepare CSV**
Open CSV in Excel, add your questions, save

### **3️⃣ Upload CSV**
```
Click "Browse Files"
  ↓
Select CSV file
  ↓
Filename appears
```

### **4️⃣ Validate CSV**
```
Click "Validate CSV"
  ↓
See errors (if any)
  ↓
Fix errors or proceed
```

### **5️⃣ Import Questions**
```
Click "Import X Questions"
  ↓
Watch progress bar
  ↓
Success! Questions added
```

---

## 📋 CSV Templates

### **Aptitude**
```
category,level,question,option_a,option_b,option_c,option_d,correct_answer,explanation
```
**Categories:** Quantitative | Logical Reasoning | Verbal Ability | Data Interpretation

### **Technical**
```
title,category,difficulty,level,description,solution,approach
```
**Categories:** Arrays | Strings | LinkedLists | Trees | DP | Sorting | Searching
**Difficulty:** Easy | Medium | Hard

### **GD**
```
title,category,level,description,points_for,points_against,conclusion
```
Separate multiple points with `;`

---

## ⚠️ Common Errors & Fixes

| Error | Fix |
|-------|-----|
| "CSV file is empty" | Make sure file has data, not just headers |
| "Missing 'question' field" | Check spelling of column headers |
| "Must have 4 options" | Fill all 4 columns: option_a, b, c, d |
| "'level' must be 1-4" | Use only 1, 2, 3, or 4 |
| "correct_answer must be 0-3" | Use 0, 1, 2, or 3 (not 1, 2, 3, 4) |
| "Invalid category" | Use exact category from list |
| "Missing explanation" | Fill explanation column |

---

## 🔢 Field Requirements

| Type | Required Fields |
|------|-----------------|
| **Aptitude** | category, level, question, option_a/b/c/d, correct_answer, explanation |
| **Technical** | title, category, difficulty, level, description, solution, approach |
| **GD** | title, category, level, description, points_for, points_against, conclusion |

---

## 💡 Pro Tips

✅ Use **Excel** to create CSV (easier than text editor)
✅ Download template **first** to see exact format
✅ Start with **5-10 questions** to test
✅ Save CSV as **UTF-8** encoding
✅ **Wrap text in quotes** if it contains commas: `"This, has comma"`
✅ Test import on **small batch first**
✅ Check **Manage tab** after import to verify

---

## 📊 Example: 3-Question Import

Create file named `my_questions.csv`:

```
category,level,question,option_a,option_b,option_c,option_d,correct_answer,explanation
Quantitative,1,What is 3+5?,7,8,9,10,1,3+5 equals 8 by simple addition
Quantitative,1,What is 12-3?,8,9,10,11,1,12-3 equals 9 by subtraction
Logical Reasoning,2,Which comes next: 3 6 12 24?,48,40,36,50,0,Each number doubles (pattern)
```

---

## 🎯 Processing Speed

- 📝 **Parse:** <100ms
- ✅ **Validate:** <500ms per 100 questions
- 💾 **Insert:** 2-3 seconds for 50 questions
- 📈 **100 questions:** ~5-10 seconds total

---

## 🔄 What Happens During Import

```
Step 1: Upload CSV file
   ↓
Step 2: Parse CSV (converts text to structured data)
   ↓
Step 3: Validate each row (checks all fields)
   ↓
Step 4: Show errors or success count
   ↓
Step 5: Insert to database in batches of 50
   ↓
Step 6: Update question counts
   ↓
✅ Done!
```

---

## 🚫 What Won't Work

❌ Partial CSV (missing columns)
❌ Wrong data types (text in level field)
❌ Missing required fields
❌ Invalid category names
❌ Excel file (must be CSV)
❌ JSON file (must be CSV)

---

## ✅ Verification After Import

1. Go to **Manage** tab
2. Click **"Load All Questions"**
3. Scroll through list
4. Verify your new questions appear
5. Check content looks correct
6. That's it!

---

## 📞 Need Help?

1. **Check error message** - Shows exact row and problem
2. **Download template** - Reference exact format
3. **Start with small batch** - Test with 1-2 questions
4. **Check browser console** - Press F12 > Console tab
5. **Verify CSV format** - Use Excel, save as CSV

---

## 🎉 You're Ready!

- ✅ Know where to find import
- ✅ Know CSV format
- ✅ Know common errors
- ✅ Ready to bulk import!

**Start with template → Download → Edit → Upload → Validate → Import! 🚀**

