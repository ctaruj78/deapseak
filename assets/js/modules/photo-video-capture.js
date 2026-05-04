// photo-video-capture.js
// Fotografia/відео-фіксація проблем для техніка з додаванням до звіту

class PhotoVideoCapture {
  constructor(reportManager) {
    this.reportManager = reportManager;
    this.mediaStream = null;
    this.videoElement = null;
    this.photoGallery = [];
  }

  async init(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    container.innerHTML = `
      <h4>Fotografia/Vídeo-фіксація</h4>
      <video id="arVideo" width="320" height="240" autoplay muted style="border:1px solid #ccc;"></video>
      <div class="mt-2">
        <button class="btn btn-primary btn-sm" id="startVideoBtn">Старт відео</button>
        <button class="btn btn-success btn-sm" id="capturePhotoBtn">Зробити фото</button>
      </div>
      <div id="photoGallery" class="mt-3"></div>
    `;
    this.videoElement = document.getElementById('arVideo');
    document.getElementById('startVideoBtn').onclick = () => this.startVideo();
    document.getElementById('capturePhotoBtn').onclick = () => this.capturePhoto();
  }

  async startVideo() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.videoElement.srcObject = this.mediaStream;
    } else {
      alert('Câmara não suportada');
    }
  }

  capturePhoto() {
    if (!this.videoElement) return;
    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth || 320;
    canvas.height = this.videoElement.videoHeight || 240;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    this.photoGallery.push(dataUrl);
    this.updateGallery();
    this.reportManager?.addPhoto(dataUrl);
  }

  updateGallery() {
    const gallery = document.getElementById('photoGallery');
    if (!gallery) return;
    gallery.innerHTML = this.photoGallery.map((url, i) => `<img src="${url}" width="80" class="mr-2 mb-2" alt="Fotografia ${i+1}">`).join('');
  }
}

window.photoVideoCapture = new PhotoVideoCapture(window.reportManager || null);
