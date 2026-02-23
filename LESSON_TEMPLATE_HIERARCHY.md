# Lesson Template Type Hierarchy

## Template Type: Lesson

**Label:** Lesson  
**Description:** Standard instructional lesson page  
**Icon:** BookOpen  
**Badge:** border-border bg-muted/60 text-foreground

---

## Block Structure

The "lesson" template includes **6 mandatory blocks**. All included blocks are required for the lesson template type. The Scoring block is **not included** in lesson templates.

### 1. Header Block
- **ID:** `header`
- **Label:** Header
- **Description:** Title, date, student name
- **Mandatory:** Yes (✓)
- **Icon:** FileText
- **Preview Height:** 40px

#### Fields:
| Field Key | Label | Required | Type Match |
|-----------|-------|----------|----------|
| lesson_number | Lesson Number | ✓ | lesson |
| lesson_title | Lesson Title | ✓ | lesson |
| module_title | Module Title | ✓ | lesson |
| course_title | Course Title | ✓ | lesson |
| institution_name | Institution Name | ✓ | lesson |
| teacher_name | Teacher Name | ✗ | lesson |
| date | Date | ✓ | lesson |

---

### 2. Program Block
- **ID:** `program`
- **Label:** Program
- **Description:** Objectives & lesson overview
- **Mandatory:** Yes (✓)
- **Icon:** Lightbulb
- **Preview Height:** 52px

#### Fields:
| Field Key | Label | Required | Type Match |
|-----------|-------|----------|-----------|
| topic | Topic | ✓ | lesson |
| objective | Objective | ✓ | lesson |
| task | Task | ✓ | lesson |
| program_time | Time | ✓ | lesson |

---

### 3. Resources Block
- **ID:** `resources`
- **Label:** Resources
- **Description:** Reference materials & links
- **Mandatory:** Yes (✓)
- **Icon:** Boxes
- **Preview Height:** 44px

#### Fields:
| Field Key | Label | Required | Type Match |
|-----------|-------|----------|-----------|
| task | Task | ✓ | lesson |
| type | Type | ✓ | lesson |
| origin | Origin | ✓ | lesson |
| state | State | ✓ | lesson |
| quality | Quality | ✓ | lesson |

---

### 4. Content Block
- **ID:** `content`
- **Label:** Content
- **Description:** Main body — topics, notes, media
- **Mandatory:** Yes (✓)
- **Icon:** BookOpen
- **Preview Height:** 80px

#### Fields:
| Field Key | Label | Required | Type Match |
|-----------|-------|----------|-----------|
| topic | Topic | ✓ | lesson |
| objective | Objective | ✓ | lesson |
| task | Task | ✓ | lesson |
| instruction_area | Instruction Area | ✓ | lesson |
| student_area | Student Area | ✓ | lesson |
| teacher_area | Teacher Area | ✓ | lesson |

---

### 5. Assignment Block
- **ID:** `assignment`
- **Label:** Assignment
- **Description:** Tasks & exercises for students
- **Mandatory:** Yes (✓)
- **Icon:** CheckSquare
- **Preview Height:** 60px

#### Fields:
| Field Key | Label | Required | Type Match |
|-----------|-------|----------|-----------|
| topic | Topic | ✓ | lesson |
| objective | Objective | ✓ | lesson |
| task | Task | ✓ | lesson |
| instruction_area | Instruction Area | ✓ | lesson |
| student_area | Student Area | ✓ | lesson |
| teacher_area | Teacher Area | ✓ | lesson |

---

### 6. Footer Block
- **ID:** `footer`
- **Label:** Footer
- **Description:** Signatures, branding, page number
- **Mandatory:** Yes (✓)
- **Icon:** Layers
- **Preview Height:** 32px

#### Fields:
| Field Key | Label | Required | Type Match |
|-----------|-------|----------|-----------|
| copyright | Copyright | ✓ | lesson |
| teacher_name | Teacher Name | ✗ | lesson |
| page_number | Page Number | ✓ | lesson |

---

## Summary Statistics

### Block Coverage
- **Total Blocks:** 6
- **Mandatory Blocks:** 6 (100%)
- **Optional Blocks:** 0 (0%)

### Field Coverage
- **Total Fields Across All Blocks:** 31
- **Fields Applicable to Lesson:** 31
- **Inapplicable Fields:** 0

### Required vs Optional
- **Required Fields (Enabled by Default):** 29
- **Optional Fields:** 2

---

## Block Rendering Order

When rendering a lesson template, blocks appear in this order:

1. Header (40px)
2. Program (52px)
3. Resources (44px)
4. Content (80px)
5. Assignment (60px)
6. Footer (32px)

**Total Preview Height:** 308px (approximate)

---

## Template Configuration

When creating a new "lesson" template:

1. ✓ **Header** - Auto-enabled (mandatory)
   - 7 fields, 6 required, 1 optional
   
2. ✓ **Program** - Auto-enabled (mandatory)
   - 4 fields, all required (Topic, Objective, Task, Time)
   
3. ✓ **Resources** - Auto-enabled (mandatory)
   - 5 fields, all required
   
4. ✓ **Content** - Auto-enabled (mandatory)
   - 6 fields, all required (Topic, Objective, Task, with Instruction/Student/Teacher areas)
   
5. ✓ **Assignment** - Auto-enabled (mandatory)
   - 6 fields, all required (Topic, Objective, Task, with Instruction/Student/Teacher areas)
   
6. ✓ **Footer** - Auto-enabled (mandatory)
   - 3 fields, 2 required, 1 optional

---

## Data Structure References

### Block Definition
```typescript
{
  id: "header" | "program" | "resources" | "content" | "assignment" | "scoring" | "footer",
  label: string,
  description: string,
  mandatory: boolean,
  previewH: number,
  forTypes: TemplateType[] // includes "lesson"
}
```

### Field Definition
```typescript
{
  key: string,
  label: string,
  required: boolean,
  forTypes: TemplateType[] // includes "lesson"
}
```

### Template State
```typescript
{
  id: string,
  name: string,
  type: "lesson",
  enabled: Record<BlockId, boolean>, // all true for lesson
  fieldEnabled: Record<BlockId, Record<string, boolean>>, // required fields auto-true
  description: string,
  createdAt: string
}
```

---

## Notes

- All 6 included blocks are mandatory for lesson templates; users cannot remove any block
- The Scoring block is not available for lesson templates (it's only for: assessment, exam, quiz, project, lab)
- Field counts reflect only the fields displayed in the preview tables
- Optional fields: teacher_name in Header and Footer
- Required fields are always checked and disabled in the UI
