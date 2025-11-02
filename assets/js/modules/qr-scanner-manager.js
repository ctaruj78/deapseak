/**
 * QR Scanner Manager - сканування QR кодів для технікам
 */
class QRScannerManager {
  constructor() {
    this.scans = [];
    this.init();
  }

  async init() {
    try {
      this.setupScanner();
      Notifier.success('QR сканер готовий');
    } catch (error) {
      Notifier.error('Помилка: ' + error.message);
    }
  }

  setupScanner() {
    const scannerBtn = document.getElementById('startScannerBtn');
    if (scannerBtn) {
      scannerBtn.addEventListener('click', () => this.startScanning());
    }
  }

  async startScanning() {
    try {
      // Логіка для запуску камери та сканування QR
      const video = document.getElementById('video');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      Notifier.info('Сканер запущений');
    } catch (error) {
      Notifier.error('Помилка доступу до камери: ' + error.message);
    }
  }

  async processQRCode(qrData) {
    try {
      const data = await api.post('/qr-scans', { qrCode: qrData });
      this.scans.push(data);
      Notifier.success('QR код сканований успішно');
      return data;
    } catch (error) {
      Notifier.error('Помилка: ' + error.message);
    }
  }

  async loadScans() {
    try {
      const data = await api.get('/qr-scans');
      this.scans = data.scans || [];
      this.renderScans();
    } catch (error) {
      // logger.error('Error:', error);
    }
  }

  renderScans() {
    const container = document.getElementById('scansList');
    if (!container) return;
    
    container.innerHTML = this.scans.map(scan => `
      <div class="list-group-item">
        <p>QR: ${scan.qrCode}</p>
        <p>Час: ${new Date(scan.timestamp).toLocaleString()}</p>
      </div>
    `).join('');
  }
}

let qrScannerManager;
document.addEventListener('DOMContentLoaded', () => {
  qrScannerManager = new QRScannerManager();
});
