const { statusCodes } = require('../utils/constants');
const { prepareJSONResponse } = require('../utils/utils');
const logger = require('../utils/logger');

const InternalAuthorization = (routeName) => async (req, res, next) => {
  const requestData = {
    params: req.params,
    query: req.query,
    body: req.body,
    headers: req.headers,
    method: req.method,
    url: req.url,
    routeName,
  };

  try {
    if (!req.headers || !req.headers.authorization) {
      return res
        .status(statusCodes.UNAUTHORIZED)
        .send(prepareJSONResponse({}, 'Kindly login to perform the action!!!', statusCodes.UNAUTHORIZED));
    }

    let token = req.headers.authorization;
    if (token.startsWith('Bearer ')) {
      token = token.slice(7);
    }

    if (token === process.env.INTERNAL_KEY) {
      logger.info(`InternalAuthorization Success for ${JSON.stringify(requestData)}`);
      return next();
    }
    logger.error(`InternalAuthorization err for ${JSON.stringify(requestData)}`);
    return res
      .status(statusCodes.UNAUTHORIZED)
      .send(prepareJSONResponse({}, 'Action Not Allowed', statusCodes.UNAUTHORIZED));
  } catch (err) {
    logger.error(`InternalAuthorization exception for ${JSON.stringify(requestData)} - ${err?.message ?? 'Unknown'}`);
    return res
      .status(statusCodes.UNAUTHORIZED)
      .send(prepareJSONResponse({}, 'Invalid token', statusCodes.UNAUTHORIZED));
  }
};

module.exports = InternalAuthorization;
