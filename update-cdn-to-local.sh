#!/bin/bash

echo "🔄 Оновлення CDN посилань на локальні..."
echo ""

# Функція для заміни
replace_in_files() {
    local pattern="$1"
    local replacement="$2"
    local description="$3"
    
    echo "📝 $description"
    find pages -name "*.html" -type f -exec grep -l "$pattern" {} \; | while read file; do
        sed -i "s|$pattern|$replacement|g" "$file"
        echo "   ✅ $file"
    done
}

# 1. DataTables
echo "1️⃣ DataTables"
replace_in_files "https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap4.min.css" "/plugins/datatables/css/dataTables.bootstrap4.min.css" "CSS основний"
replace_in_files "https://cdn.datatables.net/responsive/2.5.0/css/responsive.bootstrap4.min.css" "/plugins/datatables/css/responsive.bootstrap4.min.css" "CSS responsive"
replace_in_files "https://cdn.datatables.net/buttons/2.3.6/css/buttons.bootstrap4.min.css" "/plugins/datatables/css/buttons.bootstrap4.min.css" "CSS buttons"
replace_in_files "https://cdn.datatables.net-buttons/2.3.6/css/buttons.bootstrap4.min.css" "/plugins/datatables/css/buttons.bootstrap4.min.css" "CSS buttons (alt)"
replace_in_files "https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js" "/plugins/datatables/js/jquery.dataTables.min.js" "JS основний"
replace_in_files "https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap4.min.js" "/plugins/datatables/js/dataTables.bootstrap4.min.js" "JS bootstrap4"
replace_in_files "https://cdn.datatables.net/responsive/2.5.0/js/dataTables.responsive.min.js" "/plugins/datatables/js/dataTables.responsive.min.js" "JS responsive"
replace_in_files "https://cdn.datatables.net/responsive/2.5.0/js/responsive.bootstrap4.min.js" "/plugins/datatables/js/responsive.bootstrap4.min.js" "JS responsive bootstrap4"
replace_in_files "https://cdn.datatables.net/1.13.4/css/dataTables.bootstrap4.min.css" "/plugins/datatables/css/dataTables.bootstrap4.min.css" "CSS v1.13.4"
replace_in_files "https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js" "/plugins/datatables/js/jquery.dataTables.min.js" "JS v1.13.4"
replace_in_files "https://cdn.datatables.net/1.13.4/js/dataTables.bootstrap4.min.js" "/plugins/datatables/js/dataTables.bootstrap4.min.js" "JS bootstrap4 v1.13.4"
# Локалізація (залишаємо URL в JavaScript коді - він буде завантажувати локальний файл)
find pages -name "*.html" -type f -exec sed -i "s|https://cdn.datatables.net/plug-ins/1.13.6/i18n/uk.json|/plugins/datatables/i18n/uk.json|g" {} \;
echo ""

# 2. SweetAlert2
echo "2️⃣ SweetAlert2"
replace_in_files "https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css" "/plugins/sweetalert2/css/sweetalert2.min.css" "CSS"
replace_in_files "https://cdn.jsdelivr.net/npm/sweetalert2@11" "/plugins/sweetalert2/js/sweetalert2.min.js" "JS"
echo ""

# 3. Select2
echo "3️⃣ Select2"
replace_in_files "https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" "/plugins/select2/css/select2.min.css" "CSS"
replace_in_files "https://cdn.jsdelivr.net/npm/select2-bootstrap-5-theme@1.3.0/dist/select2-bootstrap-5-theme.min.css" "/plugins/select2/css/select2-bootstrap-5-theme.min.css" "CSS theme"
replace_in_files "https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js" "/plugins/select2/js/select2.min.js" "JS"
echo ""

# 4. Moment.js + DateRangePicker
echo "4️⃣ Moment.js + DateRangePicker"
replace_in_files "https://cdn.jsdelivr.net/npm/moment@2.29.4/moment.min.js" "/plugins/moment/js/moment.min.js" "Moment.js"
replace_in_files "https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.css" "/plugins/daterangepicker/css/daterangepicker.css" "DateRangePicker CSS"
replace_in_files "https://cdn.jsdelivr.net/npm/daterangepicker@3.1/daterangepicker.js" "/plugins/daterangepicker/js/daterangepicker.js" "DateRangePicker JS"
echo ""

# 5. QRCode.js (уніфікуємо на qrcode@1.5.1)
echo "5️⃣ QRCode.js"
replace_in_files "https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js" "/plugins/qrcode/js/qrcode.min.js" "QRCode v1.5.1"
replace_in_files "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js" "/plugins/qrcode/js/qrcode.min.js" "QRCodeJS (уніфікація)"
echo ""

# 6. Toastr
echo "6️⃣ Toastr"
replace_in_files "https://cdn.jsdelivr.net/npm/toastr@2.1.4/build/toastr.min.css" "/plugins/toastr/css/toastr.min.css" "CSS"
replace_in_files "https://cdn.jsdelivr.net/npm/toastr@2.1.4/build/toastr.min.js" "/plugins/toastr/js/toastr.min.js" "JS v2.1.4"
replace_in_files "https://cdn.jsdelivr.net/npm/toastr@2.1.4/toastr.min.js" "/plugins/toastr/js/toastr.min.js" "JS (alt path)"
echo ""

# 7. FullCalendar
echo "7️⃣ FullCalendar"
replace_in_files "https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/main.min.css" "/plugins/fullcalendar/css/main.min.css" "CSS"
replace_in_files "https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/main.min.js" "/plugins/fullcalendar/js/main.min.js" "JS"
replace_in_files "https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/locales/uk.min.js" "/plugins/fullcalendar/locales/uk.min.js" "Локалізація"
echo ""

# 8. Bootstrap Notify
echo "8️⃣ Bootstrap Notify"
replace_in_files "https://cdn.jsdelivr.net/npm/bootstrap-notify@3.1.3/bootstrap-notify.min.js" "/plugins/bootstrap-notify/js/bootstrap-notify.min.js" "JS"
echo ""

# 9. Sortable.js
echo "9️⃣ Sortable.js"
replace_in_files "https://cdn.jsdelivr.net/npm/sortablejs@1.14.0/Sortable.min.js" "/plugins/sortable/js/Sortable.min.js" "JS"
echo ""

# 10. jQuery (якщо використовується CDN замість локального)
echo "🔟 jQuery"
replace_in_files "https://code.jquery.com/jquery-3.6.0.min.js" "/plugins/jquery/jquery.min.js" "jQuery 3.6.0"
echo ""

# 11. Bootstrap (якщо використовується CDN замість локального)
echo "1️⃣1️⃣ Bootstrap"
replace_in_files "https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/css/bootstrap.min.css" "/plugins/bootstrap/bootstrap.min.css" "Bootstrap CSS"
replace_in_files "https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/js/bootstrap.bundle.min.js" "/plugins/bootstrap/bootstrap.bundle.min.js" "Bootstrap JS"
echo ""

# 12. AdminLTE (якщо використовується CDN замість локального)
echo "1️⃣2️⃣ AdminLTE"
replace_in_files "https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/css/adminlte.min.css" "/plugins/adminlte/adminlte.min.css" "AdminLTE CSS"
replace_in_files "https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/js/adminlte.min.js" "/plugins/adminlte/adminlte.min.js" "AdminLTE JS v3.2"
replace_in_files "https://cdn.jsdelivr.net/npm/adminlte@3.2/dist/js/adminlte.min.js" "/plugins/adminlte/adminlte.min.js" "AdminLTE JS (alt)"
echo ""

echo "✅ Всі CDN посилання оновлено на локальні!"
echo ""
echo "📊 Статистика:"
echo "   Оброблено файлів: $(find pages -name "*.html" | wc -l)"
echo "   Залишилось CDN посилань: $(grep -r "cdn\." pages/ --include="*.html" | grep -v "fonts.googleapis" | wc -l)"

