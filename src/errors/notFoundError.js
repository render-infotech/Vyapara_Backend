class NotFoundError extends Error {
  constructor(message = 'Record Not Found ', status = 404) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
  }
}

module.exports = NotFoundError;
