class QRManager {
    static generateQRCode(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Використання бібліотеки qrcode.js
        new QRCode(container, {
            text: data,
            width: 128,
            height: 128,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    static generateAllQRCodes() {
        const lifts = LiftAPI.getLifts();
        const container = document.getElementById('qrcodes-container');
        
        container.innerHTML = '';
        
        lifts.forEach(lift => {
            const liftCard = document.createElement('div');
            liftCard.className = 'qr-card';
            
            liftCard.innerHTML = `
                <h3>Elevador ${lift.serialNumber}</h3>
                <div class="qr-code" id="qr-${lift.id}"></div>
                <p>${lift.address}</p>
            `;
            
            container.appendChild(liftCard);
            this.generateQRCode(`qr-${lift.id}`, JSON.stringify({
                liftId: lift.id,
                serial: lift.serialNumber
            }));
        });
    }
}