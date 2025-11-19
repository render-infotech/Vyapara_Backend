import { Request, Response } from 'express';
import { predefinedRoles, predefinedTaxType, statusCodes } from '../utils/constants';
import crypto from 'crypto';
import Razorpay from 'razorpay';
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

export default class DigitalPurchaseController {
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
  async getDigitalPurchasePreview(req: Request, res: Response) {
    const requestBody = req.body;
    // @ts-ignore
    const { userId } = req.user;
    const mandatoryFields = ['material_id', 'amount', 'date'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';

    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
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
          customer_id: userId,
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
    // @ts-ignore
    const { userId, role_id } = req.user;
    const mandatoryFields = [
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

    if (missingFields.length > 0) {
      responseData = prepareJSONResponse(
        {},
        `Missing required fields: ${missingFields.join(', ')}`,
        statusCodes.BAD_REQUEST,
      );
      return res.status(responseData.status).json(responseData);
    }

    if (role_id !== predefinedRoles.User.id) {
      responseData = prepareJSONResponse({}, 'Not allowed for this role.', statusCodes.FORBIDDEN);
      return res.status(responseData.status).json(responseData);
    }

    const transaction = await this.digitalPurchaseModel.sequelize.transaction();

    try {
      const {
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
          id: userId,
          role_id: role_id,
          is_deactivated: 0,
          status: 1,
        },
        transaction,
      });

      if (!recordExists) {
        await transaction.rollback();
        responseData = prepareJSONResponse({}, 'User not found', statusCodes.NOT_FOUND);
        return res.status(responseData.status).json(responseData);
      }

      const previewTime = new Date(preview_generated_at);
      const diffMinutes = (Date.now() - previewTime.getTime()) / 60000;
      if (diffMinutes > 5) {
        await transaction.rollback();
        responseData = prepareJSONResponse(
          {},
          'Preview expired. Please refresh rates before proceeding.',
          statusCodes.BAD_REQUEST,
        );
        return res.status(responseData.status).json(responseData);
      }

      const livePrice = await this.getLiveMaterialPrice(materialIdNum);
      if (!livePrice.live_price) {
        await transaction.rollback();
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
        customer_id: userId,
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
          payment_status: 1,
          rate_timestamp: preview_generated_at,
        },
        { transaction },
      );

      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
      });

      const order = razorpay.orders.create({
        amount: Math.round(recalculated_total * 100),
        currency: 'INR',
        receipt: newPurchase.purchase_code,
        payment_capture: true,
      });

      newPurchase.razorpay_order_id = (await order).id;

      await newPurchase.save({ transaction });

      logger.info(`createDigitalPurchase - Added new entry in digitalPurchase table: ${JSON.stringify(newPurchase)} }`);

      const lastLedger = await this.digitalHoldingModel.findOne({
        where: {
          customer_id: userId,
          material_id: materialIdNum,
        },
        order: [['id', 'DESC']],
      });

      const previousBalance = lastLedger ? Number(lastLedger.running_total_grams) : 0.0;
      const updatedBalance = Number((previousBalance + grams_purchased).toFixed(6));

      const newHolding = await this.digitalHoldingModel.create({
        customer_id: userId,
          material_id: materialIdNum,
          purchase_id: newPurchase.id,
          redeem_id: null,
          transaction_type_id: 1,
          grams: grams_purchased,
          running_total_grams: updatedBalance,
        },
        { transaction },
      );
      logger.info(`createDigitalPurchase - Ledger updated for digital purchase: ${newHolding}`);

      responseData = prepareJSONResponse(
        {
          purchase_code: newPurchase.purchase_code,
          razorpay_order_id: (await order).id,
          razorpay_key_id: process.env.RAZORPAY_KEY_ID,
          amount: recalculated_total,
        },
        'Success',
        statusCodes.OK,
      );
    } catch (error) {
      logger.error('createDigitalPurchase - Error creating Digital Purchase .', error);
      responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    }

    return res.status(responseData.status).json(responseData);
  }

  async verifyPayment(req: Request, res: Response) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json(prepareJSONResponse({}, 'Missing required fields', statusCodes.BAD_REQUEST));
    }

    try {
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        logger.error('verifyPayment - Invalid signature mismatch');
        return res
          .status(statusCodes.BAD_REQUEST)
          .json(prepareJSONResponse({}, 'Signature verification failed', statusCodes.BAD_REQUEST));
      }

      const purchase = await this.digitalPurchaseModel.findOne({
        where: { razorpay_order_id },
      });

      if (!purchase) {
        return res
          .status(statusCodes.NOT_FOUND)
          .json(prepareJSONResponse({}, 'Purchase not found', statusCodes.NOT_FOUND));
      }

      if (purchase.payment_status === 2) {
        return res
          .status(statusCodes.OK)
          .json(prepareJSONResponse({ purchase_code: purchase.purchase_code }, 'Already verified', statusCodes.OK));
      }

      purchase.razorpay_payment_id = razorpay_payment_id;
      purchase.razorpay_signature = razorpay_signature;
      purchase.payment_status = 2;
      purchase.purchase_status = 2;

      await purchase.save();

      logger.info(`verifyPayment - Payment successful for order ${razorpay_order_id}`);

      return res.status(statusCodes.OK).json(
        prepareJSONResponse(
          {
            purchase_code: purchase.purchase_code,
            order: purchase,
          },
          'Payment verified successfully',
          statusCodes.OK,
        ),
      );
    } catch (error) {
      logger.error('verifyPayment - Error:', error);
      return res
        .status(statusCodes.INTERNAL_SERVER_ERROR)
        .json(prepareJSONResponse({}, 'Server error', statusCodes.INTERNAL_SERVER_ERROR));
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async getDigitalPurchaseList(req: Request, res: Response) {
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
                exclude: ['customer_id', 'transaction_type_id', 'rate_timestamp', 'remarks', 'updated_at'],
              },
            },
          ],
          attributes: { exclude: ['created_at', 'updated_at'] },
        });
        logger.info(`getDigitalPurchaseList - fetched customers ${JSON.stringify(customerRecords)}`);
        if (customerRecords.length === 0) {
          responseData = prepareJSONResponse([], 'No customer found.', statusCodes.NOT_FOUND);
        } else {
          const allDigitalPurchases = customerRecords?.digitalPurchase;
          let flattenedPurchases = [];

          (await Promise.all(
            allDigitalPurchases.map(async (pur: any) => {
              flattenedPurchases.push({
                ...pur.toJSON(),
                ist: await this.convertToIST(pur.created_at),
              });
            }),
          ),
            (responseData = prepareJSONResponse(flattenedPurchases, 'Success', statusCodes.OK)));
        }
      } catch (error) {
        logger.error('getDigitalPurchaseList - Error retrieving Customer digital purchase.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(
      `getDigitalPurchaseList - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async getAllCustomersDigitalPurchases(req: Request, res: Response) {
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

        logger.info(`getAllCustomersDigitalPurchases - fetched all the customers ${JSON.stringify(allCustomersData)}`);
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
        logger.error('getAllCustomersDigitalPurchases - Error retrieving Customer digital purchase.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(
      `getAllCustomersDigitalPurchases - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async handleRazorpayWebhook(req: Request, res: Response) {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
      const signature = req.headers['x-razorpay-signature'] as string;

      if (!signature) {
        logger.error('Webhook signature missing');
        return res.status(400).send('Signature missing');
      }

      const rawBody = req.body instanceof Buffer ? req.body.toString('utf8') : req.body;

      const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      if (expectedSignature !== signature) {
        logger.error('Invalid webhook signature');
        return res.status(400).send('Invalid signature');
      }

      const webhookData = JSON.parse(rawBody);
      const event = webhookData.event;

      logger.info(`Webhook received: ${event}`);

      const payment = webhookData.payload?.payment?.entity;
      const order = webhookData.payload?.order?.entity;

      switch (event) {
        case 'payment.captured':
          await this._updatePaymentCaptured(payment);
          break;

        case 'payment.failed':
          await this._updatePaymentFailed(payment);
          break;

        case 'order.paid':
          await this._updateOrderPaid(order);
          break;

        default:
          logger.info(`Unhandled event ${event}`);
      }

      return res.status(200).send('OK');
    } catch (error) {
      logger.error('Webhook processing error', error);
      return res.status(500).send('Server error');
    }
  }

  // Helpers
  async _updatePaymentCaptured(payment: any) {
    try {
      const { id, order_id } = payment;

      const purchase = await this.digitalPurchaseModel.findOne({
        where: { razorpay_order_id: order_id },
      });

      if (!purchase) {
        logger.error(`No purchase found for order ${order_id}`);
        return;
      }

      if (purchase.payment_status === 2) {
        logger.info(`Payment already captured for ${order_id}`);
        return;
      }

      purchase.payment_status = 2;
      purchase.purchase_status = 2;
      purchase.razorpay_payment_id = id;
      purchase.remarks = 'Payment captured via webhook';

      await purchase.save();
      logger.info(`Payment captured saved for order ${order_id}`);
    } catch (error) {
      logger.error('_updatePaymentCaptured Error:', error);
    }
  }

  async _updatePaymentFailed(payment: any) {
    try {
      const { order_id, error_description } = payment;

      const purchase = await this.digitalPurchaseModel.findOne({
        where: { razorpay_order_id: order_id },
      });

      if (!purchase) return;

      purchase.payment_status = 3;
      purchase.purchase_status = 3;
      purchase.remarks = error_description || 'Payment failed';

      await purchase.save();
      logger.info(`Payment failed stored for order ${order_id}`);
    } catch (error) {
      logger.error('_updatePaymentFailed Error:', error);
    }
  }

  async _updateOrderPaid(order: any) {
    try {
      const purchase = await this.digitalPurchaseModel.findOne({
        where: { razorpay_order_id: order.id },
      });

      if (!purchase) return;

      purchase.payment_status = 2;
      purchase.purchase_status = 2;
      purchase.remarks = 'Order paid';

      await purchase.save();
      logger.info(`Order paid synced for order ${order.id}`);
    } catch (error) {
      logger.error('_updateOrderPaid Error:', error);
    }
  }
}
