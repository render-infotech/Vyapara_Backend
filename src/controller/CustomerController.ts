import { Request, Response } from 'express';
import { predefinedRoles, statusCodes } from '../utils/constants';
import logger from '../utils/logger.js';
import { prepareJSONResponse } from '../utils/utils';
import SqlError from '../errors/sqlError';
import UsersModel from '../models/users';
import CustomerDetailsModel from '../models/customerDetails';
import CustomerAddressModel from '../models/customerAddress';
import DigitalPurchaseModel from '../models/digitalPurchase';
import MaterialRateModel from '../models/materialRate';
import TaxRateModel from '../models/taxRate';
import ServiceFeeRateModel from '../models/serviceFeeRate';
import DigitalHoldingModel from '../models/digitalHolding';

import { Op } from 'sequelize';

export default class CustomersController {
  // @ts-ignore
  private usersModel: UsersModel;

  // @ts-ignore
  private customerDetailsModel: CustomerDetailsModel;

  // @ts-ignore
  private customerAddressModel: CustomerAddressModel;

  // @ts-ignore
  private digitalPurchaseModel: DigitalPurchaseModel;

  // @ts-ignore
  private materialRateModel: MaterialRateModel;

  // @ts-ignore
  private taxRateModel: TaxRateModel;

  // @ts-ignore
  private serviceFeeRateModel: ServiceFeeRateModel;

  // @ts-ignore
  private digitalHoldingModel: DigitalHoldingModel;

  constructor(
    // @ts-ignore
    usersModel: UsersModel,
    // @ts-ignore
    customerDetailsModel: CustomerDetailsModel,
    // @ts-ignore
    customerAddressModel: CustomerAddressModel,
    // @ts-ignore
    digitalPurchaseModel: DigitalPurchaseModel,
    // @ts-ignore
    materialRateModel: MaterialRateModel,
    // @ts-ignore
    taxRateModel: TaxRateModel,
    // @ts-ignore
    serviceFeeRateModel: ServiceFeeRateModel,
    // @ts-ignore
    digitalHoldingModel: DigitalHoldingModel,
  ) {
    this.usersModel = usersModel;
    this.customerDetailsModel = customerDetailsModel;
    this.customerAddressModel = customerAddressModel;
    this.digitalPurchaseModel = digitalPurchaseModel;
    this.materialRateModel = materialRateModel;
    this.taxRateModel = taxRateModel;
    this.serviceFeeRateModel = serviceFeeRateModel;
    this.digitalHoldingModel = digitalHoldingModel;
  }

  // eslint-disable-next-line class-methods-use-this
  async createCustomer(data: any) {
    try {
      const customerDetails = await this.customerDetailsModel.create(data);
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
        const userWhere: any = {
          id: requestBody?.id,
          role_id: predefinedRoles.User.id,
          is_deactivated: 0,
          status: 1,
        };
        const recordExists = await this.usersModel.findOne({ where: userWhere });
        if (!recordExists) {
          responseData = prepareJSONResponse({}, 'User not found', statusCodes.NOT_FOUND);
        } else {
          const existingDetails = await this.customerDetailsModel.findOne({
            where: { customer_id: requestBody.id },
          });
          responseData = prepareJSONResponse({}, 'Customer details already exist', statusCodes.BAD_REQUEST);
          if (!existingDetails) {
            const newData = await this.createCustomer({
              customer_id: requestBody.id,
              nominee_name: requestBody.nominee_name || null,
              nominee_phone_country_code: requestBody.nominee_phone_country_code || null,
              nominee_phone_code: requestBody.nominee_phone_code || null,
              nominee_phone: requestBody.nominee_phone || null,
            });
            logger.info(`createCustomerDetails - Added new entry: ${JSON.stringify(newData)} }`);
            responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
          }
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
    const requestBody = req.query;
    let responseData: typeof prepareJSONResponse = {};
    try {
      const userWhere: any = {
        status: 1,
        role_id: predefinedRoles?.User?.id,
      };
      if (requestBody.customer_id) {
        userWhere.id = requestBody.customer_id;
      }
      if (requestBody.user_verified) {
        userWhere.user_verified = requestBody.user_verified;
      }
      if (requestBody.is_deactivated) {
        userWhere.is_deactivated = requestBody.is_deactivated;
      }
      if (requestBody.name) {
        userWhere.first_name = { [Op.like]: `%${requestBody.name}%` };
      }
      if (requestBody.email) {
        userWhere.email = { [Op.like]: `%${requestBody.email}%` };
      }
      const customerWhere: any = {};

      const customerRecords = await this.customerDetailsModel.findAll({
        where: customerWhere,
        include: [
          {
            model: this.usersModel,
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
            include: [
              {
                model: this.customerAddressModel,
                as: 'customerAddress',
                attributes: { exclude: ['status', 'created_at', 'updated_at'] },
              },
            ],
          },
        ],
        attributes: { exclude: ['created_at', 'updated_at'] },
        order: [[{ model: this.usersModel, as: 'user' }, 'first_name', 'ASC']],
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
              address: customer?.user?.customerAddress,
            };
          }),
        );

        let allCustomersData: any;
        if (requestBody.customer_id) {
          allCustomersData = mappedCustomerData[0];
        } else {
          allCustomersData = mappedCustomerData;
        }
        responseData = prepareJSONResponse(allCustomersData, 'Success', statusCodes.OK);
      }
    } catch (error) {
      logger.error('Error retrieving Customer data in getCustomer.', error);
      responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    }
    logger.info(`getCustomer - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
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
        const customerWhere: any = {
          customer_id: requestBody?.customer_id,
        };
        const recordExists = await this.customerDetailsModel.findOne({ where: customerWhere });
        if (!recordExists) {
          responseData = prepareJSONResponse({}, 'Customer not found', statusCodes.NOT_FOUND);
        } else {
          const newData = await recordExists.update({
            nominee_name: requestBody?.nominee_name,
            nominee_phone_country_code: requestBody?.nominee_phone_country_code,
            nominee_phone_code: requestBody?.nominee_phone_code,
            nominee_phone: requestBody?.nominee_phone,
          });
          logger.info(`updateCustomerDetails - Updated the entry: ${JSON.stringify(newData)} }`);
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
        const userWhere: any = {
          id: requestBody.customer_id,
          role_id: predefinedRoles.User.id,
          status: 1,
        };
        const recordExists = await this.usersModel.findOne({
          where: userWhere,
        });
        responseData = prepareJSONResponse({}, 'Customer does not exists.', statusCodes.BAD_REQUEST);
        if (recordExists) {
          if (!recordExists.is_deactivated) {
            responseData = prepareJSONResponse({}, 'Customer already activated.', statusCodes.BAD_REQUEST);
          } else {
            recordExists.is_deactivated = 0;
            const newData = await recordExists.save();
            logger.info(`reactivateCustomer - Updated the entry: ${JSON.stringify(newData)} }`);
            responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
          }
        }
      } catch (error) {
        logger.error('reactivateCustomer - Error reactivating customer.', error);
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
        const userWhere: any = {
          id: requestBody.customer_id,
          role_id: predefinedRoles.User.id,
          status: 1,
        };
        const recordExists = await this.usersModel.findOne({
          where: userWhere,
        });
        responseData = prepareJSONResponse({}, 'Customer does not exists.', statusCodes.BAD_REQUEST);
        if (recordExists) {
          if (recordExists.is_deactivated) {
            responseData = prepareJSONResponse({}, 'Customer already deactivated.', statusCodes.BAD_REQUEST);
          } else {
            recordExists.is_deactivated = 1;
            const newData = await recordExists.save();
            logger.info(`deactivateCustomer - Updated the entry: ${JSON.stringify(newData)} }`);
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
        const userWhere: any = {
          id: requestBody.customer_id,
          role_id: predefinedRoles.User.id,
        };
        const recordExists = await this.usersModel.findOne({
          where: userWhere,
        });
        responseData = prepareJSONResponse({}, 'Customer does not exists.', statusCodes.BAD_REQUEST);
        if (recordExists) {
          recordExists.is_deactivated = 1;
          recordExists.status = 0;
          const newData = await recordExists.save();
          logger.info(`deleteCustomer - Updated the entry: ${JSON.stringify(newData)} }`);
          responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
        }
      } catch (error) {
        logger.error('deleteCustomer - Error deleting customer:', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(`Delete Customer Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async createCustomerAddress(req: Request, res: Response) {
    const requestBody = req.body;
    const mandatoryFields = [
      'customer_id',
      'full_name',
      'phone_country_code',
      'phone_code',
      'phone',
      'country',
      'state',
      'city',
      'address_line_1',
      'pincode',
    ];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};

    if (missingFields.length > 0) {
      const message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const userWhere: any = {
          id: requestBody.customer_id,
          role_id: predefinedRoles.User.id,
        };
        const recordExists = await this.usersModel.findOne({
          where: userWhere,
        });
        if (!recordExists) {
          responseData = prepareJSONResponse({}, 'Customer not found', statusCodes.NOT_FOUND);
        } else {
          const defaultExists = await this.customerAddressModel.findOne({
            where: { customer_id: requestBody.customer_id, is_default: 1 },
          });

          if (Number(requestBody.is_default) === 1) {
            await this.customerAddressModel.update(
              { is_default: 0 },
              { where: { customer_id: requestBody.customer_id } },
            );
          }

          const shouldBeDefault = !defaultExists || Number(requestBody.is_default) === 1 ? 1 : 0;

          const newData = await this.customerAddressModel.create({
            customer_id: requestBody.customer_id,
            full_name: requestBody.full_name,
            phone_country_code: requestBody.phone_country_code,
            phone_code: requestBody.phone_code,
            phone: requestBody.phone,
            country: requestBody.country,
            state: requestBody.state,
            city: requestBody.city,
            address_line_1: requestBody.address_line_1,
            address_line_2: requestBody.address_line_2 || '',
            landmark: requestBody.landmark || null,
            pincode: requestBody.pincode,
            geo_location: requestBody.geo_location || null,
            address_type: requestBody.address_type || 'Other',
            is_default: shouldBeDefault,
            status: 1,
          });
          logger.info(`createCustomerAddress - Added new entry: ${JSON.stringify(newData)} }`);
          responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
        }
      } catch (error) {
        logger.error('createCustomerAddress - Error creating Customer Address.', error);
        throw new SqlError(error);
      }
    }
    logger.info(
      `createCustomerAddress - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async getCustomerAddresses(req: Request, res: Response) {
    const requestBody = req.query;
    const mandatoryFields = ['customer_id'];
    if (requestBody.id) {
      mandatoryFields.push('id');
    }
    const missingFields = mandatoryFields.filter(
      (field) => requestBody[field] === undefined || requestBody[field] === null || requestBody[field] === '',
    );
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';

    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const userWhere: any = {
          id: requestBody.customer_id,
          role_id: predefinedRoles.User.id,
          is_deactivated: 0,
          status: 1,
        };
        const addressWhere: any = {
          status: 1,
        };
        if (requestBody.id) {
          addressWhere.id = requestBody.id;
        }

        const recordExists = await this.usersModel.findOne({
          where: userWhere,
          include: [
            {
              model: this.customerAddressModel,
              as: 'customerAddress',
              where: addressWhere,
              attributes: { exclude: ['status', 'created_at', 'updated_at'] },
              order: [['full_name', 'ASC']],
            },
          ],
        });
        logger.info(`getCustomerAddresses - fetched addresses ${JSON.stringify(recordExists)}`);

        if (!recordExists) {
          responseData = prepareJSONResponse({}, 'Customer not found', statusCodes.NOT_FOUND);
        } else {
          if (recordExists?.customerAddress.length === 0) {
            responseData = prepareJSONResponse([], 'No address found.', statusCodes.NOT_FOUND);
          } else {
            let allCustomerAddress: any;
            if (requestBody.id) {
              allCustomerAddress = recordExists?.customerAddress[0];
            } else {
              allCustomerAddress = recordExists?.customerAddress;
            }
            responseData = prepareJSONResponse(allCustomerAddress, 'Success', statusCodes.OK);
          }
        }
      } catch (error) {
        logger.error('getCustomerAddresses - Error retrieving Customer Addresses.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }

    logger.info(`getCustomerAddresses - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async updateCustomerAddress(req: Request, res: Response) {
    const requestBody = req.body;
    const mandatoryFields = ['customer_id', 'id'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';

    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const recordExists = await this.customerAddressModel.findOne({
          where: { id: requestBody.id, customer_id: requestBody.customer_id, status: 1 },
        });

        if (!recordExists) {
          responseData = prepareJSONResponse({}, 'Address not found', statusCodes.NOT_FOUND);
        } else {
          if (requestBody.is_default) {
            await this.customerAddressModel.update(
              { is_default: false },
              { where: { customer_id: requestBody.customer_id } },
            );
          }

          const newData = await recordExists.update({
            full_name: requestBody.full_name ?? recordExists.full_name,
            phone_country_code: requestBody.phone_country_code ?? recordExists.phone_country_code,
            phone_code: requestBody.phone_code ?? recordExists.phone_code,
            phone: requestBody.phone ?? recordExists.phone,
            country: requestBody.country ?? recordExists.country,
            state: requestBody.state ?? recordExists.state,
            city: requestBody.city ?? recordExists.city,
            address_line_1: requestBody.address_line_1 ?? recordExists.address_line_1,
            address_line_2: requestBody.address_line_2 ?? recordExists.address_line_2,
            landmark: requestBody.landmark ?? recordExists.landmark,
            pincode: requestBody.pincode ?? recordExists.pincode,
            geo_location: requestBody.geo_location ?? recordExists.geo_location,
            address_type: requestBody.address_type ?? recordExists.address_type,
            is_default: requestBody.is_default ?? false,
          });
          logger.info(`updateCustomerAddress - updated entry ${JSON.stringify(newData)}`);
          responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
        }
      } catch (error) {
        logger.error('updateCustomerAddress - Error updating Customer Address.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(
      `updateCustomerAddress - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async deleteCustomerAddress(req: Request, res: Response) {
    const requestBody = req.body;
    const mandatoryFields = ['customer_id', 'id'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';

    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const recordExists = await this.customerAddressModel.findOne({
          where: { id: requestBody.id, customer_id: requestBody.customer_id },
        });
        if (!recordExists) {
          responseData = prepareJSONResponse({}, 'Address not found', statusCodes.NOT_FOUND);
        } else {
          const newData = await recordExists.update({ status: 0 });
          logger.info(`deleteCustomerAddress - soft deleted entry ${newData}`);
          responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
        }
      } catch (error) {
        logger.error('deleteCustomerAddress - Error deleting Customer Address.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(
      `deleteCustomerAddress - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }
}
