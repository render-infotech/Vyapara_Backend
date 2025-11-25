import { Request, Response } from 'express';
import { predefinedFlowStatus, predefinedRoles, predefinedVendorStatus, statusCodes } from '../utils/constants';
import logger from '../utils/logger.js';
import { prepareJSONResponse } from '../utils/utils';
import UsersModel from '../models/users';
import PhysicalRedeemModel from '../models/physicalRedeem';
import CustomerDetailsModel from '../models/customerDetails';
import CustomerAddressModel from '../models/customerAddress';
import MaterialRateModel from '../models/materialRate';
import DigitalHoldingModel from '../models/digitalHolding';
import VendorDetailsModel from '../models/vendorDetails';
import ProductsModel from '../models/products';
import DigitalPurchaseModel from '../models/digitalPurchase';
import OtpLogModel from '../models/otpLog';
import { sendSms, generateNumericOtp, hashOtp } from '../utils/sms';
import { Op } from 'sequelize';

export default class PhysicalRedeemController {
  // @ts-ignore
  private physicalRedeemModel: PhysicalRedeemModel;

  // @ts-ignore
  private usersModel: UsersModel;

  // @ts-ignore
  private customerDetailsModel: CustomerDetailsModel;

  // @ts-ignore
  private customerAddressModel: CustomerAddressModel;

  // @ts-ignore
  private materialRateModel: MaterialRateModel;

  // @ts-ignore
  private digitalHoldingModel: DigitalHoldingModel;

  // @ts-ignore
  private vendorDetailsModel: VendorDetailsModel;

  // @ts-ignore
  private productsModel: ProductsModel;

  // @ts-ignore
  private digitalPurchaseModel: DigitalPurchaseModel;

  // @ts-ignore
  private otpLogModel: OtpLogModel;

  constructor(
    // @ts-ignore
    physicalRedeemModel: PhysicalRedeemModel,
    // @ts-ignore
    usersModel: UsersModel,
    // @ts-ignore
    customerDetailsModel: CustomerDetailsModel,
    // @ts-ignore
    customerAddressModel: CustomerAddressModel,
    // @ts-ignore
    materialRateModel: MaterialRateModel,
    // @ts-ignore
    digitalHoldingModel: DigitalHoldingModel,
    // @ts-ignore
    vendorDetailsModel: VendorDetailsModel,
    // @ts-ignore
    productsModel: ProductsModel,
    // @ts-ignore
    digitalPurchaseModel: DigitalPurchaseModel,
    // @ts-ignore
    otpLogModel: OtpLogModel,
  ) {
    this.physicalRedeemModel = physicalRedeemModel;
    this.usersModel = usersModel;
    this.customerDetailsModel = customerDetailsModel;
    this.customerAddressModel = customerAddressModel;
    this.materialRateModel = materialRateModel;
    this.digitalHoldingModel = digitalHoldingModel;
    this.vendorDetailsModel = vendorDetailsModel;
    this.productsModel = productsModel;
    this.digitalPurchaseModel = digitalPurchaseModel;
    this.otpLogModel = otpLogModel;
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
  async generateRedeemOtp(req: Request, res: Response) {
    const requestBody = req.body;
    // @ts-ignore
    const { userId, role_id } = req.user;
    let responseData: typeof prepareJSONResponse = {};

    try {
      if (role_id !== predefinedRoles.User.id) {
        responseData = prepareJSONResponse({}, 'Not allowed for this role.', statusCodes.FORBIDDEN);
        return res.status(responseData.status).json(responseData);
      }

      // Check rate limiting
      const lastOtp = await this.otpLogModel.findOne({
        where: {
          user_id: userId,
          context: 'physical_redeem',
          created_at: {
            [Op.gte]: new Date(Date.now() - 60 * 1000), // 60 seconds cooldown
          },
        },
      });

      if (lastOtp) {
        responseData = prepareJSONResponse({}, 'Please wait before requesting another OTP.', statusCodes.TOO_MANY_REQUESTS);
        return res.status(responseData.status).json(responseData);
      }

      // Fetch user phone number
      const user = await this.usersModel.findOne({ where: { id: userId } });
      if (!user || !user.phone) {
        responseData = prepareJSONResponse({}, 'User phone number not found.', statusCodes.BAD_REQUEST);
        return res.status(responseData.status).json(responseData);
      }

      // const otp = generateNumericOtp(6);
      const otp = 123456;
      const otpHash = hashOtp(otp.toString());
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

      await this.otpLogModel.create({
        user_id: userId,
        otp_hash: otpHash,
        expires_at: expiresAt,
        context: 'physical_redeem',
        attempts: 0,
        is_used: false,
      });

      const message = `Your OTP for physical redeem is ${otp}. It is valid for 5 minutes.`;
      const smsSent = await sendSms(user.phone, message);

      if (smsSent) {
        responseData = prepareJSONResponse({}, 'OTP sent successfully.', statusCodes.OK);
      } else {
        responseData = prepareJSONResponse({}, 'Failed to send OTP.', statusCodes.INTERNAL_SERVER_ERROR);
      }
    } catch (error) {
      logger.error('generateRedeemOtp - Error generating OTP.', error);
      responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    }

    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async createPhysicalRedeem(req: Request, res: Response) {
    const requestBody = req.body;
    // @ts-ignore
    const { userId, role_id } = req.user;

    const { address_id, products, material_id, otp } = req.body;
    const mandatoryFields = ['address_id', 'products', 'material_id', 'otp'];
    const missingFields = mandatoryFields.filter(
      (field) => requestBody[field] === undefined || requestBody[field] === null || requestBody[field] === '',
    );
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';

    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else if (!Array.isArray(products) || products.length === 0) {
      responseData = prepareJSONResponse({}, 'products cannot be empty', statusCodes.BAD_REQUEST);
    } else if (role_id !== predefinedRoles.User.id) {
      responseData = prepareJSONResponse({}, 'Not allowed for this role.', statusCodes.FORBIDDEN);
      return res.status(responseData.status).json(responseData);
    } else {
      try {
        const addressWhere: any = { id: address_id, customer_id: userId, status: 1 };

        const addressRecord = await this.customerAddressModel.findOne({
          where: addressWhere,
        });

        // OTP Verification
        const otpRecord = await this.otpLogModel.findOne({
          where: {
            user_id: userId,
            context: 'physical_redeem',
            is_used: false,
            expires_at: {
              [Op.gte]: new Date(),
            },
          },
          order: [['created_at', 'DESC']],
        });

        if (!otpRecord) {
          responseData = prepareJSONResponse({}, 'Invalid or expired OTP.', statusCodes.BAD_REQUEST);
          return res.status(responseData.status).json(responseData);
        }

        if (otpRecord.attempts >= 5) {
          responseData = prepareJSONResponse({}, 'Too many failed attempts. OTP is locked. Try again after 5 minutes.', statusCodes.BAD_REQUEST);
          return res.status(responseData.status).json(responseData);
        }

        const hashedInputOtp = hashOtp(otp.toString());
        if (otpRecord.otp_hash !== hashedInputOtp) {
          otpRecord.attempts += 1;
          await otpRecord.save();
          responseData = prepareJSONResponse({}, 'Invalid OTP.', statusCodes.BAD_REQUEST);
          return res.status(responseData.status).json(responseData);
        }

        // Mark OTP as used
        otpRecord.is_used = true;
        await otpRecord.save();

        logger.info(`createPhysicalRedeem - address details: ${JSON.stringify(addressRecord)} }`);

        if (!addressRecord) {
          responseData = prepareJSONResponse(
            {},
            'Invalid address_id or address does not belong to the customer',
            statusCodes.BAD_REQUEST,
          );
        } else {
          await Promise.all(
            products.map(async (p) => {
              if (!p.product_id) {
                throw prepareJSONResponse({}, 'Each product must have product_id', statusCodes.BAD_REQUEST);
              }

              if (!p.quantity || Number(p.quantity) <= 0) {
                throw prepareJSONResponse({}, 'Each product must have quantity > 0', statusCodes.BAD_REQUEST);
              }
            }),
          );

          const productIdsOnly = products.map((p) => p.product_id);
          const duplicateIds = productIdsOnly.filter((id, idx) => productIdsOnly.indexOf(id) !== idx);
          if (duplicateIds.length > 0) {
            responseData = prepareJSONResponse(
              { duplicateIds },
              'Duplicate product_id detected',
              statusCodes.BAD_REQUEST,
            );
            return res.status(responseData.status).json(responseData);
          }

          const productWhere: any = { id: productIdsOnly, material_id, status: 1 };

          const productRecords = await this.productsModel.findAll({
            where: productWhere,
          });

          if (!productRecords) {
            responseData = prepareJSONResponse({}, 'Product does not found', statusCodes.BAD_REQUEST);
            return res.status(responseData.status).json(responseData);
          } else if (productRecords.length !== products.length) {
            const dbIds = productRecords.map((p: any) => p.id);
            const invalidIds = productIdsOnly.filter((id) => !dbIds.includes(id));

            responseData = prepareJSONResponse(
              { invalid_product_ids: invalidIds },
              'Some product_id are invalid',
              statusCodes.BAD_REQUEST,
            );
            return res.status(responseData.status).json(responseData);
          }

          logger.info(`createPhysicalRedeem - products details: ${JSON.stringify(productRecords)} }`);

          const materialSet = new Set(productRecords.map((p: any) => p.material_id));
          if (materialSet.size > 1) {
            responseData = prepareJSONResponse(
              {},
              'All products in redeem request must belong to the same material',
              statusCodes.BAD_REQUEST,
            );
            return res.status(responseData.status).json(responseData);
          }

          let totalRequiredGrams = 0;

          productRecords.forEach((product: any) => {
            const cartItem = products.find((p: any) => p.product_id === product.id);
            const itemGrams = Number(product.weight_in_grams) * Number(cartItem.quantity);

            totalRequiredGrams += itemGrams;
          });

          const holding = await this.digitalHoldingModel.sum('running_total_grams', {
            where: { customer_id: userId, material_id },
          });

          logger.info(`createPhysicalRedeem - customer's current holdings details: ${JSON.stringify(holding)} }`);

          const availableGrams = Number(holding || 0);

          if (availableGrams < totalRequiredGrams) {
            responseData = prepareJSONResponse(
              { availableGrams, totalRequiredGrams },
              'Not enough grams for redeem',
              statusCodes.BAD_REQUEST,
            );
            return res.status(responseData.status).json(responseData);
          }

          const live = await this.getLiveMaterialPrice(material_id);
          const price_per_gram = Number(live?.live_price?.price_per_gram || 0);

          if (!price_per_gram) {
            responseData = prepareJSONResponse({}, 'Unable to fetch current metal rate', statusCodes.BAD_REQUEST);
            return res.status(responseData.status).json(responseData);
          }

          const lastLedger = await this.digitalHoldingModel.findOne({
            where: {
              customer_id: userId,
              material_id,
            },
            order: [['id', 'DESC']],
          });

          const previousBalance = lastLedger ? Number(lastLedger.running_total_grams) : 0.0;
          const updatedBalance = Number((previousBalance - totalRequiredGrams).toFixed(6));

          if (Number(previousBalance < totalRequiredGrams)) {
            responseData = prepareJSONResponse(
              {},
              'Not enough grams for redeem as per current holdings',
              statusCodes.BAD_REQUEST,
            );
          } else {
            const redeemData = {
              customer_id: userId,
              transaction_type_id: 3,
              material_id,
              price_per_gram,
              grams_before_redeem: availableGrams,
              grams_redeemed: totalRequiredGrams,
              grams_after_redeem: availableGrams - totalRequiredGrams,
              address_id,
              admin_status: 1,
              vendor_id: null,
              vendor_status: 0,
              rider_id: null,
              rider_status: 0,
              flow_status: 1,
              remarks: null,
              products,
            };

            const redeemRecord = await this.physicalRedeemModel.create(redeemData);

            const newHolding = await this.digitalHoldingModel.create({
              customer_id: userId,
              material_id,
              purchase_id: null,
              redeem_id: redeemRecord?.id,
              transaction_type_id: 3,
              grams: totalRequiredGrams,
              running_total_grams: updatedBalance,
            });
            logger.info(`createPhysicalRedeem - Ledger updated for physical redeem: ${JSON.stringify(newHolding)}`);

            responseData = prepareJSONResponse(
              {
                redeem_code: redeemRecord.redeem_code,
                grams_after: redeemRecord.grams_after_redeem,
              },
              'Success',
              statusCodes.OK,
            );
          }
        }
      } catch (error) {
        logger.error('createPhysicalRedeem - Error creating customer physical redeem.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(`createPhysicalRedeem - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async listRedemptions(req: Request, res: Response) {
    // @ts-ignore
    const { userId, role_id } = req.user;
    let responseData: typeof prepareJSONResponse = {};

    try {
      let whereClause: any = {};

      if (role_id === predefinedRoles.Admin.id) {
        // Admin sees all
        whereClause = {};
      } else if (role_id === predefinedRoles.Vendor.id) {
        // Vendor sees assigned redemptions
        whereClause = { vendor_id: userId };
      } else if (role_id === predefinedRoles.Rider.id) {
        // Rider sees assigned redemptions
        whereClause = { rider_id: userId };
      } else if (role_id === predefinedRoles.User.id) {
        // Customer sees their own redemptions
        whereClause = { customer_id: userId };
      } else {
        // Other roles (if any) shouldn't see anything or forbidden
        // For now, let's return empty or forbidden. Let's return forbidden for safety.
        responseData = prepareJSONResponse({}, 'Access denied', statusCodes.FORBIDDEN);
        return res.status(responseData.status).json(responseData);
      }

      const redemptions = await this.physicalRedeemModel.findAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
        include: [
          {
            model: this.customerAddressModel,
            as: 'customerAddress',
          },
          {
            model: this.usersModel,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone'],
          },
        ],
      });

      responseData = prepareJSONResponse({ redemptions }, 'Success', statusCodes.OK);
    } catch (error) {
      logger.error('listRedemptions - Error fetching redemptions.', error);
      responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    }

    return res.status(responseData.status).json(responseData);
  }


  // eslint-disable-next-line class-methods-use-this
  async assignVendor(req: Request, res: Response) {
    const requestBody = req.body;
    // @ts-ignore
    const { role_id } = req.user;
    let responseData: typeof prepareJSONResponse = {};

    try {
      if (role_id !== predefinedRoles.Admin.id) {
        responseData = prepareJSONResponse({}, 'Access denied. Only Admin can assign vendors.', statusCodes.FORBIDDEN);
        return res.status(responseData.status).json(responseData);
      }

      const { redeem_id, vendor_id } = requestBody;

      if (!redeem_id || !vendor_id) {
        responseData = prepareJSONResponse({}, 'redeem_id and vendor_id are required.', statusCodes.BAD_REQUEST);
        return res.status(responseData.status).json(responseData);
      }

      const redeemRecord = await this.physicalRedeemModel.findOne({ where: { id: redeem_id } });

      if (!redeemRecord) {
        responseData = prepareJSONResponse({}, 'Redemption record not found.', statusCodes.NOT_FOUND);
        return res.status(responseData.status).json(responseData);
      }

      const vendorRecord = await this.usersModel.findOne({
        where: { id: vendor_id, role_id: predefinedRoles.Vendor.id },
      });

      if (!vendorRecord) {
        responseData = prepareJSONResponse({}, 'Vendor not found or invalid vendor ID.', statusCodes.BAD_REQUEST);
        return res.status(responseData.status).json(responseData);
      }

      redeemRecord.vendor_id = vendor_id;
      redeemRecord.admin_status = predefinedFlowStatus.Admin_Approved.id; // Approved
      redeemRecord.flow_status = predefinedFlowStatus.Vendor_Assigned.id; // Vendor Assigned
      redeemRecord.vendor_status = predefinedVendorStatus.Pending.id; // Pending vendor response
      await redeemRecord.save();

      responseData = prepareJSONResponse({}, 'Vendor assigned successfully.', statusCodes.OK);
    } catch (error) {
      logger.error('assignVendor - Error assigning vendor.', error);
      responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    }

    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async rejectRedemption(req: Request, res: Response) {
    const requestBody = req.body;
    // @ts-ignore
    const { role_id } = req.user;
    let responseData: typeof prepareJSONResponse = {};

    try {
      if (role_id !== predefinedRoles.Admin.id) {
        responseData = prepareJSONResponse({}, 'Access denied. Only Admin can reject redemptions.', statusCodes.FORBIDDEN);
        return res.status(responseData.status).json(responseData);
      }

      const { redeem_id } = requestBody;

      if (!redeem_id) {
        responseData = prepareJSONResponse({}, 'redeem_id is required.', statusCodes.BAD_REQUEST);
        return res.status(responseData.status).json(responseData);
      }

      const redeemRecord = await this.physicalRedeemModel.findOne({ where: { id: redeem_id } });

      if (!redeemRecord) {
        responseData = prepareJSONResponse({}, 'Redemption record not found.', statusCodes.NOT_FOUND);
        return res.status(responseData.status).json(responseData);
      }

      // Check if already processed
      if (
        redeemRecord.admin_status === predefinedFlowStatus.Admin_Approved.id ||
        redeemRecord.admin_status === predefinedFlowStatus.Admin_Rejected.id
      ) {
        responseData = prepareJSONResponse(
          {},
          'Redemption request has already been processed.',
          statusCodes.BAD_REQUEST,
        );
        return res.status(responseData.status).json(responseData);
      }

      // 1. Update Status
      redeemRecord.admin_status = predefinedFlowStatus.Admin_Rejected.id;
      redeemRecord.flow_status = predefinedFlowStatus.Admin_Rejected.id;
      redeemRecord.vendor_status = predefinedVendorStatus.Rejected.id; // Optional: Mark vendor status as rejected if needed
      await redeemRecord.save();

      // 2. Reverse Transaction (Refund Grams)
      const lastLedger = await this.digitalHoldingModel.findOne({
        where: {
          customer_id: redeemRecord.customer_id,
          material_id: redeemRecord.material_id,
          redeem_id: redeemRecord.id,
        },
        order: [['id', 'DESC']],
      });

      const currentBalance = lastLedger ? Number(lastLedger.running_total_grams) : 0.0;
      const refundGrams = Number(redeemRecord.grams_redeemed);
      const newBalance = Number((currentBalance + refundGrams).toFixed(6));

      await this.digitalHoldingModel.create({
        customer_id: redeemRecord.customer_id,
        material_id: redeemRecord.material_id,
        purchase_id: null,
        redeem_id: redeemRecord.id,
        transaction_type_id: 2, // Deposit (Refund)
        grams: refundGrams,
        running_total_grams: newBalance,
      });

      logger.info(`rejectRedemption - Refunded ${refundGrams} grams to customer ${redeemRecord.customer_id}`);

      responseData = prepareJSONResponse({}, 'Redemption rejected and grams refunded successfully.', statusCodes.OK);
    } catch (error) {
      logger.error('rejectRedemption - Error rejecting redemption.', error);
      responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    }

    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async getRedemptionDetails(req: Request, res: Response) {
    // @ts-ignore
    const { userId, role_id } = req.user;
    const { id } = req.params;
    let responseData: typeof prepareJSONResponse = {};

    try {
      if (!id) {
        responseData = prepareJSONResponse({}, 'Redemption ID is required.', statusCodes.BAD_REQUEST);
        return res.status(responseData.status).json(responseData);
      }

      const redeemRecord = await this.physicalRedeemModel.findOne({
        where: { id },
        include: [
          {
            model: this.customerAddressModel,
            as: 'customerAddress',
          },
          {
            model: this.usersModel,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone'],
          },
        ],
      });

      if (!redeemRecord) {
        responseData = prepareJSONResponse({}, 'Redemption record not found.', statusCodes.NOT_FOUND);
        return res.status(responseData.status).json(responseData);
      }

      // Permission check: Customers can only see their own
      if (role_id === predefinedRoles.User.id && redeemRecord.customer_id !== userId) {
        responseData = prepareJSONResponse({}, 'Access denied.', statusCodes.FORBIDDEN);
        return res.status(responseData.status).json(responseData);
      }
      // Vendors can only see assigned
      if (role_id === predefinedRoles.Vendor.id && redeemRecord.vendor_id !== userId) {
        responseData = prepareJSONResponse({}, 'Access denied.', statusCodes.FORBIDDEN);
        return res.status(responseData.status).json(responseData);
      }
      // Riders can only see assigned
      if (role_id === predefinedRoles.Rider.id && redeemRecord.rider_id !== userId) {
        responseData = prepareJSONResponse({}, 'Access denied.', statusCodes.FORBIDDEN);
        return res.status(responseData.status).json(responseData);
      }

      // Helper to get name from constant object
      const getStatusName = (statusId: number, constantsObj: any) => {
        const entry = Object.values(constantsObj).find((item: any) => item.id === statusId);
        // @ts-ignore
        return entry ? entry.name : 'Unknown';
      };

      // Admin Status Mapping (1=Pending, 2=Approved, 3=Rejected)
      const getAdminStatusName = (statusId: number) => {
        switch (statusId) {
          case 1: return 'Pending';
          case 2: return 'Approved';
          case 3: return 'Rejected';
          default: return 'Unknown';
        }
      };

      const result = {
        ...redeemRecord.toJSON(),
        admin_status_text: getAdminStatusName(redeemRecord.admin_status),
        flow_status_text: getStatusName(redeemRecord.flow_status, predefinedFlowStatus),
        vendor_status_text: getStatusName(redeemRecord.vendor_status || 0, predefinedVendorStatus),
        rider_status_text: getStatusName(redeemRecord.rider_status || 0, predefinedVendorStatus), // Assuming Rider uses same status codes as Vendor for now
      };

      responseData = prepareJSONResponse({ redemption: result }, 'Success', statusCodes.OK);
    } catch (error) {
      logger.error('getRedemptionDetails - Error fetching details.', error);
      responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    }

    return res.status(responseData.status).json(responseData);
  }
}
