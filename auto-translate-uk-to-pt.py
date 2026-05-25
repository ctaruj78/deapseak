#!/usr/bin/env python3
"""
Auto-translate Ukrainian text to Portuguese (pt-PT) in client, tech, dispatcher panels.
Uses Gemini AI API.
"""

import os
import re
import json
import time
import glob
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.0-flash")

UK_PATTERN = re.compile(r'[\u0400-\u04FF]+')

TARGET_DIRS = [
    "pages/client",
    "pages/tech",
    "pages/dispatcher",
]

def has_ukrainian(text):
    return bool(UK_PATTERN.search(text))

def extract_ukrainian_segments(text):
    """Extract all segments that contain Ukrainian characters (word boundaries)."""
    # Find all ukrainian-containing words with surrounding context (up to full token)
    segments = set()
    # Extract full "words" or tokens containing Ukrainian
    for match in re.finditer(r'[^\s<>"\'=\{\}]+', text):
        token = match.group()
        if has_ukrainian(token):
            segments.add(token)
    return segments

def collect_files(dirs, extensions=('.html', '.js')):
    files = []
    for d in dirs:
        for ext in extensions:
            files.extend(glob.glob(f"{d}/**/*{ext}", recursive=True))
            files.extend(glob.glob(f"{d}/*{ext}"))
    return list(set(files))

def translate_batch(texts):
    """Translate a list of Ukrainian texts to Portuguese using Gemini."""
    if not texts:
        return {}
    
    items = "\n".join([f"{i+1}. {t}" for i, t in enumerate(texts)])
    prompt = f"""Translate the following Ukrainian words/phrases to European Portuguese (pt-PT).
These are from a web application about elevator maintenance management.
Return ONLY a JSON object mapping each original text to its Portuguese translation.
Keep technical terms, HTML attributes, variable names unchanged.
Do not translate: class names, IDs, variable names, function names, URLs, numbers.
Only translate human-readable Ukrainian text.

Texts to translate:
{items}

Return format: {{"original": "translation", ...}}"""

    try:
        response = model.generate_content(prompt)
        resp_text = response.text.strip()
        # Extract JSON from response
        json_match = re.search(r'\{.*\}', resp_text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except Exception as e:
        print(f"  ⚠️ Gemini error: {e}")
    return {}

def process_file(filepath, translations_cache):
    """Process a single file - find Ukrainian text and replace with Portuguese."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"  ❌ Cannot read {filepath}: {e}")
        return False, 0

    if not has_ukrainian(content):
        return False, 0

    # Collect all Ukrainian-containing segments
    segments = extract_ukrainian_segments(content)
    
    # Filter out ones we haven't translated yet
    to_translate = [s for s in segments if s not in translations_cache]
    
    if to_translate:
        print(f"  🔄 Translating {len(to_translate)} new segments...")
        # Batch in groups of 30
        batch_size = 30
        for i in range(0, len(to_translate), batch_size):
            batch = to_translate[i:i+batch_size]
            new_translations = translate_batch(batch)
            translations_cache.update(new_translations)
            if len(to_translate) > batch_size:
                time.sleep(1)  # Rate limit

    # Apply translations to content
    new_content = content
    changes = 0
    
    # Sort by length (longest first) to avoid partial replacements
    for original in sorted(segments, key=len, reverse=True):
        if original in translations_cache:
            translation = translations_cache[original]
            if translation and translation != original and not has_ukrainian(translation):
                if original in new_content:
                    new_content = new_content.replace(original, translation)
                    changes += 1

    if changes > 0 and new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True, changes
    
    return False, 0

def main():
    print("🇵🇹 Auto-translate Ukrainian → Portuguese (pt-PT)")
    print("=" * 60)
    
    files = collect_files(TARGET_DIRS)
    print(f"📁 Found {len(files)} files to process")
    
    # Load existing cache if any
    cache_file = ".translation-cache.json"
    translations_cache = {}
    if os.path.exists(cache_file):
        with open(cache_file, 'r', encoding='utf-8') as f:
            translations_cache = json.load(f)
        print(f"💾 Loaded {len(translations_cache)} cached translations")
    
    total_changed = 0
    total_changes = 0
    
    for filepath in sorted(files):
        rel_path = filepath.replace('/home/andriy/deapseak/', '')
        
        # Quick check
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            if not has_ukrainian(content):
                continue
        except:
            continue
        
        print(f"\n📄 {rel_path}")
        changed, changes = process_file(filepath, translations_cache)
        
        if changed:
            print(f"  ✅ Applied {changes} replacements")
            total_changed += 1
            total_changes += changes
        else:
            print(f"  ℹ️  No changes applied")
        
        # Save cache periodically
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(translations_cache, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'=' * 60}")
    print(f"✅ Done! Modified {total_changed} files, {total_changes} replacements")
    print(f"💾 Cache saved: {len(translations_cache)} translations")

if __name__ == "__main__":
    main()
