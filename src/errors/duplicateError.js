class DuplicateError extends Error {
  constructor(message = 'Duplicate Entry', status = statusCodes.BAD_REQUEST) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
  }
}

module.exports = DuplicateError;
