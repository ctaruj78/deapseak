// feedback-request.js
// Фідбек/оцінка роботи техніка після виконання заявки

class FeedbackRequest {
  constructor() {
    this.container = null;
    this.rating = 0;
    this.comment = '';
  }

  render(containerSelector) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) return;
    this.container.innerHTML = `
      <h4>Оцінка роботи техніка</h4>
      <div class="mb-3">
        <label>Оцініть роботу (1-5):</label>
        <div id="ratingStars">
          ${[1,2,3,4,5].map(i => `<span class="star" data-value="${i}" style="font-size:2rem;cursor:pointer;color:${i<=this.rating?'#ffc107':'#e4e5e9'}">★</span>`).join('')}
        </div>
      </div>
      <div class="mb-3">
        <label>Comentário:</label>
        <textarea id="feedbackComment" class="form-control" rows="2" placeholder="Ваші враження..."></textarea>
      </div>
      <button class="btn btn-success" id="submitFeedbackBtn">Enviar фідбек</button>
    `;
    document.querySelectorAll('.star').forEach(star => {
      star.onclick = () => { this.rating = parseInt(star.dataset.value); this.render(containerSelector); };
    });
    document.getElementById('submitFeedbackBtn').onclick = () => this.submitFeedback();
    document.getElementById('feedbackComment').oninput = (e) => this.comment = e.target.value;
  }

  submitFeedback() {
    if (this.rating === 0) { alert('Avalie o trabalho!'); return; }
    alert(`Дякуємо за оцінку: ${this.rating}★\nComentário: ${this.comment}`);
    // Тут можна додати інтеграцію з сервером
    this.rating = 0;
    this.comment = '';
    this.render(this.container);
  }
}

window.feedbackRequest = new FeedbackRequest();
