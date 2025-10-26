# DeapSeaK Application Version Management

## Current Version
**v1.0.0** - Initial Release

**Application Name:** DeapSeaK  
**Description:** Elevator Management System  
**Release Date:** October 26, 2024

## Version Information

This document explains how version information is managed across the DeapSeaK application.

### Version Sources

The application version is centrally managed through multiple sources:

1. **assets/js/app-version.js** - Main version configuration file
2. **package.json** - NPM package version
3. **manifest.json** - PWA manifest version
4. **config.js** - Application config VERSION constant
5. **HTML footers** - Display current version on pages

### How to Update Version

To update the application version globally:

#### Step 1: Update app-version.js
```javascript
// File: assets/js/app-version.js
const AppVersion = {
    VERSION: '1.1.0',  // Change this
    BUILD_DATE: new Date().toISOString(),
    NAME: 'DeapSeaK',
    DESCRIPTION: 'Elevator Management System',
    // ...
};
```

#### Step 2: Update package.json
```json
{
  "name": "deapseak",
  "version": "1.1.0",  // Change this
  "description": "DeapSeaK - Elevator Management System"
}
```

#### Step 3: Update manifest.json
```json
{
  "name": "DeapSeaK - Elevator Management System",
  "version": "1.1.0",  // Change this
  "description": "Система управління ліфтами з QR-кодами"
}
```

#### Step 4: Update config.js
```javascript
class AppConfig {
    static VERSION = '1.1.0';  // Change this
    static APP_NAME = 'DeapSeaK';
    static APP_DESCRIPTION = 'Elevator Management System';
}
```

### Version Display

#### On Web Pages
Version is automatically displayed on:
- Login page footer
- Dashboard pages footer (all roles)
- Settings pages
- Any element with `id="footerVersion"` or `id="systemVersion"`

#### Display Examples
```html
<!-- Automatic version update in footer -->
<small>v<span id="footerVersion"></span></small>

<!-- System version display -->
<div id="systemVersion"></div>

<!-- Custom version displays -->
<div data-version="full"></div>   <!-- Shows "DeapSeaK v1.0.0" -->
<div data-version="short"></div>  <!-- Shows "1.0.0" -->
```

#### JavaScript Access
```javascript
// Get version information programmatically
AppVersion.VERSION;                    // "1.0.0"
AppVersion.getFullVersion();           // "DeapSeaK v1.0.0"
AppVersion.getVersionInfo();           // Full version object

// Manually update all version displays
AppVersion.updateVersionDisplay();
```

### Centralized Version Management

The **app-version.js** file is automatically loaded on:
- index.html (main page)
- login.html (login page)
- All dashboard files (admin, dispatcher, tech, client, ai-assistant)

The script automatically:
1. Updates all elements with version IDs on page load
2. Provides global `AppVersion` object
3. Handles version display formatting

### Version Convention

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR.MINOR.PATCH** (e.g., 1.0.0)
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

### Release Checklist

When updating to a new version:

- [ ] Update VERSION in app-version.js
- [ ] Update version in package.json
- [ ] Update version in manifest.json
- [ ] Update VERSION in config.js
- [ ] Test version display on main pages
- [ ] Commit changes with version tag
- [ ] Create git tag: `git tag v1.1.0`
- [ ] Push changes and tags: `git push --tags`

### Related Files

- **Main Version File:** `assets/js/app-version.js`
- **Configuration:** `config.js`
- **NPM Package:** `package.json`
- **PWA Manifest:** `manifest.json`
- **Pages with Version Display:**
  - `index.html`
  - `login.html`
  - `pages/admin/admin-dashboard.html`
  - `pages/dispatcher/dashboard.html`
  - `pages/tech/dashboard.html`
  - `pages/client/dashboard.html`
  - `pages/ai-assistant/dashboard.html`
  - `pages/dispatcher/settings.html`

## Version History

### v1.0.0 (October 26, 2024)
- Initial release
- Unified version management across project
- Centralized version configuration
- Automatic version display on all pages
- Version accessible via JavaScript API

---

**Last Updated:** October 26, 2024  
**Maintained by:** Development Team  
**Status:** Active
