#!/bin/bash

echo "📦 Завантаження критичних бібліотек..."

# 1. DataTables
echo "1️⃣ DataTables..."
mkdir -p datatables/css datatables/js datatables/i18n
wget -q -P datatables/css https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap4.min.css
wget -q -P datatables/css https://cdn.datatables.net/responsive/2.5.0/css/responsive.bootstrap4.min.css
wget -q -P datatables/css https://cdn.datatables.net/buttons/2.3.6/css/buttons.bootstrap4.min.css
wget -q -P datatables/js https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js
wget -q -P datatables/js https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap4.min.js
wget -q -P datatables/js https://cdn.datatables.net/responsive/2.5.0/js/dataTables.responsive.min.js
wget -q -P datatables/js https://cdn.datatables.net/responsive/2.5.0/js/responsive.bootstrap4.min.js
wget -q -P datatables/i18n https://cdn.datatables.net/plug-ins/1.13.6/i18n/uk.json
echo "   ✅ DataTables завантажено (8 файлів)"

# 2. SweetAlert2
echo "2️⃣ SweetAlert2..."
mkdir -p sweetalert2/css sweetalert2/js
wget -q -P sweetalert2/css https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css
wget -q -P sweetalert2/js https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.js
echo "   ✅ SweetAlert2 завантажено (2 файли)"

# 3. Select2
echo "3️⃣ Select2..."
mkdir -p select2/css select2/js
wget -q -P select2/css https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css
wget -q -P select2/css https://cdn.jsdelivr.net/npm/select2-bootstrap-5-theme@1.3.0/dist/select2-bootstrap-5-theme.min.css
wget -q -P select2/js https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js
echo "   ✅ Select2 завантажено (3 файли)"

# 4. Moment.js + DateRangePicker
echo "4️⃣ Moment.js + DateRangePicker..."
mkdir -p moment/js daterangepicker/css daterangepicker/js
wget -q -P moment/js https://cdn.jsdelivr.net/npm/moment@2.29.4/moment.min.js
wget -q -P daterangepicker/css https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.css
wget -q -P daterangepicker/js https://cdn.jsdelivr.net/npm/daterangepicker@3.1/daterangepicker.js
echo "   ✅ Moment + DateRangePicker завантажено (3 файли)"

# 5. QRCode.js
echo "5️⃣ QRCode.js..."
mkdir -p qrcode/js
wget -q -P qrcode/js https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js
echo "   ✅ QRCode завантажено (1 файл)"

echo ""
echo "📦 Завантаження додаткових бібліотек..."

# 6. Toastr
echo "6️⃣ Toastr..."
mkdir -p toastr/css toastr/js
wget -q -P toastr/css https://cdn.jsdelivr.net/npm/toastr@2.1.4/build/toastr.min.css
wget -q -P toastr/js https://cdn.jsdelivr.net/npm/toastr@2.1.4/build/toastr.min.js
echo "   ✅ Toastr завантажено (2 файли)"

# 7. FullCalendar
echo "7️⃣ FullCalendar..."
mkdir -p fullcalendar/css fullcalendar/js fullcalendar/locales
wget -q -P fullcalendar/css https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/main.min.css
wget -q -P fullcalendar/js https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/main.min.js
wget -q -P fullcalendar/locales https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/locales/uk.min.js
echo "   ✅ FullCalendar завантажено (3 файли)"

# 8. Bootstrap Notify
echo "8️⃣ Bootstrap Notify..."
mkdir -p bootstrap-notify/js
wget -q -P bootstrap-notify/js https://cdn.jsdelivr.net/npm/bootstrap-notify@3.1.3/bootstrap-notify.min.js
echo "   ✅ Bootstrap Notify завантажено (1 файл)"

# 9. Sortable.js
echo "9️⃣ Sortable.js..."
mkdir -p sortable/js
wget -q -P sortable/js https://cdn.jsdelivr.net/npm/sortablejs@1.14.0/Sortable.min.js
echo "   ✅ Sortable завантажено (1 файл)"

echo ""
echo "✅ Всі бібліотеки успішно завантажено!"
echo ""
echo "📊 Статистика:"
find . -type f -newer /tmp 2>/dev/null | wc -l | xargs -I {} echo "   Завантажено файлів: {}"
du -sh . | awk '{print "   Загальний розмір: " $1}'

