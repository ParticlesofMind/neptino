#!/usr/bin/env python3
import os
import re
import glob

def clean_html_structure_simple(file_path):
    """Clean HTML file by removing empty divs and unnecessary elements"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Remove empty divs and spans
        content = re.sub(r'<div[^>]*>\s*</div>', '', content)
        content = re.sub(r'<span[^>]*>\s*</span>', '', content)
        
        # Remove divs that only wrap comments
        content = re.sub(r'<div[^>]*>\s*<!--[^>]*-->\s*</div>', '', content)
        
        # Fix broken closing tags and structure issues
        content = re.sub(r'</div>\s*<div[^>]*>\s*<a', '<a', content)
        content = re.sub(r'</a>\s*</nav>', '</a>\n</nav>', content)
        
        # Clean up extra whitespace and empty lines
        content = re.sub(r'\n\s*\n\s*\n+', '\n\n', content)
        content = re.sub(r'  +', '  ', content)
        
        # Fix indentation
        lines = content.split('\n')
        fixed_lines = []
        indent_level = 0
        
        for line in lines:
            stripped = line.strip()
            if not stripped:
                fixed_lines.append('')
                continue
                
            # Decrease indent for closing tags
            if stripped.startswith('</'):
                indent_level = max(0, indent_level - 1)
            
            fixed_lines.append('  ' * indent_level + stripped)
            
            # Increase indent for opening tags (except self-closing)
            if stripped.startswith('<') and not stripped.startswith('</') and not stripped.endswith('/>') and not stripped.startswith('<!'):
                # Check if it's a self-closing tag like <input> or <img>
                tag_name = stripped.split()[0][1:].split('>')[0]
                if tag_name not in ['input', 'img', 'br', 'hr', 'meta', 'link']:
                    indent_level += 1
        
        content = '\n'.join(fixed_lines)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
            
        print(f"Structure cleaned: {file_path}")
        
    except Exception as e:
        print(f"Error processing {file_path}: {e}")

def main():
    # Find all HTML files that need structure cleaning
    html_files = glob.glob('/Users/benjaminjacklaubacher/Neptino/src/pages/**/*.html', recursive=True)
    
    for file_path in html_files:
        clean_html_structure_simple(file_path)

if __name__ == "__main__":
    main()
