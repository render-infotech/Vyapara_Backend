import { Request, Response } from 'express';
import { predefinedMaterials, predefinedRoles, predefinedTaxType, statusCodes } from '../utils/constants';
import logger from '../utils/logger.js';
import { prepareJSONResponse } from '../utils/utils';
import UsersModel from '../models/users';
import CustomerDetailsModel from '../models/customerDetails';
import CustomerAddressModel from '../models/customerAddress';
import DigitalPurchaseModel from '../models/digitalPurchase';
import MaterialRateModel from '../models/materialRate';
import TaxRateModel from '../models/taxRate';
import ServiceFeeRateModel from '../models/serviceFeeRate';
import DigitalHoldingModel from '../models/digitalHolding';

import { Op } from 'sequelize';

export default class DigitalHoldingController {
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
  async getAllCustomersDigitalHoldings(req: Request, res: Response) {
    const requestBody = req.body;
    const { start_date, end_date } = req.body;
    const mandatoryFields = ['start_date', 'end_date'];
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
        const startDate = new Date(String(start_date));
        const endDate = new Date(String(end_date));
        endDate.setHours(23, 59, 59, 999);

        const allCustomersData = await this.usersModel.findAll({
          where: {
            role_id: predefinedRoles.User.id,
            is_deactivated: 0,
            status: 1,
          },
          include: [
            {
              model: this.customerDetailsModel,
              as: 'customerDetails',
              attributes: ['customer_code'],
              required: true,
            },
            {
              model: this.digitalPurchaseModel,
              as: 'digitalPurchase',
              required: false,
              where: {
                created_at: {
                  [Op.between]: [startDate, endDate],
                },
              },
              attributes: {
                exclude: ['customer_id', 'transaction_type_id', 'rate_timestamp', 'remarks', 'updated_at'],
              },
            },
          ],
          attributes: {
            exclude: ['created_at', 'updated_at'],
          },
        });

        logger.info(`getAllCustomersDigitalHoldings - fetched all the customers ${JSON.stringify(allCustomersData)}`);
        if (allCustomersData.length === 0) {
          responseData = prepareJSONResponse([], 'No customer found.', statusCodes.NOT_FOUND);
        } else {
          const flattenedPurchases: any[] = [];

          await Promise.all(
            allCustomersData.map(async (customer) => {
              const code = customer.customerDetails.customer_code;

              await Promise.all(
                customer.digitalPurchase.map(async (pur: any) => {
                  flattenedPurchases.push({
                    ...pur.toJSON(),
                    customer_code: code,
                    ist: await this.convertToIST(pur.created_at),
                  });
                }),
              );
            }),
          );

          responseData = prepareJSONResponse(flattenedPurchases, 'Success', statusCodes.OK);
        }
      } catch (error) {
        logger.error('getAllCustomersDigitalHoldings - Error retrieving Customer digital purchase.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(
      `getAllCustomersDigitalHoldings - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async getCustomersCurrentHoldings(req: Request, res: Response) {
    const requestBody = req.body;
    const { customer_id, start_date, end_date } = requestBody;
    const mandatoryFields = ['customer_id'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field] && requestBody[field] !== 0);

    let responseData: typeof prepareJSONResponse = {};

    if (missingFields.length > 0) {
      responseData = prepareJSONResponse(
        {},
        `Missing required fields: ${missingFields.join(', ')}`,
        statusCodes.BAD_REQUEST,
      );
    } else {
      try {
        let start, end;

        if (start_date && end_date) {
          start = new Date(`${start_date}T00:00:00.000Z`);
          end = new Date(`${end_date}T23:59:59.999Z`);
        }

        const holdingWhere: any = { customer_id };

        if (start && end) {
          holdingWhere.created_at = { [Op.between]: [start, end] };
        } else if (start_date) {
          holdingWhere.created_at = { [Op.gte]: new Date(`${start_date}T00:00:00.000Z`) };
        } else if (end_date) {
          holdingWhere.created_at = { [Op.lte]: new Date(`${end_date}T23:59:59.999Z`) };
        }

        const allHoldings = await this.digitalHoldingModel.findAll({
          where: holdingWhere,
          raw: true,
        });

        const latestHoldingsMap: Record<number, number> = {};

        for (const row of allHoldings) {
          const mId = row.material_id;
          const grams = Number(row.running_total_grams || 0);

          if (!latestHoldingsMap[mId] || grams > latestHoldingsMap[mId]) {
            latestHoldingsMap[mId] = grams;
          }
        }

        const latestHoldings = Object.entries(latestHoldingsMap).map(([material_id, grams]) => ({
          material_id: Number(material_id),
          grams: Number(grams),
        }));

        if (latestHoldings.length === 0) {
          responseData = prepareJSONResponse(
            { total_investment_value: 0, materials: [] },
            'No holdings found.',
            statusCodes.OK,
          );
          return;
        }

        const purchaseWhere: any = {
          customer_id,
          transaction_type_id: 1,
        };

        if (start && end) {
          purchaseWhere.created_at = { [Op.between]: [start, end] };
        } else if (start_date) {
          purchaseWhere.created_at = { [Op.gte]: new Date(`${start_date}T00:00:00.000Z`) };
        } else if (end_date) {
          purchaseWhere.created_at = { [Op.lte]: new Date(`${end_date}T23:59:59.999Z`) };
        }

        const allPurchases = await this.digitalPurchaseModel.findAll({
          where: purchaseWhere,
          raw: true,
        });

        const investMap: Record<number, { invested: number; grams: number }> = {};

        for (const pur of allPurchases) {
          const mId = pur.material_id;

          if (!investMap[mId]) {
            investMap[mId] = { invested: 0, grams: 0 };
          }

          investMap[mId].invested += Number(pur.amount || 0);
          investMap[mId].grams += Number(pur.grams_purchased || 0);
        }

        const currentRates: Record<number, number> = {};
        const materialIds = Object.values(predefinedMaterials).map((m) => m.id);

        await Promise.all(
          materialIds.map(async (mId) => {
            const live = await this.getLiveMaterialPrice(mId);
            currentRates[mId] = Number(live?.live_price?.price_per_gram || 0);
          }),
        );

        const materialNames: Record<number, string> = Object.values(predefinedMaterials).reduce(
          (acc, m) => {
            acc[m.id] = m.name;
            return acc;
          },
          {} as Record<number, string>,
        );

        let totalInvestmentValue = 0;
        const materialsOutput: any[] = [];

        for (const holding of latestHoldings) {
          const materialId = holding.material_id;
          const grams = Number(holding.grams);

          const investedInfo = investMap[materialId] || { invested: 0, grams: 0 };
          const totalInvested = investedInfo.invested;
          const totalBuyGrams = investedInfo.grams;

          const avgPrice = totalBuyGrams > 0 ? Number((totalInvested / totalBuyGrams).toFixed(2)) : 0;

          const currentRate = currentRates[materialId];
          const currentValue = Number((grams * currentRate).toFixed(2));

          const profit = Number((currentValue - totalInvested).toFixed(2));
          const profitPercent = totalInvested > 0 ? Number(((profit / totalInvested) * 100).toFixed(2)) : 0;

          totalInvestmentValue += totalInvested;

          materialsOutput.push({
            material_id: materialId,
            name: materialNames[materialId],
            grams,
            average_price: avgPrice,
            current_rate: currentRate,
            current_value: currentValue,
            invested_amount: totalInvested,
            profit,
            profit_percent: profitPercent,
          });
        }

        responseData = prepareJSONResponse(
          {
            total_investment_value: totalInvestmentValue,
            materials: materialsOutput,
          },
          'Success',
          statusCodes.OK,
        );
      } catch (error) {
        logger.error('getCustomersCurrentHoldings - Error', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }

    logger.info(
      `getCustomersCurrentHoldings Req/Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }
}
