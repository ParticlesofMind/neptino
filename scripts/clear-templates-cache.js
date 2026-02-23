#!/usr/bin/env node

/**
 * Clear all coursebuilder template cache from localStorage
 * Run this script in the browser console or use it as a reference
 */

console.log('🧹 Clearing coursebuilder template cache...\n')

// Get all localStorage keys
const keys = Object.keys(localStorage)

// Filter for coursebuilder template keys
const templateKeys = keys.filter(key => key.startsWith('coursebuilder:templates:'))

if (templateKeys.length === 0) {
  console.log('✅ No cached template data found')
} else {
  console.log(`Found ${templateKeys.length} cached template key(s):\n`)
  
  templateKeys.forEach(key => {
    console.log(`  - ${key}`)
    localStorage.removeItem(key)
  })
  
  console.log('\n✅ Cleared all template cache!')
  console.log('💡 Refresh the page to reload templates with current configuration')
}
