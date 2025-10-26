/**
 * DeapSeaK Application Version Configuration
 * Central version management for the entire application
 */

const AppVersion = {
    VERSION: '1.0.0',
    BUILD_DATE: new Date().toISOString(),
    NAME: 'DeapSeaK',
    DESCRIPTION: 'Elevator Management System',
    
    /**
     * Get full version string
     */
    getFullVersion() {
        return `${this.NAME} v${this.VERSION}`;
    },
    
    /**
     * Get version info object
     */
    getVersionInfo() {
        return {
            version: this.VERSION,
            name: this.NAME,
            description: this.DESCRIPTION,
            buildDate: this.BUILD_DATE,
            fullVersion: this.getFullVersion()
        };
    },
    
    /**
     * Update version display on page
     */
    updateVersionDisplay() {
        // Update all version elements
        const versionElements = document.querySelectorAll('[data-version]');
        versionElements.forEach(el => {
            const format = el.getAttribute('data-version');
            if (format === 'full') {
                el.textContent = this.getFullVersion();
            } else if (format === 'short') {
                el.textContent = this.VERSION;
            }
        });
        
        // Update specific IDs
        const footerVersion = document.getElementById('footerVersion');
        if (footerVersion) {
            footerVersion.textContent = this.VERSION;
        }
        
        const systemVersion = document.getElementById('systemVersion');
        if (systemVersion) {
            systemVersion.textContent = this.VERSION;
        }
        
        const systemInfoVersion = document.getElementById('systemInfoVersion');
        if (systemInfoVersion) {
            systemInfoVersion.textContent = this.VERSION;
        }
    }
};

// Auto-update version on page load
document.addEventListener('DOMContentLoaded', () => {
    AppVersion.updateVersionDisplay();
});

// Make available globally
window.AppVersion = AppVersion;
