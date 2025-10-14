/**
 * Phi-3.5 Mini Usage Examples
 * Demonstrates various ways to use the ML models in Neptino
 */

import { phi3Model, modelManager } from './index';
import type { ChatMessage } from './types';

/**
 * Example 1: Simple text generation
 */
export async function exampleSimpleGeneration() {
  console.log('📝 Example: Simple Text Generation\n');
  
  // Ensure model is loaded
  if (!phi3Model.isReady()) {
    console.log('Loading model...');
    await phi3Model.load(undefined, (progress) => {
      console.log(`${progress.status} ${progress.progress || ''}%`);
    });
  }

  // Generate text
  const result = await phi3Model.generate(
    'Explain the concept of osmosis in biology:',
    {
      maxNewTokens: 200,
      temperature: 0.7
    }
  );

  console.log('Generated:', result.text);
  console.log(`⚡ Inference time: ${result.inferenceTime?.toFixed(2)}ms\n`);
}

/**
 * Example 2: Educational content generation
 */
export async function exampleEducationalContent() {
  console.log('🎓 Example: Educational Content Generation\n');

  const prompt = `Create a brief lesson outline about the water cycle for 5th grade students. Include:
1. Key concepts
2. Learning objectives
3. Activity suggestions`;

  const result = await phi3Model.generate(prompt, {
    maxNewTokens: 300,
    temperature: 0.8
  });

  console.log('Lesson Outline:\n', result.text);
}

/**
 * Example 3: Chat conversation
 */
export async function exampleChatConversation() {
  console.log('💬 Example: Chat Conversation\n');

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are an educational assistant for Neptino, helping teachers create engaging lessons.'
    },
    {
      role: 'user',
      content: 'How can I make a math lesson about fractions more interactive?'
    }
  ];

  const response = await phi3Model.chat(messages);
  console.log('Assistant:', response.text);
}

/**
 * Example 4: Code generation and explanation
 */
export async function exampleCodeGeneration() {
  console.log('💻 Example: Code Generation\n');

  const prompt = `Write a simple JavaScript function that calculates the area of a circle. Include comments explaining the code.`;

  const result = await phi3Model.generate(prompt, {
    maxNewTokens: 250,
    temperature: 0.5 // Lower temperature for more deterministic code
  });

  console.log('Generated Code:\n', result.text);
}

/**
 * Example 5: Multi-turn conversation
 */
export async function exampleMultiTurn() {
  console.log('🔄 Example: Multi-turn Conversation\n');

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are a helpful tutor.'
    },
    {
      role: 'user',
      content: 'What is photosynthesis?'
    }
  ];

  // First response
  const response1 = await phi3Model.chat(messages);
  console.log('User: What is photosynthesis?');
  console.log('Assistant:', response1.text);

  // Add assistant response to history
  messages.push({
    role: 'assistant',
    content: response1.text
  });

  // Follow-up question
  messages.push({
    role: 'user',
    content: 'Can you explain it in simpler terms for a child?'
  });

  const response2 = await phi3Model.chat(messages);
  console.log('\nUser: Can you explain it in simpler terms for a child?');
  console.log('Assistant:', response2.text);
}

/**
 * Example 6: Using Model Manager
 */
export async function exampleModelManager() {
  console.log('🧠 Example: Model Manager\n');

  // Initialize all models
  await modelManager.initialize((progress) => {
    console.log(`[ModelManager] ${progress.status}`);
  });

  // Check status
  const status = modelManager.getStatus();
  console.log('\nModel Status:');
  console.log('- Phi-3:', status.phi3.isLoaded ? '✅ Ready' : '❌ Not loaded');

  // Use the model
  const phi3 = modelManager.getPhi3Model();
  const result = await phi3.generate('Hello, world!', {
    maxNewTokens: 50
  });
  console.log('\nGeneration:', result.text);
}

/**
 * Example 7: Educational quiz generation
 */
export async function exampleQuizGeneration() {
  console.log('❓ Example: Quiz Generation\n');

  const prompt = `Generate 3 multiple-choice questions about the solar system for middle school students. Format:
Q1: [question]
A) [option]
B) [option]
C) [option]
D) [option]
Correct: [letter]`;

  const result = await phi3Model.generate(prompt, {
    maxNewTokens: 400,
    temperature: 0.9
  });

  console.log('Generated Quiz:\n', result.text);
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🚀 Running Phi-3.5 Mini Examples\n');
  console.log('=' .repeat(60) + '\n');

  try {
    await exampleSimpleGeneration();
    await exampleEducationalContent();
    await exampleChatConversation();
    await exampleCodeGeneration();
    await exampleMultiTurn();
    await exampleQuizGeneration();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// Make examples available globally for testing
if (typeof window !== 'undefined') {
  (window as any).phi3Examples = {
    simple: exampleSimpleGeneration,
    educational: exampleEducationalContent,
    chat: exampleChatConversation,
    code: exampleCodeGeneration,
    multiTurn: exampleMultiTurn,
    manager: exampleModelManager,
    quiz: exampleQuizGeneration,
    runAll: runAllExamples
  };
  
  console.log('💡 Phi-3.5 examples loaded! Try:');
  console.log('  window.phi3Examples.simple()');
  console.log('  window.phi3Examples.chat()');
  console.log('  window.phi3Examples.runAll()');
}
