# 🚀 Neptino ML - Quick Reference

## 📁 What's New
```
src/machine-learning/       ← NEW: Your AI intelligence folder
├── index.ts                 - Main exports
├── types.ts                 - TypeScript types
├── Phi3Model.ts            - Phi-3.5 Mini (3.8B params)
├── ModelManager.ts         - Model orchestrator
├── examples.ts             - Usage examples
├── quickStart.ts           - Test script
└── README.md               - Full API docs

src/pages/ml-demo.html      ← NEW: Interactive demo page
ML_INTEGRATION_GUIDE.md     ← NEW: Integration guide
ML_SETUP_COMPLETE.md        ← NEW: Setup summary
```

## ⚡ Quick Start (3 steps)

### 1. Start Dev Server
```bash
npm run dev
```

### 2. Visit Demo
```
http://localhost:3000/src/pages/ml-demo.html
```

### 3. Load & Test
- Click "Load Model" (downloads ~2.4GB first time)
- Try "Generate Text" or "Chat Demo"
- Experiment with parameters!

## 💻 Code Examples

### Basic Generation
```typescript
import { phi3Model } from '@/machine-learning';

await phi3Model.load();
const result = await phi3Model.generate('Explain gravity:', {
  maxNewTokens: 200,
  temperature: 0.7
});
console.log(result.text);
```

### Chat Interface
```typescript
const response = await phi3Model.chat([
  { role: 'system', content: 'You are a tutor.' },
  { role: 'user', content: 'Explain fractions' }
]);
console.log(response.text);
```

### Check Status
```typescript
const status = phi3Model.getStatus();
console.log('Ready:', phi3Model.isReady());
console.log('Loading:', status.isLoading);
console.log('Error:', status.error);
```

## 🎯 Use Cases for Neptino

| Feature | Example |
|---------|---------|
| **Lesson Generation** | Auto-create lesson plans |
| **Quiz Creation** | Generate test questions |
| **Student Tutoring** | On-demand explanations |
| **Content Summarization** | Condense materials |
| **Code Examples** | Generate programming demos |
| **Content Adaptation** | Adjust for grade levels |

## ⚙️ Configuration

```typescript
// In Phi3Model.ts - adjust defaults
{
  maxNewTokens: 512,      // How much to generate
  temperature: 0.7,       // Creativity (0-1)
  topP: 0.9,             // Nucleus sampling
  topK: 50,              // Top-k sampling
  repetitionPenalty: 1.1 // Reduce repetition
}
```

### Performance Tuning

**For Speed:**
- `maxNewTokens: 100-200`
- `temperature: 0` (deterministic)
- `topK: 40`

**For Quality:**
- `maxNewTokens: 500-1000`
- `temperature: 0.8-0.9`
- `repetitionPenalty: 1.2`

## 📊 Performance

| Metric | Value |
|--------|-------|
| **First Load** | 2-5 min (downloads model) |
| **Model Size** | ~2.4 GB (cached) |
| **Subsequent Loads** | <5 seconds |
| **Inference Speed** | 10-20 tokens/sec |
| **Memory Required** | 3-4 GB RAM |

## 🔧 Browser Console Commands

```javascript
// Test the quick start
quickStart()

// Run example
phi3Examples.simple()
phi3Examples.chat()
phi3Examples.runAll()

// Direct usage
const result = await phi3Model.generate('Hello!')
console.log(result.text)
```

## 📚 Documentation

- **Full API**: `src/machine-learning/README.md`
- **Integration**: `ML_INTEGRATION_GUIDE.md`
- **Examples**: `src/machine-learning/examples.ts`
- **Demo**: Visit `/src/pages/ml-demo.html`

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Model won't load | Check internet, clear browser cache |
| Slow inference | Reduce maxNewTokens, close tabs |
| Out of memory | Close apps, need 4GB+ RAM |
| CORS errors | Check network, allow Hugging Face CDN |

## 🎓 Educational Applications

### For Teachers
- Generate lesson content
- Create assessments
- Draft learning objectives
- Get teaching suggestions

### For Students  
- Get instant tutoring
- Receive explanations
- Practice with AI feedback
- Explore topics interactively

### For Admins
- Generate templates
- Draft curriculum
- Create reports
- Align standards

## 🌟 Next Steps

1. ✅ Test the demo page
2. ✅ Run examples in console
3. ✅ Read integration guide
4. ✅ Start integrating into Neptino!

## 📦 Dependencies Added

```json
{
  "@huggingface/transformers": "^3.7.5"
}
```

## 🔗 Resources

- [Transformers.js Docs](https://huggingface.co/docs/transformers.js)
- [Phi-3.5 Model Card](https://huggingface.co/microsoft/Phi-3.5-mini-instruct)
- [ONNX Runtime](https://onnxruntime.ai/docs/)

---

**Status**: ✅ Ready to Use!  
**Created**: October 14, 2025  
**Model**: Phi-3.5-mini-instruct (3.8B)
