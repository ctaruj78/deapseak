#!/bin/bash

# Add sidebar loader after adminlte.min.js in all admin pages

cd /workspaces/deapseak

FILES=(
    "pages/admin/admin-dashboard.html"
    "pages/admin/lifts.html"
    "pages/admin/users.html"
    "pages/admin/requests.html"
    "pages/admin/qr-management.html"
    "pages/admin/qr-analytics.html"
    "pages/admin/qr-history.html"
    "pages/admin/qr-generator.html"
    "pages/admin/qr-batch.html"
    "pages/admin/maps.html"
    "pages/admin/support.html"
    "pages/admin/notifications.html"
    "pages/admin/profile.html"
    "pages/admin/settings.html"
    "pages/admin/analytics.html"
    "pages/admin/analytics-dashboard.html"
    "pages/admin/unified-analytics.html"
    "pages/admin/predictive-maintenance.html"
    "pages/admin/reports.html"
    "pages/admin/report-template.html"
    "pages/admin/invoice-template.html"
    "pages/admin/email-template.html"
    "pages/admin/inspection-template.html"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        if grep -q 'includes/sidebar.html' "$file"; then
            echo "✓ $file - вже має loader"
        elif grep -q 'adminlte.min.js' "$file"; then
            echo "→ $file"
            sed -i '/adminlte\.min\.js/a\
\
    <!-- Load sidebar dynamically -->\
    <script>\
        $(document).ready(function() {\
            $(".main-sidebar").load("includes/sidebar.html");\
        });\
    <\/script>' "$file"
        fi
    fi
done
echo "✓ Завершено"
