const { statusCodes } = require('../utils/constants');
const { prepareJSONResponse } = require('../utils/utils');
const logger = require('../utils/logger');

const Obsolete = (req, res) => {
  logger.info(`Obsolete middleware triggered for URL: ${req.originalUrl || req.url}`);
  return res
    .status(statusCodes.NOT_FOUND)
    .send(prepareJSONResponse({}, 'This Endpoint is marked Obsolete', statusCodes.NOT_FOUND));
};

module.exports = Obsolete;
