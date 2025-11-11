/**
 * HTTP status codes used in the application.
 *
 * @constant
 * @type {object}
 * @property {number} OK - Status code for a successful HTTP request.
 * @property {number} CREATED - Status code for a new resource that has been successfully created.
 * @property {number} NO_CONTENT - Status code for a successful request where there's no representation to return (i.e. the response is empty).
 * @property {number} BAD_REQUEST - Status code for an unsuccessful request due to client error.
 * @property {number} UNAUTHORIZED - Status code when authentication is required and has failed or has not yet been provided.
 * @property {number} FORBIDDEN - Status code when the client does not have the rights to the content.
 * @property {number} NOT_FOUND - Status code when the requested resource could not be found.
 * @property {number} INTERNAL_SERVER_ERROR - Status code for an unexpected server error.
 */

export const statusCodes = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

/**
 * Configuration for the database connection.
 *
 * @constant
 * @type {object}
 * @property {string} database - The name of the database.
 * @property {string} username - The username for the database connection.
 * @property {string} password - The password for the database connection.
 * @property {string} host - The host of the database.
 * @property {string} dialect - The dialect/engine of the database.
 * @property {string} port - The port of the database.
 */
export const DBConfig = {
  database: process.env.DBDATABASE,
  username: process.env.DBUSER,
  password: process.env.DBPASSWORD,
  host: process.env.DBHOST,
  dialect: process.env.DBDIALECT,
  port: process.env.DBPORT,
};

export const predefinedRoles = {
  Admin: {
    id: 1,
    name: 'Admin',
    can_modify: 0,
  },
  Vendor: {
    id: 2,
    name: 'Vendor',
    can_modify: 1,
  },
  Rider: {
    id: 3,
    name: 'Rider',
    can_modify: 1,
  },
  User: {
    id: 10,
    name: 'User',
    can_modify: 1,
  },
};

export const predefinedMaterials = {
  Gold: {
    id: 1,
    name: 'Gold',
    can_modify: 0,
  },
  Silver: {
    id: 2,
    name: 'Silver',
    can_modify: 0,
  },
};

export const predefinedTransactionType = {
  Buy: {
    id: 1,
    name: 'Buy',
    can_modify: 0,
  },
  Deposit: {
    id: 2,
    name: 'Deposit',
    can_modify: 0,
  },
  Redeem: {
    id: 3,
    name: 'Redeem',
    can_modify: 0,
  },
};

export const predefinedTransactionStatus = {
  Pending: {
    id: 1,
    name: 'Pending',
    can_modify: 0,
  },
  Completed: {
    id: 2,
    name: 'Completed',
    can_modify: 0,
  },
  Failed: {
    id: 3,
    name: 'Failed',
    can_modify: 0,
  },
  Cancelled: {
    id: 4,
    name: 'Cancelled',
    can_modify: 0,
  },
  Refunded: {
    id: 5,
    name: 'Refunded',
    can_modify: 0,
  },
};

export const predefinedPaymentType = {
  UPI: {
    id: 1,
    name: 'UPI',
    can_modify: 0,
  },
  Credit_Card: {
    id: 2,
    name: 'Credit_Card',
    can_modify: 0,
  },
  Debit_Card: {
    id: 3,
    name: 'Debit_Card',
    can_modify: 0,
  },
  Net_Banking: {
    id: 4,
    name: 'Net_Banking',
    can_modify: 0,
  },
};

export const predefinedTaxType = {
  GST: {
    id: 1,
    name: 'GST',
    can_modify: 0,
  },
};

export const predefinedTaxFor = {
  Material: {
    id: 1,
    name: 'Material',
    can_modify: 0,
  },
  Service_fee: {
    id: 2,
    name: 'Service_fee',
    can_modify: 0,
  },
};

export const predefinedServiceFeeFor = {
  Convenience_fee: {
    id: 1,
    name: 'Convenience Fee',
    can_modify: 0,
  },
};
