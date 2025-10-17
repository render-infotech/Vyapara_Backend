const { ValidationError } = require('class-validator');

const errorHandler = (err, req, res) => {
  if (!err) {
    return res.status(500).json({ message: 'Oops, something went wrong' });
  }

  // Handle class-validator errors
  if (Array.isArray(err) && err[0] instanceof ValidationError) {
    return res.status(400).json({ errors: err });
  }

  // Mongoose or other validation errors
  if (err.name === 'ValidationError') {
    return res.status(err.status || 400).json({ message: err.message, errors: err.errors });
  }

  // SQL/Database errors
  if (err.name === 'SqlError') {
    return res.status(err.status || 400).json({ message: err.message, sqlError: err.sqlError, stack: err.stack });
  }

  // Any error with a defined status (non-500)
  if (err.status && err.status !== 500) {
    return res.status(err.status).json({ message: err.message });
  }

  // Production: hide stack trace
  if (process.env.NODE_ENV === 'prod') {
    return res.status(err.status || 500).json({ message: 'Oops, something went wrong' });
  }

  // Development: include stack trace
  return res.status(err.status || 500).json({ message: err.message, stack: err.stack });
};

module.exports = errorHandler;
