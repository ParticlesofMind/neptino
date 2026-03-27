# Make Panel Block Creation E2E Test

**Location:** `e2e/make-blocks-creation.spec.ts`

## Overview

This Playwright E2E test validates that every block type in the Make panel can be created with content and successfully added to the canvas. It tests 22+ block types across four categories: Resources, Activities, Experiences, and Layouts.

## Block Types Tested

### Resources (12)
- Text
- Image
- Video
- Audio  
- Code Snippet
- Chart
- Flashcards
- Embed
- Dataset
- Map
- Document
- Diagram

### Activities (8)
- Assessment (Interactive)
- Form
- Chat
- Writing Pad (Text Editor)
- Code Editor
- Whiteboard
- Voice Recorder
- Sorter

### Experiences (1)
- Simulation (Rich Sim)

### Layout (3)
- Split
- Quad
- Stack

## How It Works

1. **Course Setup**: Creates a test course using the coursebuilder essentials
2. **Make Mode**: Navigates to the create view in Make mode
3. **Block Iteration**: For each block type:
   - Selects block from sidebar
   - Fills required content (title + type-specific data)
   - Clicks "Add to canvas"
   - Verifies successful addition
4. **Reporting**: 
   - Logs detailed success/failure breakdown
   - Saves results to `test-results/make-blocks-results.json`
   - Asserts at least 50% success and at least 1 block added

## Content Strategy

Textual content (descriptions, prompts, code samples, topics) is generated using Ollama with the following approach:

- **Text blocks**: Uses Ollama to generate educational content
- **Code blocks**: Uses Ollama to generate JavaScript examples
- **Prompts**: Uses Ollama to generate engaging student prompts
- **Topics**: Uses Ollama to generate chatbot topics
- **URLs/Data**: Uses static placeholder URLs for media and data sources
- **Fallback**: If Ollama is unavailable, falls back to static placeholder text

### Ollama Configuration

The test automatically detects Ollama via environment variables:
- `OLLAMA_HOST`: Default `http://localhost:11434`
- `OLLAMA_MODEL`: Default `llama3.2` (fast, balanced model)

To use a different model:
```bash
OLLAMA_MODEL=deepseek-r1 npm run test:e2e -- e2e/make-blocks-creation.spec.ts
```

## Running the Test

### Prerequisites
- Local Supabase running: `npx supabase start`
- Valid `.env.test.local` configuration
- **Ollama running**: `ollama serve` (or your platform's equivalent)
  - Ollama will be auto-detected at `http://localhost:11434`
  - If unavailable, test falls back to static placeholder text

## Activate the Test
Remove `.skip` from the test descriptor:
```typescript
test.describe.skip("Make Panel Block Creation", () => {
```
becomes:
```typescript
test.describe("Make Panel Block Creation", () => {
```

### Run the Test
```bash
npm run test:e2e -- e2e/make-blocks-creation.spec.ts
```

Or run with specific options:
```bash
npx playwright test e2e/make-blocks-creation.spec.ts --headed
npx playwright test e2e/make-blocks-creation.spec.ts --debug
```

## Expected Output

### Console Output
```
═══════════════════════════════════════════════════════════
MAKE PANEL BLOCK ADDITION TEST RESULTS
═══════════════════════════════════════════════════════════
✓ Successfully Added: 18/22
  • text
  • image
  • video
  ...

✗ Failed: 4
  • experimental-block: Block button not found
  ...
═══════════════════════════════════════════════════════════
```

### Results File
`test-results/make-blocks-results.json`:
```json
{
  "courseId": "550e8400-e29b-41d4-a716-446655440000",
  "results": {
    "added": ["text", "image", "video", ...],
    "failed": [
      { "type": "experimental", "reason": "Block button not found" }
    ]
  },
  "timestamp": "2026-03-27T10:30:00.000Z"
}
```

## Success Criteria

- ✓ At least 50% of block types successfully added (11+ out of 22)
- ✓ At least 1 block type successfully added
- ✓ Test passes when both criteria are met

## Troubleshooting

### "Block button not found"
- Blocks might be filtered in the sidebar
- Check that Make panel sidebar is visible and populated
- Verify block labeling matches the test expectations

### "Add button is disabled"
- Block content incomplete
- Check that all required fields are filled
- Review the `fillBlockContent()` function for the block type

### Timeout errors
- Supabase not running or too slow
- Network latency issues
- Increase timeout values in the test if needed

## Development Notes

- Test uses case-insensitive label matching: `getByText("text", { exact: false })`
- Handles both rich editors (TipTap) and standard textareas
- Includes type-specific content strategies for different block requirements
- Graceful error handling with detailed logging for debugging

## Integration with CI/CD

To integrate into CI pipeline:

1. Ensure local Supabase is available in CI environment or use Docker
2. Set environment variables from `.env.test.local`
3. Run test in headed mode for debugging: `--headed`
4. Archive results: `test-results/make-blocks-results.json`
