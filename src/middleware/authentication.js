const jwt = require('jsonwebtoken');
const { statusCodes } = require('../utils/constants');
const { prepareJSONResponse } = require('../utils/utils');

const JWT_SECRET = process.env.JWT_PRIVKEY;

const Authentication =
  (isInternal = false) =>
  async (req, res, next) => {
    if (!req.headers || !req.headers.authorization) {
      return res
        .status(statusCodes.UNAUTHORIZED)
        .send(prepareJSONResponse({}, 'Kindly login to perform the action!!!', statusCodes.UNAUTHORIZED));
    }

    try {
      let token = req.headers.authorization;
      if (token.startsWith('Bearer ')) {
        token = token.slice(7);
      }

      const user = await jwt.verify(token, JWT_SECRET);

      if (user) {
        req.user = {
          ...user,
        };
      }
    } catch (err) {
      const message = err.name === 'TokenExpiredError' ? 'Expired token' : 'Invalid token';
      return res.status(statusCodes.UNAUTHORIZED).send(prepareJSONResponse({}, message, statusCodes.UNAUTHORIZED));
    }

    if (isInternal) {
      return req.user;
    }

    return next();
  };

module.exports = Authentication;
