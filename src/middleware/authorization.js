const { statusCodes } = require('../utils/constants');
const { prepareJSONResponse } = require('../utils/utils');
const Authentication = require('./authentication');
const logger = require('../utils/logger');

const Authorization = (routeName) => async (req, res, next) => {
  try {
    // Authenticate user and attach req.user
    const user = await Authentication(true)(req, res, next);

    const requestData = {
      params: req.params,
      query: req.query,
      body: req.body,
      headers: req.headers,
      method: req.method,
      url: req.url,
      routeName,
    };

    logger.info(`Authorization req for ${JSON.stringify(requestData)}`);

    if (!user || !user.permissions) {
      return res
        .status(statusCodes.UNAUTHORIZED)
        .send(prepareJSONResponse({}, 'Unauthorized', statusCodes.UNAUTHORIZED));
    }

    // Check if user has required permission
    if (!user.permissions.includes(routeName)) {
      logger.error(`Authorization err for ${routeName} in ${JSON.stringify(user.permissions)}`);
      return res
        .status(statusCodes.UNAUTHORIZED)
        .send(prepareJSONResponse({}, 'Action Not Allowed', statusCodes.UNAUTHORIZED));
    }

    // Authorized
    req.user = user;
    return next();
  } catch (err) {
    logger.error('Authorization middleware error:', err);
    return res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .send(prepareJSONResponse({}, 'Internal Server Error', statusCodes.INTERNAL_SERVER_ERROR));
  }
};

module.exports = Authorization;
