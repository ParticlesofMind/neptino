#!/usr/bin/env python3

import os
import re
import glob

def update_navigation_classes(file_path):
    """Update navigation classes in an HTML file to follow the new modular convention"""
    
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Store the original content to check if changes were made
        original_content = content
        
        # 1. Update ul classes: nav nav--* -> ul ul--*
        content = re.sub(r'class="nav nav--(\w+)"', r'class="ul ul--\1"', content)
        
        # 2. Update list items: nav__item -> ul__item
        content = re.sub(r'nav__item', 'ul__item', content)
        
        # 3. Update nav links: nav__link -> link (with appropriate modifiers)
        # For header context
        content = re.sub(r'nav__link link"', 'link link--header"', content)
        # For footer context (with existing modifiers)
        content = re.sub(r'nav__link link link--subtle', 'link link--footer link--subtle', content)
        # General nav__link without modifiers
        content = re.sub(r'nav__link"', 'link"', content)
        
        # 4. Update brand links: nav__brand -> brand
        content = re.sub(r'nav__brand', 'brand', content)
        
        # 5. Update CTA elements: nav__cta -> cta
        content = re.sub(r'nav__cta', 'cta', content)
        
        # 6. Fix any remaining nav nav-- that should be ul ul--
        content = re.sub(r'"nav nav--', '"ul ul--', content)
        
        # Only write back if content changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as file:
                file.write(content)
            print(f"Updated: {file_path}")
            return True
        else:
            print(f"No changes needed: {file_path}")
            return False
            
    except Exception as e:
        print(f"Error updating {file_path}: {e}")
        return False

def main():
    # Find all HTML files in the project
    base_path = "/Users/benjaminjacklaubacher/Neptino"
    
    # Get all HTML files, excluding dist folder
    html_files = []
    for root, dirs, files in os.walk(base_path):
        # Skip dist directory
        if 'dist' in dirs:
            dirs.remove('dist')
        for file in files:
            if file.endswith('.html'):
                html_files.append(os.path.join(root, file))
    
    print(f"Found {len(html_files)} HTML files to check")
    
    updated_files = 0
    for file_path in html_files:
        if update_navigation_classes(file_path):
            updated_files += 1
    
    print(f"\nCompleted! Updated {updated_files} files")

if __name__ == "__main__":
    main()
