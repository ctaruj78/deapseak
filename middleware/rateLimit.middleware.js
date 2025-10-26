const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Занадто багато запитів, спробуйте пізніше'
});

const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Занадто багато спроб, спробуйте пізніше'
});

module.exports = { limiter, strictLimiter };
