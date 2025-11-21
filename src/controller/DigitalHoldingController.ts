import { Request, Response } from 'express';
import { predefinedMaterials, predefinedTaxType, statusCodes } from '../utils/constants';
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
import PhysicalRedeemModel from '../models/physicalRedeem';

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

  // @ts-ignore
  private physicalRedeemModel: PhysicalRedeemModel;

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
    // @ts-ignore
    physicalRedeemModel: PhysicalRedeemModel,
  ) {
    this.usersModel = usersModel;
    this.customerDetailsModel = customerDetailsModel;
    this.customerAddressModel = customerAddressModel;
    this.digitalPurchaseModel = digitalPurchaseModel;
    this.materialRateModel = materialRateModel;
    this.taxRateModel = taxRateModel;
    this.serviceFeeRateModel = serviceFeeRateModel;
    this.digitalHoldingModel = digitalHoldingModel;
    this.physicalRedeemModel = physicalRedeemModel;
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
  async getCustomerHoldings(req: Request, res: Response) {
    const requestBody = req.body;
    const { customer_id, start_date, end_date, material_id } = req.body;
    const mandatoryFields = ['customer_id', 'start_date', 'end_date'];
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
        const dateCheck = await this.validateDateRange(start_date, end_date);

        if (!dateCheck.isValid) {
          responseData = prepareJSONResponse({}, dateCheck.error, statusCodes.BAD_REQUEST);
          return res.status(responseData.status).json(responseData);
        }

        const { start, end } = dateCheck;

        const holdingsWhere: any = {
          customer_id,
          created_at: {
            [Op.between]: [start, end],
          },
        };

        const purchaseWhere: any = {
          customer_id,
          created_at: {
            [Op.between]: [start, end],
          },
        };

        if (material_id) {
          holdingsWhere.material_id = material_id;
          purchaseWhere.material_id = material_id;
        }

        const holdingsData = await this.digitalHoldingModel.findAll({
          where: holdingsWhere,
          include: [
            {
              model: this.customerDetailsModel,
              as: 'customerDetails',
              required: true,
              where: {
                customer_id,
              },
              attributes: ['customer_code'],
              order: [['created_at', 'DESC']],
            },
            {
              model: this.digitalPurchaseModel,
              as: 'digitalPurchase',
              required: true,
              where: purchaseWhere,
              attributes: {
                exclude: [
                  'customer_id',
                  'transaction_type_id',
                  'rate_timestamp',
                  'remarks',
                  'webhook_event_id',
                  'created_at',
                  'updated_at',
                ],
              },
              order: [['created_at', 'DESC']],
            },
          ],
          order: [['created_at', 'DESC']],
        });

        logger.info(`getCustomerHoldings - fetched all the holdings data ${JSON.stringify(holdingsData)}`);
        if (holdingsData.length === 0) {
          responseData = prepareJSONResponse([], 'No data found.', statusCodes.NOT_FOUND);
        } else {
          const finalData = await Promise.all(
            holdingsData.map(async (item: any) => {
              const holding = item.toJSON();

              return {
                id: holding.id,
                customer_id: holding.customer_id,
                material_id: holding.material_id,
                purchase_id: holding.purchase_id,
                redeem_id: holding.redeem_id,
                transaction_type_id: holding.transaction_type_id,
                grams: holding.grams,
                running_total_grams: holding.running_total_grams,

                // convert created_at to IST
                ist: await this.convertToIST(holding.created_at),

                // from CustomerDetails
                customer_code: holding.customerDetails?.customer_code || null,

                // from DigitalPurchase
                purchase_code: holding.digitalPurchase?.purchase_code || null,
                amount: holding.digitalPurchase?.amount || null,
                price_per_gram: holding.digitalPurchase?.price_per_gram || null,
                grams_purchased: holding.digitalPurchase?.grams_purchased || null,
                tax_rate_material: holding.digitalPurchase?.tax_rate_material || null,
                tax_amount_material: holding.digitalPurchase?.tax_amount_material || null,
                tax_rate_service: holding.digitalPurchase?.tax_rate_service || null,
                tax_amount_service: holding.digitalPurchase?.tax_amount_service || null,
                total_tax_amount: holding.digitalPurchase?.total_tax_amount || null,
                service_fee_rate: holding.digitalPurchase?.service_fee_rate || null,
                service_fee: holding.digitalPurchase?.service_fee || null,
                total_amount: holding.digitalPurchase?.total_amount || null,
                purchase_status: holding.digitalPurchase?.purchase_status || null,
                razorpay_order_id: holding.digitalPurchase?.razorpay_order_id || null,
                razorpay_payment_id: holding.digitalPurchase?.razorpay_payment_id || null,
                razorpay_signature: holding.digitalPurchase?.razorpay_signature || null,
                payment_status: holding.digitalPurchase?.payment_status || null,
              };
            }),
          );

          responseData = prepareJSONResponse(finalData, 'Success', statusCodes.OK);
        }
      } catch (error) {
        logger.error('getCustomerHoldings - Error retrieving Customer digital holdings.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(`getCustomerHoldings - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async getCustomerCurrentHoldings(req: Request, res: Response) {
    const requestBody = req.body;
    // @ts-ignore
    const { userId } = req.user;
    const { start_date, end_date } = requestBody;
    const mandatoryFields = [];
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
        const dateCheck = await this.validateDateRange(start_date, end_date);

        if (!dateCheck.isValid) {
          responseData = prepareJSONResponse({}, dateCheck.error, statusCodes.BAD_REQUEST);
          return res.status(responseData.status).json(responseData);
        }

        const { start, end } = dateCheck;
        const holdingsWhere: any = { customer_id: userId };

        if (start && end) {
          holdingsWhere.created_at = { [Op.between]: [start, end] };
        } else if (start_date) {
          holdingsWhere.created_at = { [Op.gte]: new Date(`${start_date}T00:00:00.000Z`) };
        } else if (end_date) {
          holdingsWhere.created_at = { [Op.lte]: new Date(`${end_date}T23:59:59.999Z`) };
        }

        const allHoldings = await this.digitalHoldingModel.findAll({
          where: holdingsWhere,
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
        } else {
          const mergedFilter: any = { customer_id: userId };

          if (start && end) {
            mergedFilter.created_at = { [Op.between]: [start, end] };
          } else if (start_date) {
            mergedFilter.created_at = { [Op.gte]: new Date(`${start_date}T00:00:00.000Z`) };
          } else if (end_date) {
            mergedFilter.created_at = { [Op.lte]: new Date(`${end_date}T23:59:59.999Z`) };
          }

          const allPurchases = await this.digitalPurchaseModel.findAll({
            where: {
              ...mergedFilter,
              transaction_type_id: 1,
              purchase_status: 2,
              payment_status: 2,
            },
            raw: true,
          });

          const allRedeems = await this.physicalRedeemModel.findAll({
            where: {
              ...mergedFilter,
              transaction_type_id: 3,
            },
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

          for (const red of allRedeems) {
            const mId = red.material_id;

            if (!investMap[mId]) {
              investMap[mId] = { invested: 0, grams: 0 };
            }

            investMap[mId].grams -= Number(red.grams_redeemed || 0);

            const redeemValue = Number(red.grams_redeemed || 0) * Number(red.price_per_gram || 0);

            investMap[mId].invested -= redeemValue;
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
              customer_id: userId,
              total_investment_value: totalInvestmentValue,
              materials: materialsOutput,
            },
            'Success',
            statusCodes.OK,
          );
        }
      } catch (error) {
        logger.error('getCustomerCurrentHoldings - Error', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }

    logger.info(`getCustomerCurrentHoldings Req/Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }
}
