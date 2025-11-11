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
  async readablePercentageChange(num: number | null) {
    if (num === null || !Number.isFinite(num)) return null;
    const fixed = Number(num.toFixed(5));
    return `${fixed}%`;
  }

  // eslint-disable-next-line class-methods-use-this
  async latestTaxRateFilter(records = []) {
    const result: any = {};

    if (!records || records.length === 0) {
      logger.info(`latestTaxRateFilter - No tax rate records found ${JSON.stringify(records)}`);
      result.latestRates = [];
      return result;
    }

    const latestMap = new Map<number, any>();

    records.forEach((rate: any) => {
      const existing = latestMap.get(rate.tax_on);

      if (!existing) {
        latestMap.set(rate.tax_on, rate);
      } else {
        const existingDate = new Date(existing.effective_date);
        const currentDate = new Date(rate.effective_date);

        if (currentDate > existingDate) {
          latestMap.set(rate.tax_on, rate);
        } else if (
          currentDate.getTime() === existingDate.getTime() &&
          new Date(rate.created_at) > new Date(existing.created_at)
        ) {
          latestMap.set(rate.tax_on, rate);
        }
      }
    });

    const filteredRates = Array.from(latestMap.values());
    result.latestRates = filteredRates;

    logger.info(`latestTaxRateFilter - Success ${filteredRates.length} records filtered`);

    return result;
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
        const existingRate = await this.taxRateModel.findOne({
          where: {
            material_id: requestBody.material_id,
            tax_type: predefinedTaxType?.GST?.id,
            tax_on: requestBody.tax_on,
            effective_date: requestBody.effective_date,
            status: 1,
          },
        });

        if (existingRate) {
          logger.warn(`addTaxRate - Duplicate entry blocked: ${JSON.stringify(existingRate)}`);
          responseData = prepareJSONResponse({}, 'A tax rate entry already exists for this.', statusCodes.BAD_REQUEST);
        } else {
          const newRate = await this.taxRateModel.create({
            material_id: requestBody?.material_id,
            tax_type: predefinedTaxType?.GST?.id,
            tax_percentage: requestBody?.tax_percentage,
            tax_on: requestBody.tax_on,
            effective_date: requestBody?.effective_date,
          });

          logger.info(`addTaxRate - Added new entry: ${JSON.stringify(newRate)} }`);
          responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
        }
      } catch (error) {
        logger.error('addTaxRate - Error while adding material rate.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(`addTaxRate - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async getLatestTaxRate(req: Request, res: Response) {
    const requestBody = req.query;
    const mandatoryFields = ['material_id', 'date'];
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
          effective_date: { [Op.lte]: requestBody.date },
        };

        if (requestBody?.tax_on) {
          taxRateWhere.tax_on = requestBody?.tax_on;
        }

        const latestRate = await this.taxRateModel.findAll({
          where: taxRateWhere,
          order: [
            ['effective_date', 'DESC'],
            ['created_at', 'DESC'],
          ],
        });

        if (!latestRate || latestRate.length === 0) {
          responseData = prepareJSONResponse([], 'Rate not found', statusCodes.NOT_FOUND);
        } else {
          const { latestRates } = await this.latestTaxRateFilter(latestRate);

          const formattedData = await Promise.all(
            latestRates.map(async (rate: any) => {
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
        logger.error('getLatestTaxRate - Error fetching latest rate.', error);
        responseData = prepareJSONResponse({}, 'Error Exception.', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(`getLatestTaxRate - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
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
            [Op.lte]: effective_date,
          },
        };

        const taxRateData = await this.taxRateModel.findAll({
          where: taxRateWhere,
          order: [
            ['effective_date', 'DESC'],
            ['created_at', 'DESC'],
          ],
        });

        if (!taxRateData || taxRateData.length === 0) {
          responseData = prepareJSONResponse([], 'No rate history found', statusCodes.NOT_FOUND);
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
