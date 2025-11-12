import { Request, Response } from 'express';
import { predefinedRoles, predefinedTaxType, statusCodes } from '../utils/constants';
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
  ) {
    this.usersModel = usersModel;
    this.customerDetailsModel = customerDetailsModel;
    this.customerAddressModel = customerAddressModel;
    this.digitalPurchaseModel = digitalPurchaseModel;
    this.materialRateModel = materialRateModel;
    this.taxRateModel = taxRateModel;
    this.serviceFeeRateModel = serviceFeeRateModel;
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
  async safeNum(val: any) {
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
  }

  // eslint-disable-next-line class-methods-use-this
  async readablePercentageChange(num: number | null) {
    if (num === null || !Number.isFinite(num)) return null;
    const fixed = Number(num.toFixed(5));
    return `${fixed >= 0 ? '+' : ''}${fixed}%`;
  }

  // eslint-disable-next-line class-methods-use-this
  async getLatestAppliedTaxRate(material_id: number, appliedDate: string, tax_on?: number) {
    const result: any = {};

    try {
      if (!material_id || !appliedDate) {
        logger.info('getLatestAppliedTaxRate - Missing required params');
        result.latest_tax = null;
        return result;
      }

      const whereCondition: any = {
        material_id,
        tax_type: predefinedTaxType.GST.id,
        status: 1,
        effective_date: { [Op.lte]: appliedDate },
      };

      if (tax_on) {
        whereCondition.tax_on = tax_on;
      }

      const latestTax = await this.taxRateModel.findOne({
        where: whereCondition,
        order: [
          ['effective_date', 'DESC'],
          ['created_at', 'DESC'],
        ],
      });

      if (!latestTax) {
        logger.info(`getLatestAppliedTaxRate - No available tax for material: ${material_id}`);
        result.latest_tax = null;
      } else {
        result.latest_tax = {
          id: latestTax.id,
          tax_type: latestTax.tax_type,
          tax_percentage: latestTax.tax_percentage,
          tax_on: latestTax.tax_on,
          effective_date: latestTax.effective_date,
        };
        logger.info(`getLatestAppliedTaxRate - Success: ${JSON.stringify(result.latest_tax)}`);
      }
    } catch (error) {
      logger.error(`getLatestAppliedTaxRate - Error: ${(error as Error).message}`);
      result.latest_tax = null;
    }

    return result;
  }

  // eslint-disable-next-line class-methods-use-this
  async getLiveMaterialPrice(material_id: number) {
    const result: any = {};

    try {
      if (!material_id) {
        logger.info('getLiveMaterialPrice - Missing required params');
        result.live_price = null;
        return result;
      }

      const rate = await this.materialRateModel.findOne({
        where: { material_id, status: 1, is_latest: 1 },
        order: [['created_at', 'DESC']],
      });

      if (!rate) {
        logger.info(`getLiveMaterialPrice - No live price found for material: ${material_id}`);
        result.live_price = null;
      } else {
        result.live_price = {
          id: rate.id,
          price_per_gram: rate.price_per_gram,
        };
        logger.info(`getLiveMaterialPrice - Success: ${JSON.stringify(result.live_price)}`);
      }
    } catch (error) {
      logger.error(`getLiveMaterialPrice - Error: ${(error as Error).message}`);
      result.live_price = null;
    }

    return result;
  }

  // eslint-disable-next-line class-methods-use-this
  async getApplicableServiceFeeRate(material_id: number, amount: number, appliedDate: string) {
    const result: any = {};

    try {
      if (!material_id || !amount || !appliedDate) {
        logger.info('getApplicableServiceFeeRate - Missing params');
        result.service_fee = null;
        return result;
      }

      const whereCondition: any = {
        material_id,
        status: 1,
        effective_date: { [Op.lte]: appliedDate },
      };

      const feeRate = await this.serviceFeeRateModel.findOne({
        where: whereCondition,
        order: [
          ['effective_date', 'DESC'],
          ['created_at', 'DESC'],
        ],
      });

      if (!feeRate) {
        logger.info(`getApplicableServiceFeeRate - Not found for amount: ${amount}`);
        result.service_fee = null;
      } else {
        result.service_fee = {
          id: feeRate.id,
          service_fee_rate: feeRate.service_fee_rate,
          effective_date: feeRate.effective_date,
        };
        logger.info(`getApplicableServiceFeeRate - Success: ${JSON.stringify(result.service_fee)}`);
      }
    } catch (error) {
      logger.error(`getApplicableServiceFeeRate - Error: ${(error as Error).message}`);
      result.service_fee = null;
    }

    return result;
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

  // // eslint-disable-next-line class-methods-use-this
  // async createDigitalPurchase(req: Request, res: Response) {
  //   const requestBody = req.body;
  //   const {
  //     customer_id,
  //     material_id,
  //     amount,
  //     price_per_gram,
  //     tax_percentage,
  //     tax_amount,
  //     service_charge,
  //     total_amount,
  //     payment_type_id,
  //   } = requestBody;
  //   const mandatoryFields = [
  //     'customer_id',
  //     'material_id',
  //     'amount',
  //     'price_per_gram',
  //     'tax_percentage',
  //     'tax_amount',
  //     'service_charge',
  //     'total_amount',
  //     'payment_type_id',
  //   ];
  //   const missingFields = mandatoryFields.filter((field) => !requestBody[field]);

  //   let responseData: typeof prepareJSONResponse = {};
  //   let message = 'Missing required fields';

  //   if (missingFields.length > 0) {
  //     message = `Missing required fields: ${missingFields.join(', ')}`;
  //     responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
  //   } else {
  //     try {
  //       const customerWhere: any = {
  //         customer_id,
  //       };

  //       const recordExists = await this.customerDetailsModel.findOne({
  //         where: { customerWhere },
  //       });

  //       if (!recordExists) {
  //         responseData = prepareJSONResponse({}, 'Customer not found', statusCodes.NOT_FOUND);
  //       } else {
  //         const newPurchase = await this.digitalPurchaseModel.create({
  //           customer_id,
  //         });

  //         logger.info(`createDigitalPurchase - Added new entry: ${JSON.stringify(newPurchase)}`);
  //         responseData = prepareJSONResponse(newPurchase, 'Success', statusCodes.OK);
  //       }
  //     } catch (error) {
  //       logger.error('Error creating Digital Purchase in createDigitalPurchase.', error);
  //       responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
  //     }
  //   }

  //   logger.info(
  //     `createDigitalPurchase - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
  //   );
  //   return res.status(responseData.status).json(responseData);
  // }

  // eslint-disable-next-line class-methods-use-this
  async getDigitalPurchasePreview(req: Request, res: Response) {
    const requestBody = req.body;
    const mandatoryFields = ['customer_id', 'material_id', 'amount', 'date'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';

    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const customer_id = requestBody.customer_id;
        const material_id = Number(requestBody.material_id);
        const amountNum = Number(requestBody.amount);
        const appliedDate = requestBody.date;

        if (Number.isNaN(amountNum) || amountNum <= 0) {
          responseData = prepareJSONResponse({}, 'Invalid amount', statusCodes.BAD_REQUEST);
          return res.status(responseData.status).json(responseData);
        }

        const livePrice = await this.getLiveMaterialPrice(material_id);
        if (!livePrice.live_price) {
          responseData = prepareJSONResponse({}, 'Material price not found', statusCodes.NOT_FOUND);
          return res.status(responseData.status).json(responseData);
        }
        const price_per_gram = await this.safeNum(livePrice.live_price.price_per_gram);

        const materialTaxResult = await this.getLatestAppliedTaxRate(material_id, appliedDate, 1);
        const serviceTaxResult = await this.getLatestAppliedTaxRate(material_id, appliedDate, 2);

        const tax_percentage_material = materialTaxResult?.latest_tax
          ? Number(materialTaxResult.latest_tax.tax_percentage)
          : 0;

        const tax_percentage_service = serviceTaxResult?.latest_tax
          ? Number(serviceTaxResult.latest_tax.tax_percentage)
          : 0;

        const feeResult = await this.getApplicableServiceFeeRate(material_id, amountNum, appliedDate);
        if (!feeResult.service_fee) {
          responseData = prepareJSONResponse({}, 'Service fee rate not found', statusCodes.NOT_FOUND);
          return res.status(responseData.status).json(responseData);
        }
        const service_fee_rate = Number(feeResult.service_fee.service_fee_rate);

        const grams_purchased_num = amountNum / price_per_gram;
        const grams_purchased = Number(grams_purchased_num.toFixed(6));

        const service_fee_num = (amountNum * service_fee_rate) / 100;
        const service_fee = Number(service_fee_num.toFixed(2));

        const tax_on_material = (amountNum * tax_percentage_material) / 100;

        const tax_on_service = (service_fee * tax_percentage_service) / 100;

        const total_taxable_value = Number((amountNum + service_fee).toFixed(2));
        const total_tax_amount = Number((tax_on_material + tax_on_service).toFixed(2));

        const total_amount_num = amountNum + total_tax_amount + service_fee;
        const total_amount = Number(total_amount_num.toFixed(2));

        const preview = {
          customer_id,
          material_id,
          price_per_gram,
          grams_purchased,
          amount: amountNum,
          service_fee_rate: await this.readablePercentageChange(service_fee_rate),
          service_fee,
          total_taxable_value,
          tax_amount_material: Number(tax_on_material.toFixed(2)),
          tax_amount_service_fee: Number(tax_on_service.toFixed(2)),
          total_tax_amount,
          tax_rate_material: await this.readablePercentageChange(tax_percentage_material),
          tax_rate_service_fee: await this.readablePercentageChange(tax_percentage_service),
          total_amount,
          date: appliedDate,
          preview_generated_at: new Date(),
        };

        logger.info(`getDigitalPurchasePreview - Response: ${JSON.stringify(preview)}`);
        responseData = prepareJSONResponse(preview, 'Success', statusCodes.OK);
      } catch (error) {
        logger.error('getDigitalPurchasePreview - Error creating Digital Purchase .', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }

    logger.info(
      `getDigitalPurchasePreview - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async createDigitalPurchase(req: Request, res: Response) {
    const requestBody = req.body;
    const mandatoryFields = [
      'customer_id',
      'material_id',
      'amount',
      'date',
      'price_per_gram',
      'tax_rate_material',
      'tax_rate_service_fee',
      'service_fee_rate',
      'total_amount',
      'preview_generated_at',
    ];

    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';

    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const {
          customer_id,
          material_id,
          amount,
          date,
          price_per_gram,
          tax_rate_material,
          tax_rate_service_fee,
          service_fee_rate,
          total_amount,
          preview_generated_at,
        } = requestBody;

        const materialIdNum = Number(material_id);
        const amountNum = Number(amount);

        const recordExists = await this.usersModel.findOne({
          where: {
            id: customer_id,
            role_id: predefinedRoles.User.id,
            is_deactivated: 0,
            status: 1,
          },
        });

        if (!recordExists) {
          responseData = prepareJSONResponse({}, 'User not found', statusCodes.NOT_FOUND);
          return res.status(responseData.status).json(responseData);
        }

        if (preview_generated_at) {
          const previewTime = new Date(preview_generated_at);
          const diffMs = Date.now() - previewTime.getTime();
          const diffMinutes = diffMs / 60000;
          if (diffMinutes > 5) {
            responseData = prepareJSONResponse(
              {},
              'Preview expired. Please refresh rates before proceeding.',
              statusCodes.BAD_REQUEST,
            );
            return res.status(responseData.status).json(responseData);
          }
        }

        const livePrice = await this.getLiveMaterialPrice(materialIdNum);
        if (!livePrice.live_price) {
          responseData = prepareJSONResponse({}, 'Material price not found', statusCodes.NOT_FOUND);
          return res.status(responseData.status).json(responseData);
        }

        const latest_price_per_gram = await this.safeNum(livePrice.live_price.price_per_gram);
        const appliedDate = date;

        const materialTax = await this.getLatestAppliedTaxRate(materialIdNum, appliedDate, 1);
        const serviceTax = await this.getLatestAppliedTaxRate(materialIdNum, appliedDate, 2);
        const feeRate = await this.getApplicableServiceFeeRate(materialIdNum, amountNum, appliedDate);

        const latestMaterialTaxRate = Number(materialTax?.latest_tax?.tax_percentage || 0);
        const latestServiceTaxRate = Number(serviceTax?.latest_tax?.tax_percentage || 0);
        const latestServiceFeeRate = Number(feeRate?.service_fee?.service_fee_rate || 0);

        const prevMaterialTax = Number(String(tax_rate_material || '0').replace(/[+%]/g, ''));
        const prevServiceTax = Number(String(tax_rate_service_fee || '0').replace(/[+%]/g, ''));
        const prevServiceFee = Number(String(service_fee_rate || '0').replace(/[+%]/g, ''));

        const mismatches: string[] = [];

        if (latest_price_per_gram !== Number(price_per_gram))
          mismatches.push(`Price per gram mismatch: expected ₹${latest_price_per_gram}, received ₹${price_per_gram}`);

        if (latestMaterialTaxRate !== prevMaterialTax)
          mismatches.push(`Material tax mismatch: expected ${latestMaterialTaxRate}%, received ${prevMaterialTax}%`);

        if (latestServiceTaxRate !== prevServiceTax)
          mismatches.push(`Service tax mismatch: expected ${latestServiceTaxRate}%, received ${prevServiceTax}%`);

        if (latestServiceFeeRate !== prevServiceFee)
          mismatches.push(`Service fee rate mismatch: expected ${latestServiceFeeRate}%, received ${prevServiceFee}%`);

        if (mismatches.length > 0) {
          responseData = prepareJSONResponse(
            {
              recheck_required: true,
              mismatch_summary: mismatches,
              latest_values: {
                price_per_gram: latest_price_per_gram,
                tax_rate_material: latestMaterialTaxRate,
                tax_rate_service_fee: latestServiceTaxRate,
                service_fee_rate: latestServiceFeeRate,
              },
            },
            'Rate integrity failed — please regenerate preview.',
            statusCodes.FORBIDDEN,
          );
          return res.status(responseData.status).json(responseData);
        }

        const grams_purchased = Number((amountNum / latest_price_per_gram).toFixed(6));
        const service_fee = Number(((amountNum * latestServiceFeeRate) / 100).toFixed(2));
        const tax_on_material = Number(((amountNum * latestMaterialTaxRate) / 100).toFixed(2));
        const tax_on_service = Number(((service_fee * latestServiceTaxRate) / 100).toFixed(2));
        const total_tax_amount = Number((tax_on_material + tax_on_service).toFixed(2));
        const recalculated_total = Number((amountNum + service_fee + total_tax_amount).toFixed(2));

        if (Number(total_amount) !== recalculated_total) {
          responseData = prepareJSONResponse(
            {},
            `Integrity check failed — total mismatch. Expected ₹${recalculated_total}, received ₹${total_amount}`,
            statusCodes.BAD_REQUEST,
          );
          return res.status(responseData.status).json(responseData);
        }

        const newPurchase = await this.digitalPurchaseModel.create({
          customer_id,
          transaction_type_id: 1,
          material_id: materialIdNum,
          amount: amountNum,
          price_per_gram: latest_price_per_gram,
          grams_purchased,
          tax_rate_material: `+${latestMaterialTaxRate}%`,
          tax_amount_material: tax_on_material,
          tax_rate_service: `+${latestServiceTaxRate}%`,
          tax_amount_service: tax_on_service,
          total_tax_amount,
          service_fee_rate: `+${latestServiceFeeRate}%`,
          service_fee,
          total_amount: recalculated_total,
          purchase_status: 1,
          rate_timestamp: preview_generated_at,
        });
        logger.info(`createDigitalPurchase - Added new entry: ${JSON.stringify(newPurchase)} }`);
        responseData = prepareJSONResponse({ purchase_code: newPurchase?.purchase_code }, 'Success', statusCodes.OK);
      } catch (error) {
        logger.error('createDigitalPurchase - Error creating Digital Purchase .', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }

    logger.info(
      `createDigitalPurchase - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async getDigitalPurchase(req: Request, res: Response) {
    const requestBody = req.query;
    const mandatoryFields = ['customer_id'];
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

        const customerWhere: any = {};

        const customerRecords = await this.usersModel.findOne({
          where: userWhere,
          include: [
            {
              model: this.customerDetailsModel,
              as: 'customerDetails',
              where: customerWhere,
              required: true,
              attributes: ['customer_code'],
            },
            {
              model: this.digitalPurchaseModel,
              as: 'digitalPurchase',
              attributes: {
                exclude: [
                  'customer_id',
                  'transaction_type_id',
                  'rate_timestamp',
                  'remarks',
                  'created_at',
                  'updated_at',
                ],
              },
            },
          ],
          attributes: { exclude: ['created_at', 'updated_at'] },
        });
        logger.info(`getDigitalPurchase - fetched customers ${JSON.stringify(customerRecords)}`);
        if (customerRecords.length === 0) {
          responseData = prepareJSONResponse([], 'No customer found.', statusCodes.NOT_FOUND);
        } else {
          const allDigitalPurchases = customerRecords?.digitalPurchase;

          responseData = prepareJSONResponse(allDigitalPurchases, 'Success', statusCodes.OK);
        }
      } catch (error) {
        logger.error('getDigitalPurchase - Error retrieving Customer digital purchase.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(`getDigitalPurchase - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }
}
