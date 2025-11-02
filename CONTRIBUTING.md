# Contributing to DeapSeak

## 🚀 Quick Start

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/deapseak.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature`
5. Make your changes
6. Run tests: `npm test`
7. Commit: `git commit -m "Add your feature"`
8. Push: `git push origin feature/your-feature`
9. Create a Pull Request

## 🧪 Testing

- Run all tests: `npm test`
- Run with coverage: `npm test -- --coverage`
- Run specific test: `npm test -- auth.routes.test.js`
- Watch mode: `npm test -- --watch`

## ✅ Code Quality

All PRs must:
- ✅ Pass all tests (17/17)
- ✅ Pass CI/CD pipeline
- ✅ Have meaningful commit messages
- ✅ Include tests for new features

## 🤖 CI/CD

GitHub Actions automatically runs:
- Unit tests
- Integration tests
- Code coverage
- Security audit
- Build verification

## 📝 Commit Convention

Use semantic commit messages:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `test:` Test updates
- `refactor:` Code refactoring
- `chore:` Maintenance

Example: `feat: Add user authentication endpoint`
