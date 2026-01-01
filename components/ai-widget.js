/**
 * AI Widget - Wrapper for AIInterfaceController
 * Provides global AIWidget object for admin pages
 */

// Import main AI controller
if (typeof AIInterfaceController === 'undefined') {
    // Load ai_interface.js dynamically if not loaded
    const script = document.createElement('script');
    script.src = '/assets/js/ai_interface.js';
    script.async = false;
    document.head.appendChild(script);
}

// Create global AIWidget object
window.AIWidget = {
    controller: null,
    
    init: function() {
        if (typeof AIInterfaceController !== 'undefined') {
            this.controller = new AIInterfaceController();
            console.log('✅ AI Widget initialized with AIInterfaceController');
        } else {
            console.warn('⚠️ AIInterfaceController not loaded yet. Retrying in 500ms...');
            setTimeout(() => this.init(), 500);
        }
    },
    
    // Proxy methods to controller
    getRecommendations: function() {
        return this.controller ? this.controller.recommendations : [];
    },
    
    enablePersonalization: function() {
        if (this.controller) {
            this.controller.isPersonalizationEnabled = true;
        }
    },
    
    disablePersonalization: function() {
        if (this.controller) {
            this.controller.isPersonalizationEnabled = false;
        }
    }
};

console.log('AI Widget loaded (wrapper)');
