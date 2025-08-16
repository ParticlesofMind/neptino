#!/usr/bin/env python3
import os
import re
import glob
from bs4 import BeautifulSoup, NavigableString

def clean_html_structure(file_path):
    """Clean HTML file by removing unnecessary wrapper elements and fixing structure"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Parse with BeautifulSoup
        soup = BeautifulSoup(content, 'html.parser')
        
        # Remove empty divs and spans
        for tag in soup.find_all(['div', 'span']):
            if not tag.get_text(strip=True) and not tag.find_all():
                tag.decompose()
        
        # Remove divs that only contain one child element
        for div in soup.find_all('div'):
            children = [child for child in div.children if not isinstance(child, NavigableString) or child.strip()]
            if len(children) == 1 and children[0].name:
                # Replace div with its child
                child = children[0]
                div.replace_with(child)
        
        # Clean up the HTML
        cleaned_html = str(soup)
        
        # Fix formatting
        cleaned_html = re.sub(r'\n\s*\n\s*\n', '\n\n', cleaned_html)
        cleaned_html = re.sub(r'>\s*\n\s*<', '>\n<', cleaned_html)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(cleaned_html)
            
        print(f"Structure cleaned: {file_path}")
        
    except Exception as e:
        print(f"Error processing {file_path}: {e}")

def main():
    # Find all HTML files that need structure cleaning
    html_files = glob.glob('/Users/benjaminjacklaubacher/Neptino/src/pages/**/*.html', recursive=True)
    
    for file_path in html_files:
        clean_html_structure(file_path)

if __name__ == "__main__":
    main()
