# LLM Model Selection Feature Implementation Summary

## Overview
Implemented a comprehensive LLM model selection interface in the coursebuilder setup, allowing teachers to choose which Ollama model to use for curriculum generation. This directly addresses the timeout and performance issues by enabling model selection based on speed/quality tradeoffs.

## Changes Made

### 1. **New Ollama Models Service** (`src/lib/ollama/models.ts`)
- Exports `AVAILABLE_MODELS` array with 8 curated models:
  - **deepseek-r1**: Advanced reasoning (70B) - Best for 20-40 lessons
  - **qwen3-instruct**: Balanced (14B) - Best for 30-60 lessons
  - **llama3.2**: Fast general-purpose (11B) - Best for 40-100+ lessons
  - **gemma3**: Lightweight (4.3B) - Best for 40-100+ lessons
  - **mistral**: Compact (7B) - Best for 40-100+ lessons
  - **neural-chat**: Conversational (7B) - Best for 40-100+ lessons
  - **phi3**: Compact reasoning (3.8B) - Best for 40-100+ lessons
  - **dbrx-instruct**: State-of-the-art MoE (132B) - Best for 30-60 lessons

- Each model includes:
  - Display name
  - Description explaining its strengths vs other models
  - Parameter size
  - Speed tier: "fast", "medium", "slow"
  - Reasoning capability flag
  - Cost indicator

- Utility functions:
  - `fetchOllamaModels()`: Get running models from Ollama
  - `getModelInfo()`: Look up model metadata
  - `checkOllamaHealth()`: Health check for Ollama connectivity

### 2. **LLM Selection UI Component** (`src/components/coursebuilder/sections/llm-section.tsx`)
- Card-based UI showing all available models
- Features:
  - Health check indicator showing if Ollama is running
  - Selection cards with:
    - Model name and parameter count
    - Speed badge (⚡ Fast, ⏱ Balanced, 🤔 Thorough)
    - Reasoning badge for reasoning models
    - Unique description highlighting differences from other models
    - Recommended lesson count range
    - Cost indicator
  - Selected model detailed info card
  - Automatic save to database via debounced changes
  - Last saved timestamp

### 3. **Sidebar Integration** (`src/app/(coursebuilder)/teacher/coursebuilder/page.tsx`)
- Added "AI Model" section to SETUP sidebar with Brain icon
- Placed after Curriculum section for logical flow
- Integrated LLMSection component

### 4. **API Route Updates** (`src/app/api/generate-curriculum/route.ts`)
- Updated to accept optional `model` parameter in request body
- Falls back to `OLLAMA_MODEL_DEFAULT` environment variable if not provided
- Detects reasoning models dynamically to optimize token usage
- Increased `maxDuration` from 300s (5 min) to 600s (10 min) to handle slow models
- Logs selected model for debugging

### 5. **Generation Service Updates** (`src/lib/curriculum/ai-generation-service.ts`)
- `callGenerationAPI()` now accepts optional `selectedModel` parameter
- Passes model to API endpoint
- Increased client timeout from 5 minutes to 10 minutes
- Improved timeout error message with actionable suggestions:
  - Reduce lesson count to 20-40
  - Switch to faster models (Llama 3.2, Phi 3)
  - Split generation into smaller batches

### 6. **Curriculum Section Updates** (`src/components/coursebuilder/sections/curriculum-section.tsx`)
- Added `selectedLLMModel` state
- Loads saved model preference from generation_settings on mount
- Passes selected model to API when generating
- Dynamic status message showing model name and estimated time
- Better lesson count range guidance based on selected model

## How It Works

### User Flow
1. Teacher opens coursebuilder setup
2. Navigates to "AI Model" section (new sidebar item)
3. Sees all available models with descriptions and performance characteristics
4. Selects a model (auto-saved)
5. Sees recommended lesson counts for that model
6. When generating curriculum, that model is used automatically

### Generation Flow
1. Teacher starts curriculum generation
2. System loads selected LLM model from database
3. API receives both prompt and model name
4. Ollama generates with specified model
5. Increased timeout (10 min) prevents premature cancellation
6. Better error messages guide the teacher if timeout still occurs

## Performance Improvements

### Timeout Issues Addressed
- **Root cause**: Rapid plateau at 33 lessons was due to:
  - 5-minute timeout too aggressive for reasoning models
  - No way to select faster models
  - No guidance on reasonable lesson counts per model

- **Solutions provided**:
  1. Extended timeout from 5 to 10 minutes
  2. Can now select faster models (Llama 3.2, Phi 3, Gemma 3)
  3. Clear recommendations: deepseek-r1 best for 20-40 lessons
  4. Fast models can handle 40-100+ lessons
  5. If still timing out, actionable guidance to reduce lessons further

### Model Selection Strategy
- **For thoroughness + speed**: llama3.2 (fast, reliable, balanced)
- **For quick iteration**: gemma3 or phi3 (very fast)
- **For highest quality**: deepseek-r1 (slow but best reasoning)
- **For high volume**: Use fast models (llama3.2, gemma3) with larger lesson counts

## Database Schema Impact
- Stores `selected_llm_model` in `generation_settings`
- Persists teacher's model choice across sessions
- No migrations needed - uses flexible JSON column

## Environment Variables
- `OLLAMA_BASE_URL`: Ollama server URL (default: http://localhost:11434)
- `OLLAMA_MODEL`: Fallback model if none selected (default: deepseek-r1)

## Testing Recommendations
1. **Test model switching**: Select different models and generate curriculum
2. **Test with large lesson counts**: Try 50+ lessons with fast models
3. **Test timeouts**: Disable Ollama and verify health check
4. **Test persistence**: Switch models multiple times, reload page
5. **Test error messages**: Try generating with Ollama offline

## Future Enhancements
- Model benchmarking dashboard (show actual times per lesson count)
- Custom model upload support
- Automatic model recommendation based on lesson count
- Batch generation with model switching
- Model performance metrics tracking
