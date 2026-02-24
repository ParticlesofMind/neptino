# LLM Feature Testing Guide

## Quick Start

### 1. Ensure Ollama is Running
```bash
ollama serve
```

### 2. Pull your preferred models:
```bash
# For quick testing (recommended)
ollama pull llama3.2

# For most thorough reasoning
ollama pull deepseek-r1

# For very fast generation
ollama pull phi3
```

### 3. Start the dev server:
```bash
npm run dev
```

### 4. Access the coursebuilder:
```
http://localhost:3000/teacher/coursebuilder
```

## Testing the Feature

### Creating a New Course
1. Fill in Essentials section (title, description, language, type)
2. Set up Classification section
3. Add Students data
4. Set Pedagogy approach
5. Configure Templates
6. Create Schedule (at least 1 session)
7. **Go to "AI Model" section** (new!)
   - Select your preferred model
   - Read the recommendations for lesson count
   - Model choice is auto-saved

### Generating Curriculum
1. Go to Curriculum section
2. Set desired lesson count (follow model recommendations)
3. Click "Generate All" or specific component
4. Watch the status - it shows which model is being used
5. Check console for detailed timing information

## Understanding the Model Choices

### Speed Rankings (Fast → Slow)
1. **Phi 3** (3.8B) - Super fast, surprisingly good
2. **Gemma 3** (4.3B) - Very fast, reliable
3. **Mistral** (7B) - Fast, excellent quality
4. **Llama 3.2** (11B) - Fast, most popular, best balance
5. **Neural Chat** (7B) - Fast, conversation-focused
6. **Qwen 3** (14B) - Medium speed, high quality
7. **DBRX** (132B MoE) - Medium, most advanced
8. **DeepSeek R1** (70B) - Slow, best reasoning

### Recommended Lesson Counts
- **Fast models** (Phi 3, Gemma 3, Mistral, Llama 3.2): 40-100+ lessons
- **Medium models** (Qwen 3, DBRX): 30-60 lessons  
- **Slow models** (DeepSeek R1): 20-40 lessons

## Error Handling

### "Ollama Not Running"
- The LLM section shows a warning
- Solution: Start Ollama with `ollama serve`

### "Generation timed out after 10 minutes"
- Try one of:
  1. Reduce lesson count (try 20 for deepseek-r1, 50 for llama3.2)
  2. Switch to a faster model (try llama3.2 or phi3)
  3. Split into smaller batches (generate 20 lessons at a time)

### Model not appearing in selection
- Check if model is installed: `ollama list`
- Pull the model: `ollama pull <model-name>`
- Our curated list includes the most popular open-source models

## Console Debugging

Watch the browser console (F12) for:
```
[callGenerationAPI] Selected model: deepseek-r1
[generate-curriculum] Using model: deepseek-r1
[generate-curriculum] Estimated 40 lessons, token budget: 36096
[callGenerationAPI] Lessons generated: 40
```

## Performance Expectations

### With DeepSeek R1 (reasoning, slow)
- 20 lessons: ~2-3 minutes
- 30 lessons: ~4-5 minutes
- 40 lessons: ~6-8 minutes
- 50+ lessons: Risk of timeout

### With Llama 3.2 (fast, balanced)
- 40 lessons: ~2-3 minutes
- 60 lessons: ~3-5 minutes
- 80 lessons: ~5-7 minutes
- 100+ lessons: ~8-10 minutes

### With Phi 3 (very fast)
- 50 lessons: ~1-2 minutes
- 80 lessons: ~2-3 minutes
- 100+ lessons: ~3-5 minutes

*Note: Times vary based on your hardware (CPU/GPU availability)*

## Troubleshooting

### Model generates poor content
- Try switching to a slower/larger model (trade speed for quality)
- Or add more context in Essentials/Classification sections

### Generation stops at 33 lessons
- **Before fix**: This was the timeout issue
- **After fix**: Should handle up to 100+ lessons with fast models
- If still happening: Reduce lesson count or switch model

### Selected model doesn't persist
- Check browser DevTools → Application → IndexedDB or Cookies
- Course ID should match in database
- Try refreshing the page

### Model selection not working
- Open browser console and check for errors
- Verify course ID is set (should be in URL ?id=...)
- Ensure Supabase connection is working

## Verifying the Implementation

### Database Check
```sql
-- Check if model preference is saved
SELECT generation_settings FROM courses WHERE id = 'YOUR_COURSE_ID';

-- Should show something like:
-- {"selected_llm_model": "llama3.2", "course_goals": [...]}
```

### Network Check (Developer Tools → Network)
When generating, you should see:
1. `POST /api/generate-curriculum` with request body containing `model` field
2. The model name being passed in the JSON payload

### Performance Check
Compare generation times before/after selecting different models to verify:
- Faster models complete quicker
- Model selection is actually being used
- Timeout has been extended (up to 10 min, not 5 min)

## Questions?

If something doesn't work as expected:
1. Check the console (browser DevTools → Console)
2. Check Ollama is running and responding: `curl http://localhost:11434/api/tags`
3. Try a different model to isolate the issue
4. Check lesson count is reasonable for selected model
