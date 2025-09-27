// request-tracking.js
// Відстеження заявки: прогрес, фото/відео до і після ремонту

class RequestTracking {
  constructor() {
    this.container = null;
    this.progress = [
      { step: 'Створено', done: true },
      { step: 'В роботі', done: false },
      { step: 'Завершено', done: false }
    ];
    this.photosBefore = [];
    this.photosAfter = [];
  }

  render(containerSelector) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) return;
    this.container.innerHTML = `
      <h4>Відстеження заявки</h4>
      <div class="mb-3">
        <strong>Прогрес:</strong>
        <ul class="list-group mb-2">
          ${this.progress.map(p => `<li class="list-group-item ${p.done ? 'list-group-item-success' : ''}">${p.step}</li>`).join('')}
        </ul>
      </div>
      <div class="mb-3">
        <strong>Фото до ремонту:</strong>
        <div id="photosBefore" class="d-flex flex-wrap gap-2">${this.photosBefore.map(url => `<img src="${url}" width="80" class="mr-2 mb-2" alt="До ремонту">`).join('')}</div>
        <input type="file" id="uploadBefore" multiple accept="image/*" class="form-control-file mb-2">
      </div>
      <div class="mb-3">
        <strong>Фото після ремонту:</strong>
        <div id="photosAfter" class="d-flex flex-wrap gap-2">${this.photosAfter.map(url => `<img src="${url}" width="80" class="mr-2 mb-2" alt="Після ремонту">`).join('')}</div>
        <input type="file" id="uploadAfter" multiple accept="image/*" class="form-control-file mb-2">
      </div>
    `;
    document.getElementById('uploadBefore').onchange = (e) => this.uploadPhotos(e, 'before');
    document.getElementById('uploadAfter').onchange = (e) => this.uploadPhotos(e, 'after');
  }

  uploadPhotos(e, type) {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (type === 'before') this.photosBefore.push(ev.target.result);
        else this.photosAfter.push(ev.target.result);
        this.render(this.container);
      };
      reader.readAsDataURL(file);
    });
  }
}

window.requestTracking = new RequestTracking();
