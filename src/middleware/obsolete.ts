import { Request, Response } from 'express';
import { statusCodes } from '../utils/constants';
import { prepareJSONResponse } from '../utils/utils';
import logger from '../utils/logger';

const Obsolete = () => async (req: Request, res: Response) => {
  logger.info(`Obsolete middleware triggered for URL: ${req.originalUrl || req.url}`);
  return res
    .status(statusCodes.NOT_FOUND)
    .send(prepareJSONResponse({}, 'This Endpoint is marked Obsolete', statusCodes.NOT_FOUND));
};

export default Obsolete;
