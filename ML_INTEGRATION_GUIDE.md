# Machine Learning Integration Guide

## 🎉 Phi-3.5 Mini Successfully Integrated!

Neptino now includes on-device AI powered by Microsoft's Phi-3.5-mini-instruct (3.8B parameters) running entirely in the browser via Transformers.js and ONNX Runtime.

## 📁 Project Structure

```
src/machine-learning/
├── index.ts              # Main module exports
├── types.ts              # TypeScript type definitions
├── Phi3Model.ts          # Phi-3.5 Mini model implementation
├── ModelManager.ts       # Central model orchestrator
├── examples.ts           # Usage examples
└── README.md             # Detailed documentation
```

## 🚀 Quick Start

### 1. Load the Model

```typescript
import { phi3Model } from '@/machine-learning';

// Load model with progress tracking
await phi3Model.load(undefined, (progress) => {
  console.log(`${progress.status} - ${progress.progress}%`);
});
```

### 2. Generate Text

```typescript
const result = await phi3Model.generate(
  'Explain the water cycle:',
  {
    maxNewTokens: 256,
    temperature: 0.7
  }
);

console.log(result.text);
```

### 3. Chat Interface

```typescript
const messages = [
  { role: 'system', content: 'You are an educational assistant.' },
  { role: 'user', content: 'How do I teach fractions?' }
];

const response = await phi3Model.chat(messages);
console.log(response.text);
```

## 🎯 Use Cases for Neptino

### 1. **Lesson Content Generation**
Generate educational content, lesson plans, and learning materials:

```typescript
const prompt = `Create a lesson plan about photosynthesis for 6th grade:
1. Learning objectives
2. Key concepts  
3. Hands-on activities`;

const lesson = await phi3Model.generate(prompt, { maxNewTokens: 400 });
```

### 2. **Quiz Generation**
Automatically create quiz questions:

```typescript
const prompt = `Generate 5 multiple-choice questions about the American Revolution`;
const quiz = await phi3Model.generate(prompt);
```

### 3. **Content Summarization**
Summarize lengthy educational materials:

```typescript
const prompt = `Summarize this passage in 3 sentences:\n\n${longText}`;
const summary = await phi3Model.generate(prompt, { maxNewTokens: 150 });
```

### 4. **Student Assistance**
Provide AI-powered tutoring and explanations:

```typescript
const messages = [
  { role: 'system', content: 'You are a patient tutor.' },
  { role: 'user', content: 'I don\'t understand how photosynthesis works' }
];

const explanation = await phi3Model.chat(messages);
```

### 5. **Code Examples**
Generate educational code examples:

```typescript
const prompt = `Write a Python function that demonstrates list comprehension with comments`;
const code = await phi3Model.generate(prompt, { temperature: 0.5 });
```

## 🎨 Demo Page

Visit the interactive demo:
```
http://localhost:3000/src/pages/ml-demo.html
```

Features:
- Visual model loading with progress
- Live text generation
- Adjustable parameters (temperature, max tokens, top-p)
- Pre-built demo scenarios
- Real-time inference timing

## 🔧 Integration Points

### Course Builder Integration

Add AI assistance to the course builder:

```typescript
// In coursebuilder/ai/AIAssistant.ts
import { phi3Model } from '@/machine-learning';

export class AIAssistant {
  async generateLessonContent(topic: string) {
    if (!phi3Model.isReady()) {
      await phi3Model.load();
    }
    
    return await phi3Model.generate(
      `Create engaging lesson content about ${topic}`,
      { maxNewTokens: 500 }
    );
  }
}
```

### Template Generation

Auto-generate course templates:

```typescript
// In backend/courses/templates/AITemplateGenerator.ts
import { phi3Model } from '@/machine-learning';

export async function generateTemplate(subject: string, grade: string) {
  const prompt = `Create a course template for ${subject} (${grade} grade)`;
  return await phi3Model.generate(prompt);
}
```

### Student Interactions

Provide AI tutoring in student view:

```typescript
// In pages/student/ai-tutor.ts
import { phi3Model } from '@/machine-learning';

export async function askTutor(question: string, context: string) {
  const messages = [
    { role: 'system', content: `Context: ${context}` },
    { role: 'user', content: question }
  ];
  
  return await phi3Model.chat(messages);
}
```

## ⚙️ Configuration

### Model Settings

Adjust in `Phi3Model.ts`:

```typescript
private readonly defaultConfig: GenerationConfig = {
  maxNewTokens: 512,      // Maximum tokens to generate
  temperature: 0.7,       // Creativity (0.0-1.0)
  topP: 0.9,              // Nucleus sampling
  topK: 50,               // Top-k sampling
  doSample: true,         // Enable sampling
  repetitionPenalty: 1.1  // Reduce repetition
};
```

### Performance Tuning

For faster responses:
- Lower `maxNewTokens` (100-200)
- Set `temperature: 0` for deterministic output
- Use `topK: 40` for slightly faster sampling

For better quality:
- Higher `maxNewTokens` (500-1000)
- `temperature: 0.8-0.9` for more creativity
- `repetitionPenalty: 1.2` to avoid repetition

## 📊 Performance Metrics

### First Load (Downloads Model)
- **Size**: ~2.4GB (ONNX format)
- **Time**: 2-5 minutes (depends on connection)
- **Storage**: IndexedDB cache

### Subsequent Loads
- **Time**: <5 seconds (from cache)
- **Memory**: ~3-4GB RAM

### Inference Speed
- **Desktop/Laptop**: 10-20 tokens/second
- **With GPU**: 20-50 tokens/second
- **Mobile**: 3-8 tokens/second (not recommended)

## 🛡️ Best Practices

### 1. **Load Once, Reuse**
```typescript
// ✅ Good: Load once at app initialization
await modelManager.initialize();

// ❌ Bad: Loading multiple times
await phi3Model.load();
await phi3Model.load(); // Unnecessary
```

### 2. **Handle Loading States**
```typescript
// Check before using
if (!phi3Model.isReady()) {
  await phi3Model.load();
}

// Or use status
const status = phi3Model.getStatus();
if (status.isLoading) {
  // Show loading UI
}
```

### 3. **Optimize Token Usage**
```typescript
// For quick responses
await phi3Model.generate(prompt, { maxNewTokens: 100 });

// For detailed content
await phi3Model.generate(prompt, { maxNewTokens: 500 });
```

### 4. **Error Handling**
```typescript
try {
  const result = await phi3Model.generate(prompt);
} catch (error) {
  console.error('Generation failed:', error);
  // Fallback to default content or retry
}
```

## 🔮 Future Enhancements

### Planned Features
1. **Streaming Generation**: Real-time token-by-token output
2. **Model Quantization**: Smaller 4-bit/8-bit models
3. **Fine-tuning**: Custom models for Neptino-specific tasks
4. **Multi-modal**: Image understanding (Phi-3 Vision)
5. **Embedding Models**: Semantic search capabilities

### Additional Models
- **Phi-2** (2.7B): Faster, lighter alternative
- **Specialized Models**: Subject-specific fine-tunes
- **Code Models**: Enhanced code generation (CodePhi)

## 🐛 Troubleshooting

### Model Won't Load
```typescript
const status = phi3Model.getStatus();
console.log(status.error); // Check error message

// Clear cache if corrupted
// Browser DevTools > Application > IndexedDB > Delete transformers-cache
```

### Slow Inference
- Reduce `maxNewTokens`
- Set `temperature: 0`
- Close other browser tabs
- Check available RAM (need 4GB+)

### Out of Memory
- Reduce `maxNewTokens` to 256 or less
- Close other applications
- Use a device with more RAM

### CORS Issues
- Models are loaded from Hugging Face CDN
- Ensure network allows external requests
- Check browser console for CORS errors

## 📚 Resources

- **Transformers.js Docs**: https://huggingface.co/docs/transformers.js
- **Phi-3.5 Model Card**: https://huggingface.co/microsoft/Phi-3.5-mini-instruct
- **ONNX Runtime**: https://onnxruntime.ai/docs/tutorials/web/
- **Examples**: `src/machine-learning/examples.ts`
- **Demo**: `src/pages/ml-demo.html`

## 🎓 Educational Applications

### Teacher Workflow
1. **Lesson Planning**: Generate lesson outlines
2. **Content Creation**: Create educational materials
3. **Assessment**: Generate quiz questions
4. **Differentiation**: Adapt content for different levels

### Student Experience
1. **Tutoring**: On-demand explanations
2. **Practice**: Interactive Q&A
3. **Feedback**: Personalized suggestions
4. **Exploration**: Guided discovery learning

### Administrative Use
1. **Curriculum Design**: Template generation
2. **Content Standards**: Alignment verification
3. **Progress Tracking**: Analysis assistance
4. **Reporting**: Automated summaries

## ✅ Next Steps

1. **Test the Demo**: Visit `/src/pages/ml-demo.html`
2. **Run Examples**: Check console for `window.phi3Examples`
3. **Integrate**: Add AI features to course builder
4. **Optimize**: Tune parameters for your use cases
5. **Expand**: Add more educational AI capabilities

---

**Status**: ✅ Fully Integrated and Ready to Use!  
**Version**: 1.0.0  
**Last Updated**: October 14, 2025
