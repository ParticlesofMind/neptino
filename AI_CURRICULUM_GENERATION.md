# AI-Assisted Curriculum Generation

## Overview

Neptino now includes AI-powered curriculum generation to help teachers quickly create course structures. The system uses on-device machine learning (via Transformers.js) to generate lesson names, topics, objectives, and tasks based on course context.

## Features

### Context-Aware Generation
The AI uses course information to generate relevant content:

**Required Context** (always used):
- Course name, description, teacher, institution, language
- Classification (subject, topic, year level)
- Pedagogical approach

**Optional Context** (user-selectable):
- Schedule settings (lesson duration, total lessons)
- Content structure (topics/lesson, objectives/topic, tasks/objective)
- Existing curriculum content

### Generation Options

1. **Generate All** - Complete curriculum structure with lessons, topics, objectives, and tasks
2. **Generate Module Names** - Descriptive titles for curriculum modules
3. **Generate Lesson Names** - Clear, progressive lesson titles
4. **Generate Topic Titles** - Topic names for each lesson
5. **Generate Objectives** - Learning objectives for each topic
6. **Generate Tasks** - Practice tasks for each objective

## Current Implementation

### Model
- **Default**: `Xenova/distilgpt2` (82M parameters)
- **Size**: ~50MB ONNX quantized
- **Speed**: ~200ms per generation
- **Requires**: No authentication

### Why DistilGPT-2?
We use a lightweight model by default because:
1. **No Auth Required** - Works immediately without API keys
2. **Browser-Compatible** - Runs entirely client-side
3. **Fast Downloads** - Small model size for quick initialization
4. **Reasonable Quality** - Sufficient for basic content generation

### Fallback System
If the AI produces unparseable output (common with smaller models), the system automatically:
1. Detects the parsing failure
2. Generates template-based placeholder content
3. Notifies the user
4. Allows manual editing of all generated content

## Upgrading to Better Models

### Step 1: Get Hugging Face Token
1. Visit https://huggingface.co/settings/tokens
2. Create a new token with `read` access
3. Copy the token

### Step 2: Add to Environment
Create/update `.env` in project root:
```env
VITE_HUGGINGFACE_TOKEN=hf_your_token_here
```

### Step 3: Change Model
Edit `src/machine-learning/Phi3Model.ts`:

```typescript
// Option 1: Better instruction-following (recommended)
private readonly defaultModelId = 'HuggingFaceTB/SmolLM-135M-Instruct';

// Option 2: Larger, more capable (requires auth)
private readonly defaultModelId = 'onnx-community/Phi-3.5-mini-instruct';
```

### Recommended Models

| Model | Size | Auth Required | Quality | Speed |
|-------|------|---------------|---------|-------|
| `Xenova/distilgpt2` | 82M | ❌ | ⭐⭐ | ⚡⚡⚡ |
| `HuggingFaceTB/SmolLM-135M-Instruct` | 135M | ✅ | ⭐⭐⭐ | ⚡⚡ |
| `onnx-community/Phi-3.5-mini-instruct` | 3.8B | ✅ | ⭐⭐⭐⭐⭐ | ⚡ |

## UI/UX

### Location
Configure Curriculum → Below Template Placement section

### Checkboxes
- **Required Context**: Pre-checked, disabled (always used)
- **Optional Context**: User can toggle on/off

### Buttons
- Clean, minimal design (no emojis)
- Primary button for "Generate All"
- Outline buttons for specific generations

### Progress Indicator
- Shows model loading status
- Displays download progress
- Indicates generation phase
- Reports success/fallback state

## Technical Architecture

### Files Created/Modified

1. **`src/scripts/backend/courses/curriculum/aiCurriculumGenerator.ts`**
   - Main AI generation logic
   - Context gathering
   - Prompt engineering
   - Response parsing and fallback

2. **`src/scripts/backend/courses/curriculum/curriculumManager.ts`**
   - Integrated AI generation handlers
   - UI event binding
   - Content application to curriculum

3. **`src/scss/components/_ai-generation.scss`**
   - AI generation section styling
   - Checkbox styling
   - Progress indicator styles

4. **`src/pages/teacher/coursebuilder.html`**
   - AI generation UI section
   - Context selection checkboxes
   - Generation buttons

5. **`src/machine-learning/Phi3Model.ts`**
   - Updated to use lightweight model
   - Added HF token support
   - Improved error handling

### Data Flow

```
User clicks "Generate Lessons"
    ↓
Check if model is loaded → Load if needed
    ↓
Gather course context from database
    ↓
Build AI prompt with context
    ↓
Generate text via model
    ↓
Parse JSON response → Fallback if fails
    ↓
Apply to curriculum structure
    ↓
Save to database & render preview
```

## Known Limitations

### Current Model (DistilGPT-2)
- Not instruction-tuned (may produce unexpected formats)
- Limited context understanding
- Occasional parsing failures (handled by fallback)
- Generic outputs (improves with better models)

### Solutions
1. Use fallback content as starting point
2. Manually edit all generated content (fully editable)
3. Upgrade to better model with HF token
4. Generate smaller targets (lessons only vs. all)

## Future Enhancements

### Planned Improvements
- [ ] Context-aware re-generation (regenerate single lesson)
- [ ] Bulk edit/refinement operations
- [ ] Integration with existing lesson content
- [ ] Multi-language generation support
- [ ] Style/tone customization options
- [ ] Model quality selection in UI
- [ ] Streaming generation (show results as they generate)

### Model Upgrades
- [ ] Fine-tuned model specifically for curriculum design
- [ ] Domain-specific models (math, science, languages)
- [ ] Multi-modal support (include images, diagrams)

## Usage Tips

1. **Start Small**: Try "Generate Lesson Names" before "Generate All"
2. **Review Everything**: All generated content is editable—treat it as a starting point
3. **Provide Context**: Fill out course details before generating
4. **Use Fallback**: Template content is still useful for structure
5. **Iterate**: Generate, edit, regenerate specific parts as needed

## Troubleshooting

### Model Won't Load
- Check browser console for errors
- Verify internet connection
- Clear browser cache and retry

### Generation Fails
- System will automatically use fallback content
- Try a smaller generation target
- Check course context is complete

### Poor Quality Output
- Add Hugging Face token
- Upgrade to better model
- Provide more detailed course description
- Use generated content as template to edit

## Support

For issues or questions:
1. Check browser console for detailed error messages
2. Review `src/machine-learning/README.md` for model info
3. Verify environment variables are set correctly
4. Test with fallback content first
