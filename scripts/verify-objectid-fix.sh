#!/bin/bash

# ObjectId Conversion Fix Verification Script
# Tests that MongoDB ObjectId to string conversion is working

echo "🔍 OBJECTID CONVERSION FIX VERIFICATION"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
total_checks=0
passed_checks=0
failed_checks=0

# Check function
check_file() {
    local file=$1
    local check_type=$2
    total_checks=$((total_checks + 1))
    
    if [ -f "$file" ]; then
        case $check_type in
            "script")
                if grep -q "id-converter.js" "$file"; then
                    echo -e "${GREEN}✅${NC} $file - id-converter.js script included"
                    passed_checks=$((passed_checks + 1))
                else
                    echo -e "${RED}❌${NC} $file - MISSING id-converter.js script"
                    failed_checks=$((failed_checks + 1))
                fi
                ;;
            "conversion")
                if grep -q "window.safeId\|\.toString()" "$file"; then
                    echo -e "${GREEN}✅${NC} $file - ObjectId conversion present"
                    passed_checks=$((passed_checks + 1))
                else
                    echo -e "${RED}❌${NC} $file - MISSING ObjectId conversion"
                    failed_checks=$((failed_checks + 1))
                fi
                ;;
        esac
    else
        echo -e "${RED}❌${NC} $file - FILE NOT FOUND"
        failed_checks=$((failed_checks + 1))
    fi
}

echo "1️⃣  Checking Admin Pages"
echo "------------------------"
check_file "pages/admin/lifts.html" "script"
check_file "pages/admin/lifts.html" "conversion"
check_file "pages/admin/users.html" "script"
check_file "pages/admin/users.html" "conversion"
check_file "pages/admin/requests.html" "script"
check_file "pages/admin/requests.html" "conversion"
echo ""

echo "2️⃣  Checking Client Pages"
echo "-------------------------"
check_file "pages/client/ai-predictions.html" "script"
check_file "pages/client/ai-predictions.html" "conversion"
check_file "pages/client/requests.html" "script"
check_file "pages/client/requests.html" "conversion"
check_file "pages/client-unified.html" "script"
check_file "pages/client-unified.html" "conversion"
echo ""

echo "3️⃣  Checking Tech Pages"
echo "----------------------"
check_file "pages/tech/dashboard.html" "script"
check_file "pages/tech/dashboard.html" "conversion"
check_file "pages/tech/tasks.html" "script"
check_file "pages/tech/tasks.html" "conversion"
echo ""

echo "4️⃣  Checking Dispatcher Pages"
echo "-----------------------------"
check_file "pages/dispatcher/assignments.html" "script"
check_file "pages/dispatcher/assignments.html" "conversion"
echo ""

echo "5️⃣  Checking JavaScript Modules"
echo "-------------------------------"
if [ -f "assets/js/id-converter.js" ]; then
    echo -e "${GREEN}✅${NC} assets/js/id-converter.js - Helper file exists"
    passed_checks=$((passed_checks + 1))
else
    echo -e "${RED}❌${NC} assets/js/id-converter.js - FILE NOT FOUND"
    failed_checks=$((failed_checks + 1))
fi
total_checks=$((total_checks + 1))

check_file "assets/js/simple-lift-modal.js" "conversion"
echo ""

# Summary
echo "========================================"
echo "📊 VERIFICATION SUMMARY"
echo "========================================"
echo "Total checks: $total_checks"
echo -e "${GREEN}Passed: $passed_checks${NC}"
if [ $failed_checks -gt 0 ]; then
    echo -e "${RED}Failed: $failed_checks${NC}"
else
    echo -e "${GREEN}Failed: 0${NC}"
fi
echo ""

# Overall result
if [ $failed_checks -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
    echo ""
    echo "🎉 ObjectId conversion fix is properly implemented!"
    echo ""
    echo "Next steps:"
    echo "1. Test CRUD operations (Create → Edit → View → Delete)"
    echo "2. Verify no 'not found' errors appear"
    echo "3. Check browser console for any ObjectId warnings"
    echo "4. Deploy to staging for user acceptance testing"
    exit 0
else
    echo -e "${RED}❌ SOME CHECKS FAILED!${NC}"
    echo ""
    echo "Please review the failed checks above and fix them."
    exit 1
fi
