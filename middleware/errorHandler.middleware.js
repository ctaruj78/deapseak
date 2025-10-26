const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Внутрішня помилка сервера';
  
  res.status(statusCode).json({ 
    error: message,
    timestamp: new Date().toISOString()
  });
};

module.exports = { errorHandler };
