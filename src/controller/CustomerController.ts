import { Request, Response } from 'express';
import { predefinedRoles, statusCodes } from '../utils/constants';
import logger from '../utils/logger.js';
import { prepareJSONResponse } from '../utils/utils';
import SqlError from '../errors/sqlError';
import Users from '../models/users';
import CustomerDetails from '../models/customerDetails';
import { Op } from 'sequelize';

export default class CustomersController {
  // @ts-ignore
  private users: Users;

  // @ts-ignore
  private customerDetails: CustomerDetails;

  constructor(
    // @ts-ignore
    users: Users,
    // @ts-ignore
    customerDetails: CustomerDetails,
  ) {
    this.users = users;
    this.customerDetails = customerDetails;
  }

  async createCustomer(data: any) {
    try {
      const customerDetails = await this.customerDetails.create(data);
      return customerDetails;
    } catch (error) {
      logger.error('Error Exception in createCustomer.', error, data);
      throw new SqlError(error);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async createCustomerDetails(req: Request, res: Response) {
    const requestBody = req.body;
    const mandatoryFields = ['id'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';
    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const recordExists = await this.users.findOne({ where: { id: requestBody?.id } });
        if (!recordExists) {
          responseData = prepareJSONResponse({}, 'User not found', statusCodes.NOT_FOUND);
        } else {
          const existingDetails = await this.customerDetails.findOne({
            where: { customer_id: requestBody.id },
          });
          if (existingDetails) {
            responseData = prepareJSONResponse({}, 'Customer details already exist', statusCodes.BAD_REQUEST);
          }
          await this.createCustomer({
            customer_id: requestBody.id,
            nominee_name: requestBody.nominee_name || null,
            nominee_phone_country_code: requestBody.nominee_phone_country_code || null,
            nominee_phone_code: requestBody.nominee_phone_code || null,
            nominee_phone: requestBody.nominee_phone || null,
          });
          responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
        }
      } catch (error) {
        logger.error('Error creating Customer Details in createCustomerDetails.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(
      `createCustomerDetails - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async getCustomer(req: Request, res: Response) {
    const requestData = req.query;
    let responseData: typeof prepareJSONResponse = {};
    try {
      const userWhere: any = {
        status: 1,
        role_id: predefinedRoles?.User?.id,
      };
      if (requestData.customer_id) {
        userWhere.id = requestData.customer_id;
      }
      if (requestData.user_verified) {
        userWhere.user_verified = requestData.user_verified;
      }
      if (requestData.is_deactivated) {
        userWhere.is_deactivated = requestData.is_deactivated;
      }
      if (requestData.name) {
        userWhere.first_name = { [Op.like]: `%${requestData.name}%` };
      }
      if (requestData.email) {
        userWhere.email = { [Op.like]: `%${requestData.email}%` };
      }
      const customerWhere: any = {};

      const customerRecords = await this.customerDetails.findAll({
        where: customerWhere,
        include: [
          {
            model: this.users,
            as: 'user',
            where: userWhere,
            required: true,
            attributes: [
              'id',
              'first_name',
              'middle_name',
              'last_name',
              'profile_pic',
              'email',
              'phone_country_code',
              'phone_code',
              'phone',
              'gender',
              'dob',
              'status',
              'two_factor_enabled',
              'user_verified',
              'is_deactivated',
            ],
          },
        ],
        attributes: { exclude: ['created_at', 'updated_at'] },
        order: [[{ model: this.users, as: 'user' }, 'first_name', 'ASC']],
      });

      logger.info(`getCustomer - fetched customers ${JSON.stringify(customerRecords)}`);

      if (customerRecords.length === 0) {
        responseData = prepareJSONResponse([], 'No customer found.', statusCodes.NOT_FOUND);
      } else {
        const mappedCustomerData = await Promise.all(
          customerRecords.map(async (customer: any) => {
            return {
              id: customer?.id,
              customer_id: customer?.customer_id,
              customer_code: customer?.customer_code,
              first_name: customer?.user?.first_name || '',
              middle_name: customer?.user?.middle_name || '',
              last_name: customer?.user?.last_name || '',
              profile_pic: customer?.user?.profile_pic || '',
              email: customer?.user?.email || '',
              phone_country_code: customer?.user?.phone_country_code || '',
              phone_code: customer?.user?.phone_code || '',
              phone: customer?.user?.phone || '',
              gender: customer?.user?.gender || 1,
              dob: customer?.user?.dob || '',
              two_factor_enabled: customer?.user?.two_factor_enabled,
              user_verified: customer?.user?.user_verified,
              is_deactivated: customer?.user?.is_deactivated,
              nominee_name: customer?.nominee_name,
              nominee_phone_country_code: customer?.nominee_phone_country_code,
              nominee_phone_code: customer?.nominee_phone_code,
              nominee_phone: customer?.nominee_phone,
            };
          }),
        );

        let allCustomersData: any;
        if (requestData.customer_id) {
          allCustomersData = mappedCustomerData[0];
        } else {
          allCustomersData = mappedCustomerData;
        }
        responseData = prepareJSONResponse(allCustomersData, 'Success', statusCodes.OK);
      }
      logger.info(`getCustomer - Req and Res: ${JSON.stringify(requestData)} - ${JSON.stringify(responseData)}`);
    } catch (error) {
      logger.error('Error retrieving Customer data in getCustomer.', error);
      responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    }

    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async updateCustomerDetails(req: Request, res: Response) {
    const requestBody = req.body;
    const mandatoryFields = ['customer_id'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';
    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const recordExists = await this.customerDetails.findOne({ where: { customer_id: requestBody?.customer_id } });
        if (!recordExists) {
          responseData = prepareJSONResponse({}, 'Customer not found', statusCodes.NOT_FOUND);
        } else {
          await recordExists.update({
            nominee_name: requestBody?.nominee_name,
            nominee_phone_country_code: requestBody?.nominee_phone_country_code,
            nominee_phone_code: requestBody?.nominee_phone_code,
            nominee_phone: requestBody?.nominee_phone,
          });
          responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
        }
      } catch (error) {
        logger.error('Error updating Customer Details in updateCustomerDetails.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(
      `updateCustomerDetails - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async reactivateCustomer(req: Request, res: Response) {
    const requestBody = req.body;
    const mandatoryFields = ['customer_id'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';
    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const recordExists = await this.users.findOne({
          where: { id: requestBody.customer_id, role_id: predefinedRoles.User.id, status: 1 },
        });
        responseData = prepareJSONResponse({}, 'Customer does not exists.', statusCodes.BAD_REQUEST);
        if (recordExists) {
          if (!recordExists.is_deactivated) {
            responseData = prepareJSONResponse({}, 'Customer already activated.', statusCodes.BAD_REQUEST);
          } else {
            recordExists.is_deactivated = 0;
            await recordExists.save();
            responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
          }
        }
      } catch (error) {
        logger.error('reactivateCustomer - Error reactivating User.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(
      `reactivateCustomer - Reactivate Customer Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async deactivateCustomer(req: Request, res: Response) {
    const requestBody = req.body;
    const mandatoryFields = ['customer_id'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';
    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const recordExists = await this.users.findOne({
          where: { id: requestBody.customer_id, role_id: predefinedRoles.User.id, status: 1 },
        });
        responseData = prepareJSONResponse({}, 'Customer does not exists.', statusCodes.BAD_REQUEST);
        if (recordExists) {
          if (recordExists.is_deactivated) {
            responseData = prepareJSONResponse({}, 'Customer already deactivated.', statusCodes.BAD_REQUEST);
          } else {
            recordExists.is_deactivated = 1;
            await recordExists.save();
            responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
          }
        }
      } catch (error) {
        logger.error('deactivateCustomer - Error deactivating customer.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(
      `deactivateCustomer - Deactivate Customer Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async deleteCustomer(req: Request, res: Response) {
    const requestBody = req.body;
    const mandatoryFields = ['customer_id'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';
    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const recordExists = await this.users.findOne({
          where: { id: requestBody.customer_id, role_id: predefinedRoles.User.id, status: 1, is_deactivated: 0 },
        });
        responseData = prepareJSONResponse({}, 'Customer does not exists.', statusCodes.BAD_REQUEST);
        if (recordExists) {
          recordExists.is_deactivated = 1;
          recordExists.status = 0;
          await recordExists.save();
          responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
        }
      } catch (error) {
        logger.error('deleteUser - Error deleting customer:', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(`Delete Customer Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  //   // eslint-disable-next-line class-methods-use-this
  //   async deleteCustomerDetails(req: Request, res: Response) {
  //     const { customer_id } = req.params;
  //     let responseData: typeof prepareJSONResponse = {};
  //     try {
  //       if (!customer_id) {
  //         responseData = prepareJSONResponse({}, 'Missing required fields: customer_id', statusCodes.BAD_REQUEST);
  //       } else {
  //         const details = await this.customerDetails.findOne({ where: { customer_id } });
  //         if (!details) {
  //           responseData = prepareJSONResponse({}, 'Customer details not found', statusCodes.NOT_FOUND);
  //         } else {
  //           await details.destroy();
  //           responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
  //         }
  //       }
  //     } catch (error) {
  //       logger.error('Error deleting Customer Details in deleteCustomerDetails.', error);
  //       responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
  //     }
  //     logger.info(`deleteCustomerDetails - Req and Res: ${JSON.stringify(req.params)} - ${JSON.stringify(responseData)}`);
  //     return res.status(responseData.status).json(responseData);
  //   }
}
