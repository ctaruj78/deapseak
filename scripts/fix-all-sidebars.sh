#!/bin/bash
# ==============================================================================
# AUTOMATIC SIDEBAR FIX SCRIPT
# Replaces all incomplete/broken sidebars with canonical templates
# ==============================================================================

set -e  # Exit on error

echo "🔧 Starting automatic sidebar repair..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TEMPLATES_DIR="/workspaces/deapseak/templates"
FIXED_COUNT=0
ERROR_COUNT=0
SKIPPED_COUNT=0

# Color codes for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==============================================================================
# Function: Extract sidebar from file
# ==============================================================================
extract_sidebar() {
    local file="$1"
    local start_line=$(grep -n '<nav class="mt-2">' "$file" | head -1 | cut -d: -f1)
    local end_line=$(grep -n '</nav>' "$file" | awk -v start="$start_line" 'NR > start {print; exit}' | cut -d: -f1)
    
    if [[ -n "$start_line" && -n "$end_line" ]]; then
        echo "$start_line:$end_line"
    else
        echo ""
    fi
}

# ==============================================================================
# Function: Replace sidebar in file
# ==============================================================================
replace_sidebar() {
    local target_file="$1"
    local template_file="$2"
    local current_page="$3"
    
    echo -e "${BLUE}Fixing: ${target_file}${NC}"
    
    # Extract line numbers
    local lines=$(extract_sidebar "$target_file")
    if [[ -z "$lines" ]]; then
        echo -e "${YELLOW}  ⚠️  No sidebar found - SKIPPED${NC}"
        ((SKIPPED_COUNT++))
        return 1
    fi
    
    local start_line=$(echo "$lines" | cut -d: -f1)
    local end_line=$(echo "$lines" | cut -d: -f2)
    
    # Create backup
    cp "$target_file" "${target_file}.backup"
    
    # Extract head and tail
    head -n $((start_line - 1)) "$target_file" > "${target_file}.tmp"
    
    # Add canonical sidebar
    cat "$template_file" >> "${target_file}.tmp"
    
    # Add tail
    tail -n +$((end_line + 1)) "$target_file" >> "${target_file}.tmp"
    
    # Replace original
    mv "${target_file}.tmp" "$target_file"
    
    # Mark current page as active if specified
    if [[ -n "$current_page" ]]; then
        sed -i "s|href=\"${current_page}\" class=\"nav-link\"|href=\"${current_page}\" class=\"nav-link active\"|g" "$target_file"
    fi
    
    echo -e "${GREEN}  ✓ Fixed (lines ${start_line}-${end_line})${NC}"
    ((FIXED_COUNT++))
}

# ==============================================================================
# ADMIN FILES
# ==============================================================================
echo ""
echo "📁 ADMIN FILES (21 files)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ADMIN_FILES=(
    "/workspaces/deapseak/pages/admin/settings.html:settings.html"
    "/workspaces/deapseak/pages/admin/profile.html:profile.html"
    "/workspaces/deapseak/pages/admin/notifications.html:notifications.html"
    "/workspaces/deapseak/pages/admin/inspection-template.html:inspection-template.html"
    "/workspaces/deapseak/pages/admin/email-template.html:email-template.html"
    "/workspaces/deapseak/pages/admin/qr-generator.html:qr-generator.html"
    "/workspaces/deapseak/pages/admin/qr-batch.html:qr-batch.html"
    "/workspaces/deapseak/pages/admin/orcamentos-list.html:orcamentos-list.html"
    "/workspaces/deapseak/pages/admin/analytics-dashboard.html:analytics-dashboard.html"
    "/workspaces/deapseak/pages/admin/analytics.html:analytics.html"
    "/workspaces/deapseak/pages/admin/reports.html:reports.html"
    "/workspaces/deapseak/pages/admin/maps.html:maps.html"
    "/workspaces/deapseak/pages/admin/requests.html:requests.html"
    "/workspaces/deapseak/pages/admin/qr-management.html:qr-management.html"
    "/workspaces/deapseak/pages/admin/qr-analytics.html:qr-analytics.html"
    "/workspaces/deapseak/pages/admin/qr-history.html:qr-history.html"
    "/workspaces/deapseak/pages/admin/lifts.html:lifts.html"
    "/workspaces/deapseak/pages/admin/users.html:users.html"
    "/workspaces/deapseak/pages/admin/invoice-template.html:invoice-template.html"
    "/workspaces/deapseak/pages/admin/unified-analytics.html:unified-analytics.html"
    "/workspaces/deapseak/pages/admin/predictive-maintenance.html:predictive-maintenance.html"
)

for entry in "${ADMIN_FILES[@]}"; do
    file=$(echo "$entry" | cut -d: -f1)
    page=$(echo "$entry" | cut -d: -f2)
    
    if [[ -f "$file" ]]; then
        replace_sidebar "$file" "${TEMPLATES_DIR}/sidebar-admin-canonical.html" "$page" || ((ERROR_COUNT++))
    else
        echo -e "${RED}  ✗ File not found: $file${NC}"
        ((ERROR_COUNT++))
    fi
done

# ==============================================================================
# TECH FILES
# ==============================================================================
echo ""
echo "🔧 TECH FILES (15 files)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TECH_FILES=(
    "/workspaces/deapseak/pages/tech/dashboard.html:dashboard.html"
    "/workspaces/deapseak/pages/tech/support.html:support.html"
    "/workspaces/deapseak/pages/tech/checklists.html:checklists.html"
    "/workspaces/deapseak/pages/tech/manuals.html:manuals.html"
    "/workspaces/deapseak/pages/tech/reports.html:reports.html"
    "/workspaces/deapseak/pages/tech/videos.html:videos.html"
    "/workspaces/deapseak/pages/tech/qr-scanner.html:qr-scanner.html"
    "/workspaces/deapseak/pages/tech/ar-helper.html:ar-helper.html"
    "/workspaces/deapseak/pages/tech/knowledge-base.html:knowledge-base.html"
)

for entry in "${TECH_FILES[@]}"; do
    file=$(echo "$entry" | cut -d: -f1)
    page=$(echo "$entry" | cut -d: -f2)
    
    if [[ -f "$file" ]]; then
        replace_sidebar "$file" "${TEMPLATES_DIR}/sidebar-tech-canonical.html" "$page" || ((ERROR_COUNT++))
    else
        echo -e "${RED}  ✗ File not found: $file${NC}"
        ((ERROR_COUNT++))
    fi
done

# ==============================================================================
# DISPATCHER FILES
# ==============================================================================
echo ""
echo "📊 DISPATCHER FILES (9 files)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DISPATCHER_FILES=(
    "/workspaces/deapseak/pages/dispatcher/monitoring.html:monitoring.html"
    "/workspaces/deapseak/pages/dispatcher/dashboard.html:dashboard.html"
    "/workspaces/deapseak/pages/dispatcher/assignments.html:assignments.html"
    "/workspaces/deapseak/pages/dispatcher/clients.html:clients.html"
    "/workspaces/deapseak/pages/dispatcher/qr-management.html:qr-management.html"
    "/workspaces/deapseak/pages/dispatcher/technicians.html:technicians.html"
)

for entry in "${DISPATCHER_FILES[@]}"; do
    file=$(echo "$entry" | cut -d: -f1)
    page=$(echo "$entry" | cut -d: -f2)
    
    if [[ -f "$file" ]]; then
        replace_sidebar "$file" "${TEMPLATES_DIR}/sidebar-dispatcher-canonical.html" "$page" || ((ERROR_COUNT++))
    else
        echo -e "${RED}  ✗ File not found: $file${NC}"
        ((ERROR_COUNT++))
    fi
done

# ==============================================================================
# CLIENT FILES
# ==============================================================================
echo ""
echo "👤 CLIENT FILES (11 files)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CLIENT_FILES=(
    "/workspaces/deapseak/pages/client/documentation.html:documentation.html"
    "/workspaces/deapseak/pages/client/ai-predictions.html:ai-predictions.html"
    "/workspaces/deapseak/pages/client/profile.html:profile.html"
    "/workspaces/deapseak/pages/client/support.html:support.html"
)

for entry in "${CLIENT_FILES[@]}"; do
    file=$(echo "$entry" | cut -d: -f1)
    page=$(echo "$entry" | cut -d: -f2)
    
    if [[ -f "$file" ]]; then
        replace_sidebar "$file" "${TEMPLATES_DIR}/sidebar-client-canonical.html" "$page" || ((ERROR_COUNT++))
    else
        echo -e "${RED}  ✗ File not found: $file${NC}"
        ((ERROR_COUNT++))
    fi
done

# ==============================================================================
# SUMMARY
# ==============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ Fixed: ${FIXED_COUNT} files${NC}"
echo -e "${YELLOW}⚠ Skipped: ${SKIPPED_COUNT} files${NC}"
echo -e "${RED}✗ Errors: ${ERROR_COUNT} files${NC}"
echo ""

if [[ $ERROR_COUNT -eq 0 ]]; then
    echo -e "${GREEN}✓✓✓ ALL SIDEBARS FIXED SUCCESSFULLY! ✓✓✓${NC}"
    echo ""
    echo "📝 Next steps:"
    echo "  1. Test navigation between pages"
    echo "  2. Verify all links work correctly"
    echo "  3. Check active state highlighting"
    echo "  4. Remove .backup files if everything works:"
    echo "     find /workspaces/deapseak/pages -name '*.backup' -delete"
else
    echo -e "${RED}⚠️  Some files had errors. Check logs above.${NC}"
    exit 1
fi
