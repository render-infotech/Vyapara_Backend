import { Request, Response } from 'express';
import { predefinedRoles, statusCodes } from '../utils/constants';
import logger from '../utils/logger.js';
import { prepareJSONResponse } from '../utils/utils';
import UsersModel from '../models/users';
import RiderDetailsModel from '../models/riderDetails';

export default class RiderController {
  // @ts-ignore
  private usersModel: UsersModel;

  // @ts-ignore
  private riderDetailsModel: RiderDetailsModel;

  constructor(
    // @ts-ignore
    usersModel: UsersModel,
    // @ts-ignore
    riderDetailsModel: RiderDetailsModel,
  ) {
    this.usersModel = usersModel;
    this.riderDetailsModel = riderDetailsModel;
  }

  // eslint-disable-next-line class-methods-use-this
  async createRider(req: Request, res: Response) {
    const requestBody = req.body;
    // @ts-ignore
    const { userId, role_id } = req.user;
    let responseData: typeof prepareJSONResponse = {};

    try {
      if (role_id !== predefinedRoles.Vendor.id) {
        responseData = prepareJSONResponse({}, 'Access denied. Only Vendors can create riders.', statusCodes.FORBIDDEN);
        return res.status(responseData.status).json(responseData);
      }

      const { first_name, last_name, email, phone } = requestBody;
      const mandatoryFields = ['first_name', 'email', 'phone'];
      const missingFields = mandatoryFields.filter(
        (field) => requestBody[field] === undefined || requestBody[field] === null || requestBody[field] === '',
      );

      if (missingFields.length > 0) {
        responseData = prepareJSONResponse(
          {},
          `Missing required fields: ${missingFields.join(', ')}`,
          statusCodes.BAD_REQUEST,
        );
        return res.status(responseData.status).json(responseData);
      }

      // Check if user already exists
      const existingUser = await this.usersModel.findOne({
        where: {
          phone,
        },
      });

      if (existingUser) {
        responseData = prepareJSONResponse({}, 'User with this phone no already exists.', statusCodes.BAD_REQUEST);
        return res.status(responseData.status).json(responseData);
      }

      const newUser = await this.usersModel.create({
        first_name,
        last_name,
        email,
        phone,
        password: '',
        role_id: predefinedRoles.Rider.id,
        status: 1,
        is_deactivated: 0,
        two_factor_enabled: false,
        user_verified: 1, // Auto verify rider for now
        password_change_date: new Date(),
      });

      await this.riderDetailsModel.create({
        rider_id: newUser.id,
        vendor_id: userId,
        status: 1,
      });

      responseData = prepareJSONResponse({ rider_id: newUser.id }, 'Rider created successfully.', statusCodes.OK);
    } catch (error) {
      logger.error('createRider - Error creating rider.', error);
      responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    }

    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async listRiders(req: Request, res: Response) {
    // @ts-ignore
    const { userId, role_id } = req.user;
    let responseData: typeof prepareJSONResponse = {};

    try {
      let whereClause: any = {};

      if (role_id === predefinedRoles.Admin.id) {
        // Admin sees all riders
        whereClause = { status: 1 };
      } else if (role_id === predefinedRoles.Vendor.id) {
        // Vendor sees their own riders
        whereClause = { vendor_id: userId, status: 1 };
      } else {
        responseData = prepareJSONResponse({}, 'Access denied.', statusCodes.FORBIDDEN);
        return res.status(responseData.status).json(responseData);
      }

      const riders = await this.riderDetailsModel.findAll({
        where: whereClause,
        include: [
          {
            model: this.usersModel,
            as: 'rider',
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'status'],
          },
          {
            model: this.usersModel,
            as: 'vendor',
            attributes: ['id', 'first_name', 'last_name', 'email'], // Optional: show vendor info if admin
          },
        ],
      });

      responseData = prepareJSONResponse({ riders }, 'Success', statusCodes.OK);
    } catch (error) {
      logger.error('listRiders - Error fetching riders.', error);
      responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    }

    return res.status(responseData.status).json(responseData);
  }
  // eslint-disable-next-line class-methods-use-this
  async listAllRiders(req: Request, res: Response) {
    // @ts-ignore
    const { userId, role_id } = req.user;
    let responseData: typeof prepareJSONResponse = {};

    try {
      let whereClause: any = {};

      if (role_id === predefinedRoles.Admin.id) {
        // Admin sees all riders
        whereClause = {};
      } else if (role_id === predefinedRoles.Vendor.id) {
        // Vendor sees their own riders
        whereClause = { vendor_id: userId };
      } else {
        responseData = prepareJSONResponse({}, 'Access denied.', statusCodes.FORBIDDEN);
        return res.status(responseData.status).json(responseData);
      }

      const riders = await this.riderDetailsModel.findAll({
        where: whereClause,
        include: [
          {
            model: this.usersModel,
            as: 'rider',
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'status'],
          },
          {
            model: this.usersModel,
            as: 'vendor',
            attributes: ['id', 'first_name', 'last_name', 'email'], // Optional: show vendor info if admin
          },
        ],
      });

      responseData = prepareJSONResponse({ riders }, 'Success', statusCodes.OK);
    } catch (error) {
      logger.error('listRiders - Error fetching riders.', error);
      responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    }

    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async updateRider(req: Request, res: Response) {
    // @ts-ignore
    const { userId, role_id } = req.user;
    const { id } = req.params;
    const requestBody = req.body;
    let responseData: typeof prepareJSONResponse = {};

    try {
      if (role_id !== predefinedRoles.Vendor.id && role_id !== predefinedRoles.Admin.id) {
        responseData = prepareJSONResponse({}, 'Access denied.', statusCodes.FORBIDDEN);
        return res.status(responseData.status).json(responseData);
      }

      const riderDetail = await this.riderDetailsModel.findOne({ where: { rider_id: id } });

      if (!riderDetail) {
        responseData = prepareJSONResponse({}, 'Rider not found.', statusCodes.NOT_FOUND);
        return res.status(responseData.status).json(responseData);
      }

      if (role_id === predefinedRoles.Vendor.id && riderDetail.vendor_id !== userId) {
        responseData = prepareJSONResponse(
          {},
          'Access denied. You can only update your own riders.',
          statusCodes.FORBIDDEN,
        );
        return res.status(responseData.status).json(responseData);
      }

      const userRecord = await this.usersModel.findOne({ where: { id } });
      if (!userRecord) {
        responseData = prepareJSONResponse({}, 'Rider user record not found.', statusCodes.NOT_FOUND);
        return res.status(responseData.status).json(responseData);
      }

      const { first_name, last_name, phone, status } = requestBody;

      if (first_name) userRecord.first_name = first_name;
      if (last_name) userRecord.last_name = last_name;
      if (phone) userRecord.phone = phone;
      if (status !== undefined) {
        userRecord.status = status;
        riderDetail.status = status;
        await riderDetail.save();
      }

      await userRecord.save();

      responseData = prepareJSONResponse({}, 'Rider updated successfully.', statusCodes.OK);
    } catch (error) {
      logger.error('updateRider - Error updating rider.', error);
      responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    }
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async deleteRider(req: Request, res: Response) {
    // @ts-ignore
    const { userId, role_id } = req.user;
    const { id } = req.params;
    let responseData: typeof prepareJSONResponse = {};

    try {
      if (role_id !== predefinedRoles.Vendor.id && role_id !== predefinedRoles.Admin.id) {
        responseData = prepareJSONResponse({}, 'Access denied.', statusCodes.FORBIDDEN);
        return res.status(responseData.status).json(responseData);
      }

      const riderDetail = await this.riderDetailsModel.findOne({ where: { rider_id: id } });

      if (!riderDetail) {
        responseData = prepareJSONResponse({}, 'Rider not found.', statusCodes.NOT_FOUND);
        return res.status(responseData.status).json(responseData);
      }

      if (role_id === predefinedRoles.Vendor.id && riderDetail.vendor_id !== userId) {
        responseData = prepareJSONResponse(
          {},
          'Access denied. You can only delete your own riders.',
          statusCodes.FORBIDDEN,
        );
        return res.status(responseData.status).json(responseData);
      }

      // Soft delete (deactivate)
      const userRecord = await this.usersModel.findOne({ where: { id } });
      if (userRecord) {
        userRecord.status = 0;
        userRecord.is_deactivated = 1;
        await userRecord.save();
      }

      riderDetail.status = 0;
      await riderDetail.save();

      responseData = prepareJSONResponse({}, 'Rider deactivated successfully.', statusCodes.OK);
    } catch (error) {
      logger.error('deleteRider - Error deleting rider.', error);
      responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    }
    return res.status(responseData.status).json(responseData);
  }
}
