import { Request, Response } from 'express';
import ServiceFeeRateModel from '../models/serviceFeeRate';
import { predefinedServiceFeeFor, statusCodes } from '../utils/constants';
import { prepareJSONResponse } from '../utils/utils.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';

export default class AdminServiceFeeRateController {
  // @ts-ignore
  private serviceFeeRateModel: ServiceFeeRateModel;

  // @ts-ignore
  constructor(
    // @ts-ignore
    serviceFeeRateModel: ServiceFeeRateModel,
  ) {
    this.serviceFeeRateModel = serviceFeeRateModel;
  }

  // eslint-disable-next-line class-methods-use-this
  async readablePercentageChange(num: number | null) {
    if (num === null || !Number.isFinite(num)) return null;
    const fixed = Number(num.toFixed(5));
    return `${fixed}%`;
  }

  // eslint-disable-next-line class-methods-use-this
  async addServiceFeeRate(req: Request, res: Response) {
    const requestBody = req.body;
    const mandatoryFields = ['material_id', 'service_fee_rate', 'effective_date'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';
    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const existingRate = await this.serviceFeeRateModel.findOne({
          where: {
            material_id: requestBody.material_id,
            service_fee_type: predefinedServiceFeeFor?.Convenience_fee?.id,
            effective_date: requestBody.effective_date,
            status: 1,
          },
        });

        if (existingRate) {
          logger.warn(`addServiceFeeRate - Duplicate entry blocked: ${JSON.stringify(existingRate)}`);
          responseData = prepareJSONResponse(
            {},
            'A Service Fee rate entry already exists for this.',
            statusCodes.BAD_REQUEST,
          );
        } else {
          const newRate = await this.serviceFeeRateModel.create({
            material_id: requestBody?.material_id,
            service_fee_type: predefinedServiceFeeFor?.Convenience_fee?.id,
            service_fee_rate: requestBody?.service_fee_rate,
            effective_date: requestBody?.effective_date,
          });

          logger.info(`addServiceFeeRate - Added new entry: ${JSON.stringify(newRate)}`);
          responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
        }
      } catch (error) {
        logger.error('addServiceFeeRate - Error while adding material rate.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(`addServiceFeeRate - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async getLatestServiceFeeRate(req: Request, res: Response) {
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
        let serviceFeeRateWhere: any = {
          material_id: requestBody?.material_id,
          service_fee_type: predefinedServiceFeeFor?.Convenience_fee?.id,
          status: 1,
          effective_date: { [Op.lte]: requestBody.date },
        };

        const latestRate = await this.serviceFeeRateModel.findOne({
          where: serviceFeeRateWhere,
          order: [
            ['effective_date', 'DESC'],
            ['created_at', 'DESC'],
          ],
        });

        if (!latestRate) {
          responseData = prepareJSONResponse({}, 'Rate not found', statusCodes.NOT_FOUND);
        } else {
          const formattedData = {
            id: latestRate.id,
            service_fee_type: latestRate.service_fee_type,
            service_fee_rate: await this.readablePercentageChange(Number(latestRate.service_fee_rate)),
            effective_date: latestRate.effective_date,
          };

          responseData = prepareJSONResponse(formattedData, 'Success', statusCodes.OK);
        }
      } catch (error) {
        logger.error('getLatestServiceFeeRate - Error fetching latest rate.', error);
        responseData = prepareJSONResponse({}, 'Error Exception.', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(
      `getLatestServiceFeeRate - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async getServiceFeeRatesHistory(req: Request, res: Response) {
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
        const serviceFeeRateWhere: any = {
          material_id,
          status: 1,
          effective_date: {
            [Op.lte]: effective_date,
          },
        };

        const serviceFeeRateData = await this.serviceFeeRateModel.findAll({
          where: serviceFeeRateWhere,
          order: [
            ['effective_date', 'DESC'],
            ['created_at', 'DESC'],
          ],
        });

        if (!serviceFeeRateData || serviceFeeRateData.length === 0) {
          responseData = prepareJSONResponse([], 'No service fee history found', statusCodes.NOT_FOUND);
        } else {
          let finalResponse: any = {
            material_id,
          };

          const formattedData = await Promise.all(
            serviceFeeRateData.map(async (rate) => {
              return {
                id: rate?.id,
                service_fee_type: rate.service_fee_type,
                service_fee_rate: await this.readablePercentageChange(Number(rate?.service_fee_rate)),
                effective_date: rate?.effective_date,
              };
            }),
          );

          finalResponse.rate_data = formattedData;

          responseData = prepareJSONResponse(finalResponse, 'Success', statusCodes.OK);
        }
      } catch (error) {
        logger.error('getServiceFeeRatesHistory - Error fetching latest rate.', error);
        responseData = prepareJSONResponse({}, 'Error Exception.', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(
      `getServiceFeeRatesHistory - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }
}
