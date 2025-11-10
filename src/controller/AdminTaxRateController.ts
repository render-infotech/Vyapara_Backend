import { Request, Response } from 'express';
import TaxRateModel from '../models/taxRate';
import { predefinedTaxType, statusCodes } from '../utils/constants';
import { prepareJSONResponse } from '../utils/utils.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';

export default class AdminTaxRateController {
  // @ts-ignore
  private taxRateModel: TaxRateModel;

  // @ts-ignore
  constructor(
    // @ts-ignore
    taxRateModel: TaxRateModel,
  ) {
    this.taxRateModel = taxRateModel;
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
  async materialRateHistory(records = []) {
    const historyResult: any = {};

    if (!records || records.length === 0) {
      logger.info(`materialRateHistory - No rate records found ${JSON.stringify(records)}`);
      historyResult.history = [];
      return historyResult;
    }

    const latestPrice = await this.safeNum(records[0].price_per_gram);

    const formattedHistory = await Promise.all(
      records.map(async (rate, index) => {
        const price = await this.safeNum(rate.price_per_gram);
        const createdAt = new Date(rate.created_at);

        const date = createdAt.toISOString().split('T')[0];
        const time = createdAt.toTimeString().split(' ')[0];

        const previous = records[index + 1];
        const prevPrice = previous ? await this.safeNum(previous.price_per_gram) : null;

        let changeFromPrevious: string | null = null;
        if (prevPrice !== null && price !== null) {
          const diff = ((price - prevPrice) / prevPrice) * 100;
          changeFromPrevious = await this.readablePercentageChange(diff);
        }

        let changeFromToday: string | null = null;
        if (latestPrice !== null && price !== null) {
          const diff = ((price - latestPrice) / latestPrice) * 100;
          changeFromToday = await this.readablePercentageChange(diff);
        }

        if (index === 0) changeFromToday = '+0.00%';

        return {
          date,
          time,
          price_per_gram: price,
          prev_change: changeFromPrevious,
          today_change: changeFromToday,
        };
      }),
    );

    historyResult.history = formattedHistory;
    logger.info(`materialRateHistory - Success ${formattedHistory.length} records`);

    return historyResult;
  }

  // eslint-disable-next-line class-methods-use-this
  async calculateOverallChange(records = [], limit = 5) {
    const filterData: any = {};

    if (!records || records.length < 2) {
      logger.info(
        `calculateOverallChange - Not enough data to calculate overall percentage change for ${JSON.stringify(records)} ${JSON.stringify(limit)} `,
      );
      filterData.overall_change_percentage = null;
      return filterData;
    }

    const latestPrice = await this.safeNum(records[0]?.price_per_gram);
    const oldestIndex = Math.min(limit - 1, records.length - 1);
    const oldestPrice = await this.safeNum(records[oldestIndex]?.price_per_gram);

    if (latestPrice === null || oldestPrice === null) {
      logger.info(
        `calculateOverallChange - Invalid price values for ${JSON.stringify(records)} ${JSON.stringify(limit)} `,
      );
      filterData.overall_change_percentage = null;
      return filterData;
    }

    const diff = ((latestPrice - oldestPrice) / oldestPrice) * 100;
    const formattedPercentage = await this.readablePercentageChange(diff);

    filterData.overall_change_percentage = formattedPercentage;
    logger.info(`calculateOverallChange - Success ${JSON.stringify(formattedPercentage)}`);

    return filterData;
  }

  // eslint-disable-next-line class-methods-use-this
  async addTaxRate(req: Request, res: Response) {
    const requestBody = req.body;
    const mandatoryFields = ['material_id', 'tax_percentage', 'tax_on', 'effective_date'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';
    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const newRate = await this.taxRateModel.create({
          material_id: requestBody?.material_id,
          tax_type: predefinedTaxType?.GST?.id,
          tax_percentage: requestBody?.tax_percentage,
          tax_on: requestBody.tax_on,
          effective_date: requestBody?.effective_date,
        });

        logger.info(`addTaxRate - Added new entry: ${JSON.stringify(newRate)} }`);
        responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
      } catch (error) {
        logger.error('addTaxRate - Error while adding material rate.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(`addTaxRate - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async getTaxLatestRate(req: Request, res: Response) {
    const requestBody = req.query;
    const mandatoryFields = ['material_id'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';
    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        let taxRateWhere: any = {
          material_id: requestBody?.material_id,
          tax_type: predefinedTaxType?.GST?.id,
          status: 1,
        };

        if (requestBody?.tax_on) {
          taxRateWhere.tax_on = requestBody?.tax_on;
        }

        const latestRate = await this.taxRateModel.findAll({
          where: taxRateWhere,
          order: [['created_at', 'DESC']],
        });

        if (!latestRate) {
          responseData = prepareJSONResponse({}, 'Rate not found', statusCodes.NOT_FOUND);
        } else {
          const formattedData = await Promise.all(
            latestRate.map(async (rate) => {
              return {
                id: rate?.id,
                tax_type: rate?.tax_type,
                tax_percentage: await this.readablePercentageChange(Number(rate?.tax_percentage)),
                tax_on: rate?.tax_on,
                effective_date: rate?.effective_date,
              };
            }),
          );

          responseData = prepareJSONResponse(formattedData, 'Success', statusCodes.OK);
        }
      } catch (error) {
        logger.error('getTaxLatestRate - Error fetching latest rate.', error);
        responseData = prepareJSONResponse({}, 'Error Exception.', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(`getTaxLatestRate - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async getTaxRatesHistory(req: Request, res: Response) {
    const requestBody = req.body;
    const { material_id, effective_date } = req.body;
    const mandatoryFields = ['material_id', 'effective_date'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';
    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const taxRateWhere: any = {
          material_id,
          status: 1,
          effective_date: {
            [Op.gte]: effective_date,
          },
        };

        const taxRateData = await this.taxRateModel.findAll({
          where: taxRateWhere,
          order: [['created_at', 'DESC']],
        });

        if (!taxRateData || taxRateData.length === 0) {
          responseData = prepareJSONResponse({}, 'No rate history found', statusCodes.NOT_FOUND);
        } else {
          let finalResponse: any = {
            material_id,
          };

          const formattedData = await Promise.all(
            taxRateData.map(async (rate) => {
              return {
                id: rate?.id,
                tax_type: rate?.tax_type,
                tax_percentage: await this.readablePercentageChange(Number(rate?.tax_percentage)),
                tax_on: rate?.tax_on,
                effective_date: rate?.effective_date,
              };
            }),
          );

          finalResponse.rate_data = formattedData;

          responseData = prepareJSONResponse(finalResponse, 'Success', statusCodes.OK);
        }
      } catch (error) {
        logger.error('getTaxRatesHistory - Error fetching latest rate.', error);
        responseData = prepareJSONResponse({}, 'Error Exception.', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(`getTaxRatesHistory - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }
}
