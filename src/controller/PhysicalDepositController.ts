import { Request, Response } from 'express';
import { prepareJSONResponse } from '../utils/utils';
import { statusCodes } from '../utils/constants';
import logger from '../utils/logger.js';
import UsersModel from '../models/users';
import PhysicalDepositModel from '../models/physicalDeposit';
import PhysicalDepositProductsModel from '../models/physicalDepositProducts';
import CustomerDetailsModel from '../models/customerDetails';
import VendorDetailsModel from '../models/vendorDetails';
import MaterialRateModel from '../models/materialRate';

export default class PhysicalDepositController {
  // @ts-ignore
  private physicalDepositModel: PhysicalDepositModel;

  // @ts-ignore
  private physicalDepositProductsModel: PhysicalDepositProductsModel;

  // @ts-ignore
  private usersModel: UsersModel;

  // @ts-ignore
  private customerDetailsModel: CustomerDetailsModel;

  // @ts-ignore
  private vendorDetailsModel: VendorDetailsModel;

  // @ts-ignore
  private materialRateModel: MaterialRateModel;

  sequelize: any;

  constructor(
    // @ts-ignore
    physicalDepositModel: PhysicalDepositModel,
    // @ts-ignore
    physicalDepositProductsModel: PhysicalDepositProductsModel,
    // @ts-ignore
    usersModel: UsersModel,
    // @ts-ignore
    customerDetailsModel: CustomerDetailsModel,
    // @ts-ignore
    vendorDetailsModel: VendorDetailsModel,
    // @ts-ignore
    materialRateModel: MaterialRateModel,
  ) {
    this.physicalDepositModel = physicalDepositModel;
    this.physicalDepositProductsModel = physicalDepositProductsModel;
    this.usersModel = usersModel;
    this.customerDetailsModel = customerDetailsModel;
    this.vendorDetailsModel = vendorDetailsModel;
    this.materialRateModel = materialRateModel;
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
  async convertToIST(dateString: string) {
    try {
      if (!dateString) return null;

      const date = new Date(dateString);

      if (isNaN(date.getTime())) {
        logger.error(`convertToIST: Invalid date string received -> ${dateString}`);
        return null;
      }

      const istString = date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
      });

      const [datePart, timePart] = istString.split(', ');

      return {
        date: datePart,
        time: timePart,
      };
    } catch (error: any) {
      logger.error(`convertToIST error: ${error.message}`, { error });
      return null;
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async validateDateRange(start_date?: string, end_date?: string) {
    const result: {
      isValid: boolean;
      start: Date | null;
      end: Date | null;
      error: string | null;
    } = {
      isValid: true,
      start: null,
      end: null,
      error: null,
    };

    try {
      if (!start_date && !end_date) {
        return result;
      }

      const start = start_date ? new Date(`${start_date}T00:00:00.000Z`) : null;
      const end = end_date ? new Date(`${end_date}T23:59:59.999Z`) : null;

      const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime());

      if ((start_date && !isValidDate(start)) || (end_date && !isValidDate(end))) {
        result.isValid = false;
        result.error = 'Invalid date. Expected format YYYY-MM-DD';
        return result;
      }

      if (start && end && start > end) {
        result.isValid = false;
        result.error = `Invalid date range. start_date (${start_date}) must be less than or equal to end_date (${end_date}).`;
        return result;
      }

      result.start = start;
      result.end = end;
    } catch (error: any) {
      result.isValid = false;
      result.error = 'Unexpected error during date validation.';
      logger.error('validateDateRange - Error in dates .', error);
    }

    return result;
  }

  // eslint-disable-next-line class-methods-use-this
  async createPhysicalDeposit(req: Request, res: Response) {
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
        responseData = prepareJSONResponse({}, 'Success.', statusCodes.BAD_REQUEST);
      } catch (error) {
        logger.error('createPhysicalDeposit - Error creating physical deposit.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(
      `createPhysicalDeposit - Physical Deposit Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }
}
