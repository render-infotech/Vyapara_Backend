class DocumentError extends Error {
  constructor(message = 'Document failed to create ', status = 500) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
  }
}
module.exports = DocumentError;
