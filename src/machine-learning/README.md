# Neptino Machine Learning

This directory manages Neptino's on-device AI intelligence models.

## Overview

Neptino uses browser-based machine learning powered by [Transformers.js](https://huggingface.co/docs/transformers.js) and ONNX Runtime. All models run entirely in the browser with no external API calls required.

## Current Models

### DistilGPT-2 (Xenova)
- **Model ID**: `Xenova/distilgpt2`
- **Size**: ~82M parameters (quantized ONNX format)
- **Capabilities**:
  - Text generation
  - Text completion
  - Educational content generation
  - Fast inference in browser (~200ms)
  - No authentication required
  - Proven compatibility with transformers.js

**Note**: This is a lightweight, openly available model optimized for browser use. It's a distilled version of GPT-2, suitable for basic text generation tasks. For better results with complex curriculum generation, you can:

1. **Upgrade to better models** by adding a Hugging Face token to your `.env`:
   ```
   VITE_HUGGINGFACE_TOKEN=your_token_here
   ```
   Then change the model ID in `Phi3Model.ts` to:
   - `HuggingFaceTB/SmolLM-135M-Instruct` (135M params, instruction-tuned)
   - `Xenova/gpt-3.5-turbo` (if available with auth)

2. **Get a Hugging Face token**: Visit https://huggingface.co/settings/tokens

## Usage

### Basic Text Generation

```typescript
import { phi3Model } from '@/machine-learning';

// Load the model (first time will download)
await phi3Model.load((progress) => {
  console.log(progress.status, progress.progress);
});

// Generate text
const result = await phi3Model.generate(
  'Explain quantum computing in simple terms:',
  {
    maxNewTokens: 256,
    temperature: 0.7
  }
);

console.log(result.text);
```

### Chat Interface

```typescript
import { phi3Model } from '@/machine-learning';

const messages = [
  {
    role: 'system',
    content: 'You are a helpful educational assistant for Neptino.'
  },
  {
    role: 'user',
    content: 'How can I create engaging lesson content?'
  }
];

const response = await phi3Model.chat(messages);
console.log(response.text);
```

### Model Manager

```typescript
import { modelManager } from '@/machine-learning';

// Initialize all models
await modelManager.initialize((progress) => {
  console.log(progress.status);
});

// Check status
const status = modelManager.getStatus();
console.log('Phi-3 ready:', status.phi3.isLoaded);

// Unload when done
await modelManager.unloadAll();
```

## Configuration

### Generation Parameters

- `maxNewTokens` (default: 512): Maximum tokens to generate
- `temperature` (default: 0.7): Randomness (0.0 = deterministic, 1.0 = creative)
- `topP` (default: 0.9): Nucleus sampling threshold
- `topK` (default: 50): Top-k sampling limit
- `repetitionPenalty` (default: 1.1): Penalty for repeating tokens

### Model Caching

Models are cached in browser storage after first download:
- Cache location: `indexedDB` via transformers.js
- Cache size: ~2.4GB for Phi-3.5 Mini
- Subsequent loads are instant (from cache)

## Performance

### First Load
- Download time: 2-5 minutes (depends on connection)
- Initialization: ~10-20 seconds

### Inference
- Speed: 5-20 tokens/second (depends on device)
- Memory: ~3-4GB RAM required
- Recommended: Modern laptop/desktop with GPU support

### Optimization Tips
1. Load models during app initialization
2. Keep model loaded if multiple inferences needed
3. Use lower `maxNewTokens` for faster responses
4. Consider `temperature=0` for deterministic outputs

## Future Enhancements

### Planned Models
- **Smaller models**: Phi-2 (2.7B) for faster inference
- **Specialized models**: Fine-tuned for specific educational tasks
- **Embedding models**: For semantic search and content matching

### Features
- Model quantization options (int8, int4)
- Streaming generation support
- Multi-model ensemble inference
- Custom fine-tuning capabilities

## Browser Compatibility

### Requirements
- Modern browser with WebAssembly support
- IndexedDB for model caching
- 4GB+ RAM recommended
- GPU acceleration (optional but recommended)

### Tested Browsers
- ✅ Chrome 90+
- ✅ Edge 90+
- ✅ Firefox 89+
- ✅ Safari 15+ (limited GPU support)

## Troubleshooting

### Model Won't Load
```typescript
// Check status
const status = phi3Model.getStatus();
console.log('Error:', status.error);

// Clear cache and retry
// (manually clear browser cache or IndexedDB)
```

### Slow Inference
- Reduce `maxNewTokens`
- Lower `temperature` to 0 for faster deterministic generation
- Check if GPU acceleration is enabled
- Close other browser tabs to free memory

### Out of Memory
- Ensure 4GB+ RAM available
- Close other applications
- Consider using smaller model variant (future)

## Resources

- [Transformers.js Docs](https://huggingface.co/docs/transformers.js)
- [Phi-3.5 Model Card](https://huggingface.co/microsoft/Phi-3.5-mini-instruct)
- [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/)

## License

Models are subject to their respective licenses:
- Phi-3.5: MIT License (Microsoft)
- Transformers.js: Apache 2.0
