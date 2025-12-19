import { Request, Response } from 'express';
import { Op } from 'sequelize';
import ContentPageModel from '../models/contentPage';
import { statusCodes, predefinedRoles } from '../utils/constants';
import { prepareJSONResponse } from '../utils/utils';
import logger from '../utils/logger';

export default class ContentPageController {
  // @ts-ignore
  private contentPageModel: ContentPageModel;

  constructor(
    // @ts-ignore
    contentPageModel: ContentPageModel,
  ) {
    this.contentPageModel = contentPageModel;
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
    logger.info('ContentPageController checkCurrentUser Req and Res.', `${userId} ${JSON.stringify(functionParams)}`);
    return functionParams;
  }

  // eslint-disable-next-line class-methods-use-this
  async getAllPages(req: Request, res: Response) {
    // const mandatoryFields = [];
    const requestData = req.query as { search?: string; page_type?: string };
    // const missingFields = mandatoryFields.filter((field) => !requestData[field]);

    let responseData: typeof prepareJSONResponse;

    // if (missingFields.length > 0) {
    //   const message = `Missing required fields parameter: ${missingFields.join(', ')}`;
    //   responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    // } else

    const { search, page_type } = requestData;

    try {
      const where: any = { is_deleted: 0, status: 1 };
      if (page_type) where.page_type = page_type;
      if (search) where.page_name = { [Op.like]: `%${search}%` };

      const pages = await this.contentPageModel.findAll({
        where,
        order: [['created_at', 'DESC']],
      });

      const responseDataFiltered = pages.map((item) => ({
        id: item.id,
        page_name: item.page_name,
        page_details: item.page_details,
        page_type: item.page_type,
      }));

      responseData = prepareJSONResponse(responseDataFiltered, 'Success', statusCodes.OK);
    } catch (error) {
      logger.error('getAllPages - Error retrieving content pages.', error);
      responseData = prepareJSONResponse({}, 'Error fetching pages', statusCodes.INTERNAL_SERVER_ERROR);
    }

    logger.info(`getAllPages Req and Res: ${JSON.stringify(requestData)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async getPageById(req: Request, res: Response) {
    const mandatoryFields = ['page_id'];
    const requestData = req.query as { page_id?: string };
    const missingFields = mandatoryFields.filter((field) => !requestData[field]);

    let responseData: typeof prepareJSONResponse;

    if (missingFields.length > 0) {
      const message = `Missing required parameter: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const { page_id } = requestData;

        const page = await this.contentPageModel.findOne({ where: { id: page_id, is_deleted: 0 } });

        if (!page) {
          responseData = prepareJSONResponse({}, 'Page not found', statusCodes.NOT_FOUND);
        } else {
          const responseDataFiltered = {
            id: page.id,
            page_name: page.page_name,
            page_details: page.page_details,
            page_type: page.page_type,
          };
          responseData = prepareJSONResponse(responseDataFiltered, 'Success', statusCodes.OK);
        }
      } catch (error) {
        logger.error('getPageById - Error retrieving page.', error);
        responseData = prepareJSONResponse({}, 'Error fetching page', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }

    logger.info(`getPageById Req and Res: ${JSON.stringify(req.query)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async createPage(req: Request, res: Response) {
    const mandatoryFields = ['page_name', 'page_details'];
    const requestData = req.body;
    const missingFields: string[] = [];

    const trimmedData: Record<string, any> = {};

    mandatoryFields.forEach((field) => {
      const value = typeof requestData[field] === 'string' ? requestData[field].trim() : requestData[field];
      trimmedData[field] = value;
      if (!value) missingFields.push(field);
    });

    let responseData: typeof prepareJSONResponse;

    const currentUser = await this.checkCurrentUser(req);
    if (!currentUser.isAdmin) {
      responseData = prepareJSONResponse({}, 'Unauthorized', statusCodes.UNAUTHORIZED);
    } else if (missingFields.length > 0) {
      const message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const { page_name, page_details } = trimmedData;

        const existingPage = await this.contentPageModel.findOne({
          where: { page_name, is_deleted: 0, status: 1 },
        });

        if (existingPage) {
          responseData = prepareJSONResponse({}, 'Page name already exists', statusCodes.BAD_REQUEST);
        } else {
          await this.contentPageModel.create({
            page_name,
            page_details,
            page_type: requestData?.page_type || '',
          });
          responseData = prepareJSONResponse({}, 'Success', statusCodes.CREATED);
        }
      } catch (error) {
        logger.error('createPage - Error creating page.', error);
        responseData = prepareJSONResponse({}, 'Error creating page', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }

    logger.info(`createPage Req and Res: ${JSON.stringify(requestData)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async updatePage(req: Request, res: Response) {
    const mandatoryFields = ['page_id'];
    const requestData = req.body;
    const missingFields: string[] = [];

    const trimmedData: Record<string, any> = {};

    mandatoryFields.forEach((field) => {
      const value = typeof requestData[field] === 'string' ? requestData[field].trim() : requestData[field];
      trimmedData[field] = value;
      if (!value) missingFields.push(field);
    });

    let responseData: typeof prepareJSONResponse;

    if (missingFields.length > 0) {
      const message = `Missing required fields parameter: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      const currentUser = await this.checkCurrentUser(req);
      if (!currentUser.isAdmin) {
        responseData = prepareJSONResponse({}, 'Unauthorized', statusCodes.UNAUTHORIZED);
      } else {
        try {
          const { page_id } = trimmedData;

          const page = await this.contentPageModel.findOne({ where: { id: page_id, is_deleted: 0, status: 1 } });

          if (!page) {
            responseData = prepareJSONResponse({}, 'Page not found', statusCodes.NOT_FOUND);
          } else {
            const updateData: Record<string, any> = {};

            if (typeof requestData.page_name === 'string' && requestData.page_name.trim() !== '') {
              updateData.page_name = requestData.page_name.trim();
            }

            if (typeof requestData.page_details === 'string' && requestData.page_details.trim() !== '') {
              updateData.page_details = requestData.page_details.trim();
            }

            if (Object.keys(updateData).length > 0) {
              await page.update(updateData);
              responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
            } else {
              responseData = prepareJSONResponse({}, 'No valid fields provided for update', statusCodes.BAD_REQUEST);
            }
          }
        } catch (error) {
          logger.error('updatePage - Error updating page.', error);
          responseData = prepareJSONResponse({}, 'Error updating page', statusCodes.INTERNAL_SERVER_ERROR);
        }
      }
    }

    logger.info(`updatePage Req and Res: ${JSON.stringify(requestData)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async deletePage(req: Request, res: Response) {
    const mandatoryFields = ['page_id'];
    const requestData = req.query;
    const missingFields = mandatoryFields.filter((field) => !requestData[field]);

    let responseData: typeof prepareJSONResponse;

    if (missingFields.length > 0) {
      const message = `Missing required field: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      const currentUser = await this.checkCurrentUser(req);
      if (!currentUser.isAdmin) {
        responseData = prepareJSONResponse({}, 'Unauthorized', statusCodes.UNAUTHORIZED);
      } else {
        try {
          const { page_id } = requestData;

          const page = await this.contentPageModel.findOne({ where: { id: page_id, is_deleted: 0 } });

          if (!page) {
            responseData = prepareJSONResponse({}, 'Page not found', statusCodes.NOT_FOUND);
          } else {
            await page.update({ is_deleted: 1, status: 1 });
            responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
          }
        } catch (error) {
          logger.error('deletePage - Error deleting page.', error);
          responseData = prepareJSONResponse({}, 'Error deleting page', statusCodes.INTERNAL_SERVER_ERROR);
        }
      }
    }

    logger.info(`deletePage Req and Res: ${JSON.stringify(requestData)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }
}
