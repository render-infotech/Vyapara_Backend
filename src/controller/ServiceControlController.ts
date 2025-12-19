import { Request, Response } from 'express';
import { statusCodes, predefinedRoles } from '../utils/constants';
import { prepareJSONResponse } from '../utils/utils';
import logger from '../utils/logger';
import ServiceControlModel from '../models/serviceControl';

export default class ServiceControlController {
  // @ts-ignore
  private serviceControlModel: ServiceControlModel;

  constructor(
    // @ts-ignore
    serviceControlModel: ServiceControlModel,
  ) {
    this.serviceControlModel = serviceControlModel;
  }

  // eslint-disable-next-line class-methods-use-this
  async checkCurrentUser(req: Request) {
    // @ts-ignore
    const { role_id, userId } = req.user;
    const functionParams = {
      isAdmin: false,
      isRider: false,
      isVendor: false,
      customer: false,
    };

    if (role_id === predefinedRoles?.Admin.id) {
      functionParams.isAdmin = true;
    } else if (role_id === predefinedRoles.Rider.id) {
      functionParams.isRider = true;
    } else if (role_id === predefinedRoles.Vendor.id) {
      functionParams.isVendor = true;
    } else if (role_id === predefinedRoles.User.id) {
      functionParams.customer = true;
    }
    logger.info('checkCurrentUser Req and Res.', `${userId} ${JSON.stringify(functionParams)}`);
    return functionParams;
  }

  // eslint-disable-next-line class-methods-use-this
  async getLatestServiceStatus(service_key?: number) {
    try {
      const serviceWhere: any = {};

      if (service_key) {
        serviceWhere.service_key = service_key;
      }

      const serviceStatus = await this.serviceControlModel.findOne({
        where: serviceWhere,
        order: [['created_at', 'DESC']],
      });

      logger.info(`getLatestServiceStatus - Fetched service control data ${JSON.stringify(serviceStatus)}`);

      if (!serviceStatus) {
        return {
          service_key,
          is_enabled: 1,
          is_active: true,
          reason: null,
        };
      } else {
        const isEnabled = Number(serviceStatus.is_enabled) === 1;
        return {
          service_key: serviceStatus.service_key,
          is_enabled: serviceStatus.is_enabled,
          is_active: isEnabled,
          reason: serviceStatus.reason || null,
        };
      }
    } catch (error) {
      logger.error('getLatestServiceStatus - Error fetching service status.', error);
      return {
        service_key,
        is_enabled: 0,
        is_active: false,
        reason: null,
      };
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async activateService(req: Request, res: Response) {
    // @ts-ignore
    const { userId } = req.user;
    const requestBody = req.body;
    const mandatoryFields = [];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};

    const currentUser = await this.checkCurrentUser(req);
    if (!currentUser.isAdmin) {
      responseData = prepareJSONResponse({}, 'Unauthorized', statusCodes.UNAUTHORIZED);
    } else if (missingFields.length > 0) {
      const message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const serviceStatus = await this.getLatestServiceStatus();
        if (serviceStatus.is_active) {
          responseData = prepareJSONResponse({}, 'Services already activated.', statusCodes.BAD_REQUEST);
        } else {
          const { service_key, reason } = requestBody;
          const newData = await this.serviceControlModel.create({
            service_key,
            is_enabled: 1,
            reason: reason || '',
            toggled_by: userId,
          });
          logger.info(`activateService - Added new entry in service control table: ${JSON.stringify(newData)} }`);
          responseData = prepareJSONResponse({}, 'Success', statusCodes.CREATED);
        }
      } catch (error) {
        logger.error('activateService - Error in toggling the service.', error);
        responseData = prepareJSONResponse({}, 'Error in toggling the service', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(`activateService Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async deactivateService(req: Request, res: Response) {
    // @ts-ignore
    const { userId } = req.user;
    const requestBody = req.body;
    const mandatoryFields = [];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};

    const currentUser = await this.checkCurrentUser(req);
    if (!currentUser.isAdmin) {
      responseData = prepareJSONResponse({}, 'Unauthorized', statusCodes.UNAUTHORIZED);
    } else if (missingFields.length > 0) {
      const message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const serviceStatus = await this.getLatestServiceStatus();
        if (!serviceStatus.is_active) {
          responseData = prepareJSONResponse({}, 'Services already deactivated.', statusCodes.BAD_REQUEST);
        } else {
          const { service_key, reason } = requestBody;
          const newData = await this.serviceControlModel.create({
            service_key,
            is_enabled: 0,
            reason: reason || '',
            toggled_by: userId,
          });
          logger.info(`deactivateService - Added new entry in service control table: ${JSON.stringify(newData)} }`);
          responseData = prepareJSONResponse({}, 'Success', statusCodes.CREATED);
        }
      } catch (error) {
        logger.error('deactivateService - Error in toggling the service.', error);
        responseData = prepareJSONResponse({}, 'Error in toggling the service', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(`deactivateService Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async getServiceCurrentStatus(req: Request, res: Response) {
    const requestBody = req.query;
    const mandatoryFields = [];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};

    if (missingFields.length > 0) {
      const message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const { service_key } = requestBody;

        const serviceWhere: any = {};

        if (service_key) {
          serviceWhere.service_key = service_key;
        }

        const serviceStatus = await this.serviceControlModel.findOne({
          where: serviceWhere,
          order: [['created_at', 'DESC']],
        });

        logger.info(`getServiceCurrentStatus - Fetched service control data ${JSON.stringify(serviceStatus)}`);

        if (!serviceStatus) {
          responseData = prepareJSONResponse(
            {},
            'No service status found, Service is enabled by default',
            statusCodes.NOT_FOUND,
          );
        } else {
          const finalResponse = {
            is_enabled: serviceStatus?.is_enabled,
          };
          responseData = prepareJSONResponse(finalResponse, 'Success', statusCodes.CREATED);
        }
      } catch (error) {
        logger.error('getServiceCurrentStatus - Error fetching service status.', error);
        responseData = prepareJSONResponse({}, 'Error fetching service status', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(
      `getServiceCurrentStatus Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }
}
