#!/bin/bash

# Function to extract sidebar menu from HTML files
extract_sidebar() {
    local file=$1
    local role=$2
    
    # Check if file has nav-sidebar
    if grep -q "nav-sidebar" "$file"; then
        # Extract lines between nav-sidebar and the closing nav or aside tag
        sed -n '/<ul class="nav nav-pills nav-sidebar/,/<\/ul>/p' "$file" | head -150
    fi
}

# Analyze each role
for role in admin tech dispatcher client; do
    echo "=== ROLE: $role ==="
    echo ""
    
    for file in pages/$role/*.html; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            if grep -q "nav-sidebar" "$file"; then
                echo "FILE: $filename"
            fi
        fi
    done
    echo ""
done
