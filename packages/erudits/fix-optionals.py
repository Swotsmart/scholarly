#!/usr/bin/env python3
"""
Add `| undefined` to optional properties in TypeScript interfaces and
inline type annotations. This satisfies exactOptionalPropertyTypes.

ONLY targets properties inside:
- interface/type blocks
- inline parameter types like `param: { name?: string; }`
- NOT function parameters, NOT return statements, NOT assignments
"""
import re
import glob

def is_inside_type_context(lines, line_idx):
    """Check if a line is inside an interface, type, or inline type block."""
    # Look backward for context
    brace_depth = 0
    for i in range(line_idx, -1, -1):
        line = lines[i]
        brace_depth += line.count('}') - line.count('{')
        
        stripped = line.strip()
        
        # Found interface or type declaration
        if re.match(r'^\s*(export\s+)?(interface|type)\s+\w+', line):
            return True
        
        # Found an inline type annotation: `param: {` or `): {` at some point
        if re.search(r':\s*\{', line) and brace_depth < 0:
            return True
        
        # Found function signature with inline params type
        if re.match(r'^\s*\w+\s*[:(]', line) and '{' in line and brace_depth < 0:
            return True
        
        # If we've exited all braces, stop
        if brace_depth > 0:
            return False
    
    return False


def fix_file(filepath):
    with open(filepath) as f:
        content = f.read()
    
    lines = content.split('\n')
    changes = 0
    
    for i, line in enumerate(lines):
        # Match: `  propName?: SomeType;`
        m = re.match(r'^(\s+)(\w+)\?:\s*(.+);$', line)
        if not m:
            continue
        
        indent = m.group(1)
        name = m.group(2)
        typ = m.group(3).strip()
        
        # Skip if already has | undefined
        if '| undefined' in typ:
            continue
        
        # Skip if it looks like a function/method signature
        if '=>' in typ or '(' in typ:
            continue
        
        # Skip if it's a function parameter default
        if '=' in typ and not typ.startswith('{'):
            continue
        
        # Must be inside a type context (interface, type, or inline type)
        if not is_inside_type_context(lines, i):
            continue
        
        lines[i] = f"{indent}{name}?: {typ} | undefined;"
        changes += 1
    
    if changes > 0:
        with open(filepath, 'w') as f:
            f.write('\n'.join(lines))
        print(f"  {filepath}: {changes} optional props fixed")
    
    return changes


total = 0
files = sorted(glob.glob('src/**/*.ts', recursive=True))
for f in files:
    total += fix_file(f)

print(f"\nTotal: {total} optional properties fixed across {len(files)} files")
