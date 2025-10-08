class SqlError extends Error {
  constructor(message = 'SQL Error', status = 500) {
    super(message.stack || message);
    if (typeof message === 'object') {
      this.name = this.constructor.name;
      this.status = status;
      const sqlError = { ...message };
      delete sqlError.stack;
      this.sqlError = sqlError;
    } else {
      this.name = this.constructor.name;
      this.status = status;
    }
  }
}

module.exports = SqlError;
