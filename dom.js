class DOMHelper {
    static showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    static createDropdown(options, selectedValue, onChange) {
        const select = document.createElement('select');
        
        options.forEach(option => {
            const optElement = document.createElement('option');
            optElement.value = option.value;
            optElement.textContent = option.label;
            optElement.selected = option.value === selectedValue;
            select.appendChild(optElement);
        });
        
        select.addEventListener('change', (e) => {
            if (onChange) onChange(e.target.value);
        });
        
        return select;
    }

    static createActionButton(label, onClick, type = 'primary') {
        const button = document.createElement('button');
        button.className = `btn ${type}`;
        button.textContent = label;
        button.addEventListener('click', onClick);
        return button;
    }
}