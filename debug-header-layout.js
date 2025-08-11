// Debug script to check header layout logic
const { DEFAULT_BLOCKS } = require('./src/scripts/coursebuilder/layout/LayoutTypes.ts');

console.log('=== HEADER BLOCK DEBUG ===');

const headerBlock = DEFAULT_BLOCKS.find(b => b.id === 'header');
console.log('Header block:', JSON.stringify(headerBlock, null, 2));

console.log('\nHeader canvas areas:');
if (headerBlock?.canvasAreas) {
  headerBlock.canvasAreas.forEach((area, index) => {
    console.log(`  ${index + 1}. ${area.id} - ${area.name} (${area.type})`);
  });
} else {
  console.log('  No canvas areas found!');
}

console.log('\n=== TEMPLATE ASSIGNMENT LOGIC ===');
const testAreas = [
  { areaId: 'header-instruction-title' },
  { areaId: 'header-content-area' },
  { areaId: 'program-instruction-area' },
  { areaId: 'footer-content-area' }
];

testAreas.forEach(area => {
  const shouldHaveContent = area.areaId.includes('content-area') || 
                           area.areaId === 'header-content-area';
  console.log(`Area "${area.areaId}": shouldHaveContent = ${shouldHaveContent}`);
});
