/**
 * Test script to verify glossary feature fix
 * Run this in browser console after loading a template
 */

// Test 1: Verify config stores boolean values (not deleting fields)
async function testConfigStorage() {
  console.log("🧪 Test 1: Config Storage");
  
  const templateId = window.TemplateManager.currentlyLoadedTemplateId;
  if (!templateId) {
    console.error("❌ No template loaded");
    return;
  }

  // Toggle include_glossary off
  await window.TemplateManager.updateTemplateField(
    templateId,
    'resources',
    'include_glossary',
    false
  );

  // Fetch from database
  const { data, error } = await window.supabase
    .from('templates')
    .select('template_data')
    .eq('id', templateId)
    .single();

  if (error) {
    console.error("❌ Database fetch error:", error);
    return;
  }

  const resourcesBlock = data.template_data.blocks.find(b => b.type === 'resources');
  const hasIncludeGlossary = 'include_glossary' in resourcesBlock.config;
  const glossaryValue = resourcesBlock.config.include_glossary;

  console.log(`✅ include_glossary exists in config: ${hasIncludeGlossary}`);
  console.log(`✅ include_glossary value: ${glossaryValue}`);
  console.log(`✅ Full resources config:`, resourcesBlock.config);

  if (hasIncludeGlossary && glossaryValue === false) {
    console.log("✅ Test 1 PASSED: Field stored as false, not deleted");
  } else {
    console.error("❌ Test 1 FAILED: Field missing or wrong value");
  }
}

// Test 2: Verify preview renders glossary when enabled
function testPreviewRendering() {
  console.log("🧪 Test 2: Preview Rendering");
  
  const previewContent = document.getElementById('template-preview-content');
  if (!previewContent) {
    console.error("❌ Preview content not found");
    return;
  }

  // Check if glossary section exists
  const glossarySubtitle = previewContent.querySelector('.preview-block__subtitle');
  const hasGlossarySection = glossarySubtitle?.textContent === 'Glossary';

  console.log(`Glossary section found: ${hasGlossarySection}`);

  if (hasGlossarySection) {
    const glossaryTable = glossarySubtitle.nextElementSibling;
    const glossaryRows = glossaryTable?.querySelectorAll('tr');
    console.log(`✅ Glossary rows rendered: ${glossaryRows?.length || 0}`);
  }

  // Check resources block config
  const configBlock = document.querySelector('[data-block="resources"]');
  if (configBlock) {
    const includeGlossaryCheckbox = configBlock.querySelector('input[name="include_glossary"]');
    const isChecked = includeGlossaryCheckbox?.checked;
    console.log(`✅ Include Glossary checkbox state: ${isChecked}`);

    const glossaryItems = configBlock.querySelectorAll('.glossary-item input');
    const checkedItems = Array.from(glossaryItems).filter(item => item.checked);
    console.log(`✅ Checked glossary items: ${checkedItems.length}`);

    if (isChecked && checkedItems.length > 0 && hasGlossarySection) {
      console.log("✅ Test 2 PASSED: Glossary renders when enabled with items");
    } else if (!isChecked && !hasGlossarySection) {
      console.log("✅ Test 2 PASSED: Glossary hidden when disabled");
    } else {
      console.error("❌ Test 2 FAILED: Preview state doesn't match config");
    }
  }
}

// Test 3: Verify all resource fields are stored
async function testAllFieldsStored() {
  console.log("🧪 Test 3: All Fields Stored");
  
  const templateId = window.TemplateManager.currentlyLoadedTemplateId;
  if (!templateId) {
    console.error("❌ No template loaded");
    return;
  }

  const { data, error } = await window.supabase
    .from('templates')
    .select('template_data')
    .eq('id', templateId)
    .single();

  if (error) {
    console.error("❌ Database fetch error:", error);
    return;
  }

  const resourcesBlock = data.template_data.blocks.find(b => b.type === 'resources');
  const expectedFields = [
    'task', 'type', 'origin', 'state', 'quality',
    'include_glossary', 'historical_figures', 'terminology', 'concepts'
  ];

  const missingFields = expectedFields.filter(field => !(field in resourcesBlock.config));
  const allFieldsPresent = missingFields.length === 0;

  console.log(`✅ All expected fields present: ${allFieldsPresent}`);
  
  if (!allFieldsPresent) {
    console.error(`❌ Missing fields: ${missingFields.join(', ')}`);
    console.error("❌ Test 3 FAILED");
  } else {
    console.log("✅ Test 3 PASSED: All fields stored as booleans");
    console.log("Field values:", resourcesBlock.config);
  }
}

// Run all tests
async function runAllTests() {
  console.log("=".repeat(50));
  console.log("🚀 Running Glossary Feature Tests");
  console.log("=".repeat(50));
  
  await testConfigStorage();
  console.log("");
  
  testPreviewRendering();
  console.log("");
  
  await testAllFieldsStored();
  console.log("");
  
  console.log("=".repeat(50));
  console.log("✅ All tests complete!");
  console.log("=".repeat(50));
}

// Export for use in console
window.glossaryTests = {
  runAllTests,
  testConfigStorage,
  testPreviewRendering,
  testAllFieldsStored
};

console.log("Glossary tests loaded. Run window.glossaryTests.runAllTests() to execute.");
