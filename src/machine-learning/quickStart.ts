/**
 * ML Quick Start
 * Simple initialization and test script for Neptino's ML capabilities
 * Run this in the browser console to verify the integration
 */

import { phi3Model } from './index';

export async function quickStart() {
  console.log('🚀 Neptino ML Quick Start\n');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Check initial status
    console.log('\n📊 Initial Status:');
    const initialStatus = phi3Model.getStatus();
    console.log('Model loaded:', initialStatus.isLoaded);
    console.log('Model loading:', initialStatus.isLoading);
    
    // Step 2: Load the model
    console.log('\n📥 Loading Phi-3.5 Mini...');
    console.log('⏳ This may take 2-5 minutes on first load (downloading ~2.4GB)');
    console.log('Subsequent loads will be instant from cache.\n');
    
    await phi3Model.load(undefined, (progress) => {
      if (progress.progress !== undefined) {
        const bar = '█'.repeat(Math.floor(progress.progress / 5)) + 
                    '░'.repeat(20 - Math.floor(progress.progress / 5));
        console.log(`[${bar}] ${progress.progress}% - ${progress.status}`);
      } else {
        console.log(`📦 ${progress.status}`);
      }
    });
    
    console.log('\n✅ Model loaded successfully!\n');
    
    // Step 3: Simple generation test
    console.log('🧪 Testing Generation...\n');
    const testPrompt = 'The three laws of motion are:';
    console.log(`Prompt: "${testPrompt}"\n`);
    
    const startTime = performance.now();
    const result = await phi3Model.generate(testPrompt, {
      maxNewTokens: 150,
      temperature: 0.7
    });
    const endTime = performance.now();
    
    console.log('Response:');
    console.log(result.text);
    console.log(`\n⚡ Generated in ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`📝 ${result.text.split(' ').length} words`);
    
    // Step 4: Chat test
    console.log('\n\n💬 Testing Chat Interface...\n');
    const chatResult = await phi3Model.chat([
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'What is 2+2? Answer briefly.' }
    ], {
      maxNewTokens: 50
    });
    
    console.log('Chat Response:');
    console.log(chatResult.text);
    
    // Step 5: Final status
    console.log('\n\n📊 Final Status:');
    const finalStatus = phi3Model.getStatus();
    console.log('Model ID:', finalStatus.modelId);
    console.log('Ready:', phi3Model.isReady());
    const perfMemory = (performance as any).memory;
    console.log('Memory available:', perfMemory?.jsHeapSizeLimit 
      ? `${(perfMemory.jsHeapSizeLimit / 1024 / 1024 / 1024).toFixed(2)} GB`
      : 'N/A');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Quick Start Complete!');
    console.log('\nℹ️  Model is now ready for use in your application.');
    console.log('📖 See ML_INTEGRATION_GUIDE.md for integration examples.');
    console.log('🎨 Try the demo at /src/pages/ml-demo.html');
    
  } catch (error) {
    console.error('\n❌ Quick Start Failed:', error);
    console.log('\nTroubleshooting:');
    console.log('1. Check internet connection (model downloads from Hugging Face)');
    console.log('2. Ensure browser has 4GB+ available memory');
    console.log('3. Try clearing browser cache and reload');
    console.log('4. Check browser console for detailed errors');
  }
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  console.log('💡 Neptino ML Ready!');
  console.log('Run: quickStart() to test the integration');
  (window as any).quickStart = quickStart;
}

export default quickStart;
