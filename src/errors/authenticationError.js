class AuthenticationError extends Error {
  constructor(message = 'Authentication failed', status = 401) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
  }
}

module.exports = AuthenticationError;
