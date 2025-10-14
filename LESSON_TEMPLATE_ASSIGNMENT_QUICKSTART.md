# Quick Reference: Lesson Template Assignment

## What This Feature Does
Allows you to assign ANY template type (Lesson, Project, Lab, Assessment, etc.) to individual scheduled sessions in your curriculum.

## Visual Example

```
┌─────────────────────────────────────────────────────────────┐
│  MODULE 1: Introduction to Web Development                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📘 Lesson 1: HTML Basics                                   │
│     Template: [Standard Lesson ▼]  [Lesson]                │ ← Dropdown + Badge
│     • Topic 1: HTML Structure                               │
│     • Topic 2: Common Tags                                  │
│                                                              │
│  🔬 Lesson 2: Hands-on Practice                            │
│     Template: [Lab Session ▼]  [Lab]                       │ ← Different template
│     • Topic 1: Build a webpage                              │
│                                                              │
│  📘 Lesson 3: CSS Introduction                              │
│     Template: [Standard Lesson ▼]  [Lesson]                │ ← Back to lesson
│     • Topic 1: Selectors                                    │
│                                                              │
│  [Certificate Template]  ← Automatic placement              │
└─────────────────────────────────────────────────────────────┘
```

## How to Use

### 1. Create Templates First
Go to **Templates** section → Create various template types:
- Standard Lesson
- Lab Session  
- Project
- Assessment
- Guest Lecture
- etc.

### 2. Generate Your Curriculum
Go to **Curriculum** section → Configure and generate lessons

### 3. Assign Templates to Sessions
In the curriculum preview:
1. Find the lesson/session you want to configure
2. Click the **Template dropdown** below the lesson title
3. Select the appropriate template from the list
4. See the colored badge appear showing template type
5. **Auto-saves immediately** ✨

### 4. Change Templates Anytime
- Just select a different template from the dropdown
- Choose "No Template" to remove assignment
- Changes save automatically

## Template Type Examples

### Standard Course Flow
```
Week 1:
- Lesson 1: [Standard Lesson] Introduction
- Lesson 2: [Standard Lesson] Core Concepts  
- Lesson 3: [Lab Session] Practice Exercises

Week 2:
- Lesson 4: [Project] Start Project
- Lesson 5: [Project] Continue Project
- Lesson 6: [Assessment] Mid-term Quiz
```

### Workshop-Style Course
```
Day 1:
- Session 1: [Lecture] Theory Overview
- Session 2: [Demo] Live Demonstration
- Session 3: [Workshop] Build Together

Day 2:
- Session 4: [Project] Independent Work
- Session 5: [Presentation] Share Results
- Session 6: [Certificate] Completion
```

## Key Features

✅ **Any template type** can be assigned to any session
✅ **Color-coded badges** for quick visual identification
✅ **Grouped dropdown** - templates organized by type
✅ **Auto-save** - changes persist immediately
✅ **No Template option** - sessions can have no template
✅ **Works in all views** - Titles, Topics, Objectives, Tasks, All, Modules

## Template Colors

Each template type gets a distinct color:

| Template Type | Color  | Use Case                        |
|---------------|--------|---------------------------------|
| Lesson        | 🔵 Sky   | Standard lectures/instruction  |
| Assessment    | 🟣 Violet| Tests, quizzes, evaluations    |
| Project       | 🟡 Amber | Independent work, assignments  |
| Lab           | 🟢 Teal  | Hands-on practice              |
| Certificate   | 🔴 Rose  | Completion documents           |
| Other         | ⚫ Slate | Custom or miscellaneous        |

## Difference from Template Placement

### Template Assignment (This Feature)
- **What**: Defines the structure/format OF the lesson
- **Where**: Stored in the lesson itself
- **Example**: "Lesson 3 uses the Lab template"

### Template Placement (Existing Feature)  
- **What**: Inserts content AFTER lessons/modules
- **Where**: Separate placement configuration
- **Example**: "Certificate appears after each module"

### Both Together
```
Lesson 1 [Standard Lesson template assigned]
Lesson 2 [Lab Session template assigned]
Lesson 3 [Standard Lesson template assigned]
[Certificate template placed here] ← Automatic insertion
```

## Data Storage

Template assignments are saved in your course's `curriculum_data`:

```json
{
  "lessons": [
    {
      "lessonNumber": 1,
      "title": "Introduction",
      "templateId": "uuid-of-standard-lesson",
      "topics": [...]
    },
    {
      "lessonNumber": 2,
      "title": "Lab Day",
      "templateId": "uuid-of-lab-template",
      "topics": [...]
    }
  ]
}
```

## Tips & Best Practices

💡 **Create templates first** - You need templates before you can assign them

💡 **Name templates clearly** - Use descriptive names like "Standard 60-min Lesson" or "2-hour Lab Session"

💡 **Use consistent patterns** - If every 3rd lesson is a lab, create a rhythm students expect

💡 **Match template to duration** - Assign project templates to longer sessions

💡 **No template is OK** - Not every session needs a formal template structure

💡 **Templates are flexible** - Change assignments anytime as your course evolves

## Troubleshooting

**Q: Dropdown doesn't appear?**
A: Create at least one template first in the Templates section

**Q: Changes don't save?**
A: Check browser console for errors, ensure you're logged in

**Q: Template deleted but still shows?**
A: Remove the assignment by selecting "No Template"

**Q: Want bulk assignment?**
A: Currently need to assign individually (bulk feature planned)

**Q: Can I preview the template?**
A: Hover preview feature coming in future update
