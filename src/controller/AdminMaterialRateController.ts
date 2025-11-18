import { Request, Response } from 'express';
import MaterialRateModel from '../models/materialRate';
import { statusCodes } from '../utils/constants';
import { prepareJSONResponse } from '../utils/utils.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';

export default class AdminMaterialRateController {
  // @ts-ignore
  private materialRateModel: MaterialRateModel;

  // @ts-ignore
  constructor(
    // @ts-ignore
    materialRateModel: MaterialRateModel,
  ) {
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

        const ist = await this.convertToIST(rate.created_at);

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
          ist,
          price_per_gram: price,
          live_price: rate.is_latest ? true : false,
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
  async addMaterialRate(req: Request, res: Response) {
    const requestBody = req.body;
    const mandatoryFields = ['material_id', 'price_per_gram'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';
    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const previousRate = await this.materialRateModel.findOne({
          where: { material_id: requestBody?.material_id, is_latest: true, status: 1 },
          order: [['created_at', 'DESC']],
        });
        let change_percentage = 0;
        if (previousRate) {
          change_percentage = Number(
            (
              ((Number(requestBody?.price_per_gram) - Number(previousRate?.price_per_gram)) /
                Number(previousRate?.price_per_gram)) *
              100
            ).toFixed(5),
          );
          await previousRate.update({ is_latest: false });
        }

        const newRate = await this.materialRateModel.create({
          material_id: requestBody?.material_id,
          price_per_gram: requestBody?.price_per_gram,
          change_percentage,
          is_latest: true,
          remarks: requestBody?.remarks || '',
        });

        logger.info(`addMaterialRate - Added new entry: ${JSON.stringify(newRate)} }`);
        responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
      } catch (error) {
        logger.error('addMaterialRate - Error while adding material rate.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(`addMaterialRate - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async getMaterialLatestRate(req: Request, res: Response) {
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
        const latestRates = await this.materialRateModel.findAll({
          where: { material_id: requestBody.material_id, status: 1 },
          order: [['created_at', 'DESC']],
          limit: 2,
          attributes: { exclude: ['status', 'created_at', 'updated_at'] },
        });

        if (!latestRates) {
          responseData = prepareJSONResponse({}, 'Rate not found', statusCodes.NOT_FOUND);
        } else {
          const latestRate = latestRates[0].toJSON();
          const previousRate = latestRates[1] ? latestRates[1].toJSON() : null;

          const changePercent = await this.readablePercentageChange(await this.safeNum(latestRate.change_percentage));

          const formattedData = {
            id: latestRate.id,
            material_id: latestRate.material_id,
            price_per_gram: latestRate.price_per_gram,
            change_percentage: changePercent ?? null,
            is_latest: latestRate.is_latest,
            remarks: latestRate.remarks ?? '',
            last_updated_price: previousRate ? previousRate.price_per_gram : null,
          };

          responseData = prepareJSONResponse(formattedData, 'Success', statusCodes.OK);
        }
      } catch (error) {
        logger.error('getMaterialLatestRate - Error fetching latest rate.', error);
        responseData = prepareJSONResponse({}, 'Error Exception.', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(
      `getMaterialLatestRate - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async getMaterialRatesHistory(req: Request, res: Response) {
    const requestBody = req.body;
    const { material_id, till_date } = req.body;
    const mandatoryFields = ['material_id', 'till_date'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';
    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const parsedDate = new Date(`${till_date}T23:59:59.999Z`);
        if (isNaN(parsedDate.getTime())) {
          responseData = prepareJSONResponse(
            {},
            'Invalid till_date format (YYYY-MM-DD expected)',
            statusCodes.BAD_REQUEST,
          );
        } else {
          const materialRateWhere: any = {
            material_id,
            status: 1,
            created_at: {
              [Op.lte]: parsedDate,
            },
          };

          const materialRateData = await this.materialRateModel.findAll({
            where: materialRateWhere,
            order: [['created_at', 'DESC']],
          });

          if (!materialRateData || materialRateData.length === 0) {
            responseData = prepareJSONResponse({}, 'No rate history found', statusCodes.NOT_FOUND);
          } else {
            const historyResult = await this.materialRateHistory(materialRateData);
            const overallResult = await this.calculateOverallChange(materialRateData);

            const finalResponse = {
              material_id,
              rate_data: historyResult.history,
              overall_change_percentage: overallResult.overall_change_percentage,
            };

            responseData = prepareJSONResponse(finalResponse, 'Success', statusCodes.OK);
          }
        }
      } catch (error) {
        logger.error('getMaterialRatesHistory - Error fetching latest rate.', error);
        responseData = prepareJSONResponse({}, 'Error Exception.', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(
      `getMaterialRatesHistory - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }
}
