import { Request, Response } from 'express';
import { prepareJSONResponse } from '../utils/utils';
import { predefinedMaterials, statusCodes, predefinedTransactionType } from '../utils/constants';
import logger from '../utils/logger.js';
import UsersModel from '../models/users';
import PhysicalDepositModel from '../models/physicalDeposit';
import PhysicalDepositProductsModel from '../models/physicalDepositProducts';
import CustomerDetailsModel from '../models/customerDetails';
import VendorDetailsModel from '../models/vendorDetails';
import MaterialRateModel from '../models/materialRate';
import CustomerAddressModel from '../models/customerAddress';
import OtpLogModel from '../models/otpLog';
import DigitalHoldingModel from '../models/digitalHoldings';
import ServiceControlModel from '../models/serviceControl';
import { sendSms, hashOtp } from '../utils/sms';
import { Op } from 'sequelize';
import { physicalDepositSummary } from '../utils/emails/physical_deposit_summary.js';
import { sendEmail } from '../utils/mail';

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

  // @ts-ignore
  private customerAddressModel: CustomerAddressModel;

  // @ts-ignore
  private otpLogModel: OtpLogModel;

  // @ts-ignore
  private digitalHoldingModel: DigitalHoldingModel;

  // @ts-ignore
  private serviceControlModel: ServiceControlModel;

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
    // @ts-ignore
    customerAddressModel: CustomerAddressModel,
    // @ts-ignore
    otpLogModel: OtpLogModel,
    // @ts-ignore
    digitalHoldingModel: DigitalHoldingModel,
    // @ts-ignore
    serviceControlModel: ServiceControlModel,
  ) {
    this.physicalDepositModel = physicalDepositModel;
    this.physicalDepositProductsModel = physicalDepositProductsModel;
    this.usersModel = usersModel;
    this.customerDetailsModel = customerDetailsModel;
    this.vendorDetailsModel = vendorDetailsModel;
    this.materialRateModel = materialRateModel;
    this.customerAddressModel = customerAddressModel;
    this.otpLogModel = otpLogModel;
    this.digitalHoldingModel = digitalHoldingModel;
    this.serviceControlModel = serviceControlModel;
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
  async getLatestServiceStatus(service_key?: number) {
    try {
      const serviceWhere: any = {};

      if (service_key) {
        serviceWhere.service_key = service_key;
      }

      const serviceStatus = await this.serviceControlModel.findOne({
        where: serviceWhere,
        order: [['created_at', 'DESC']],
      });

      logger.info(`getLatestServiceStatus - Fetched service control data ${JSON.stringify(serviceStatus)}`);

      if (!serviceStatus) {
        return {
          service_key,
          is_enabled: 1,
          is_active: true,
          reason: null,
        };
      } else {
        const isEnabled = Number(serviceStatus.is_enabled) === 1;
        return {
          service_key: serviceStatus.service_key,
          is_enabled: serviceStatus.is_enabled,
          is_active: isEnabled,
          reason: serviceStatus.reason || null,
        };
      }
    } catch (error) {
      logger.error('getLatestServiceStatus - Error fetching service status.', error);
      return {
        service_key,
        is_enabled: 0,
        is_active: false,
        reason: null,
      };
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async checkUserKYCVerifiction(req: Request, res: Response) {
    const requestBody = req.body;
    const mandatoryFields = ['phone', 'vendor_id'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';

    const serviceStatus = await this.getLatestServiceStatus();

    if (!serviceStatus.is_active) {
      responseData = prepareJSONResponse(
        {},
        'Service is under maintenance and will resume shortly.',
        statusCodes.FORBIDDEN,
      );
    } else if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const userWhere: any = {
          phone: requestBody.phone,
          is_deactivated: 0,
          status: 1,
        };
        const addressWhere: any = {
          status: 1,
        };
        const customerWhere: any = {};
        const recordExists = await this.usersModel.findOne({
          where: userWhere,
          include: [
            {
              model: this.customerAddressModel,
              where: addressWhere,
              as: 'customerAddress',
              required: false,
              attributes: { exclude: ['status', 'customer_id', 'created_at', 'updated_at'] },
            },
            {
              model: this.customerDetailsModel,
              where: customerWhere,
              as: 'customerDetails',
              attributes: { exclude: ['created_at', 'updated_at'] },
            },
          ],
        });

        logger.info(`checkUserKYCVerifiction - fetched user details: ${JSON.stringify(recordExists)}}`);
        if (!recordExists) {
          responseData = prepareJSONResponse({}, 'User not found', statusCodes.NOT_FOUND);
        } else if (recordExists?.user_verified === 0) {
          const depositRecord = await this.physicalDepositModel.create({
            customer_id: recordExists.id,
            vendor_id: requestBody.vendor_id,
            kyc_verified: 0,
            flow_status: 10, // Vendor check pending
          });
          logger.info(
            `checkUserKYCVerifiction - Added new entry in physical deposit table, KYC not done: ${JSON.stringify(depositRecord)}}`,
          );
          responseData = prepareJSONResponse({}, 'Customer KYC is not completed.', statusCodes.BAD_REQUEST);
        } else {
          if (!recordExists.phone) {
            responseData = prepareJSONResponse({}, 'User phone number not found.', statusCodes.BAD_REQUEST);
          } else {
            const depositRecord = await this.physicalDepositModel.create({
              customer_id: recordExists.id,
              vendor_id: requestBody.vendor_id,
              kyc_verified: 1,
              flow_status: 1, // Vendor check pending
            });

            logger.info(
              `checkUserKYCVerifiction - Added new entry in physical deposit table, KYC done: ${JSON.stringify(depositRecord)}}`,
            );

            // const otp = generateNumericOtp(6);
            const otp = 123456;
            const otpHash = hashOtp(otp.toString());
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

            const otpLogRecord = await this.otpLogModel.create({
              user_id: recordExists?.id,
              otp_hash: otpHash,
              expires_at: expiresAt,
              context: 'physical_deposit_step-1',
              attempts: 0,
              is_used: false,
              ref_id: depositRecord.id,
            });

            logger.info(`checkUserKYCVerifiction - Added new entry in otp log table: ${JSON.stringify(otpLogRecord)}}`);

            const smsSent = await sendSms(
              recordExists.phone,
              `Your OTP for physical redeem is ${otp}. It is valid for 5 minutes.`,
            );

            logger.info(
              `checkUserKYCVerifiction - SMS sent to customer's phone to start deposit: ${JSON.stringify(smsSent)}}`,
            );
            responseData = prepareJSONResponse(
              {
                deposit_code: depositRecord?.deposit_code,
                deposit_id: depositRecord?.id,
                customer_id: recordExists.id,
              },
              `Sent OTP to ${recordExists.phone}`,
              statusCodes.OK,
            );
          }
        }
      } catch (error) {
        logger.error('checkUserKYCVerifiction - Error verifying user KYC verification.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(
      `checkUserKYCVerifiction - User KYC Verification Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async startPhysicalDeposit(req: Request, res: Response) {
    const requestBody = req.body;
    const mandatoryFields = ['customer_id', 'deposit_id', 'otp'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';

    const serviceStatus = await this.getLatestServiceStatus();

    if (!serviceStatus.is_active) {
      responseData = prepareJSONResponse(
        {},
        'Service is under maintenance and will resume shortly.',
        statusCodes.FORBIDDEN,
      );
    } else if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const userWhere: any = {
          id: requestBody.customer_id,
          is_deactivated: 0,
          status: 1,
        };
        const addressWhere: any = {
          status: 1,
        };
        const customerWhere: any = {};
        const recordExists = await this.usersModel.findOne({
          where: userWhere,
          include: [
            {
              model: this.customerAddressModel,
              where: addressWhere,
              as: 'customerAddress',
              required: false,
              attributes: { exclude: ['status', 'customer_id', 'created_at', 'updated_at'] },
            },
            {
              model: this.customerDetailsModel,
              where: customerWhere,
              as: 'customerDetails',
              attributes: { exclude: ['created_at', 'updated_at'] },
            },
          ],
        });

        logger.info(`startPhysicalDeposit - fetched user details: ${JSON.stringify(recordExists)}}`);
        if (!recordExists) {
          responseData = prepareJSONResponse({}, 'User not found', statusCodes.NOT_FOUND);
        } else {
          const depositWhere: any = {
            id: requestBody?.deposit_id,
            kyc_verified: 1,
          };
          const depositRecord = await this.physicalDepositModel.findOne({
            where: depositWhere,
          });
          logger.info(`startPhysicalDeposit - fetched deposit details: ${JSON.stringify(depositRecord)}}`);
          if (!depositRecord) {
            responseData = prepareJSONResponse({}, 'Deposit details not found', statusCodes.NOT_FOUND);
          } else {
            const otpWhere: any = {
              user_id: requestBody?.customer_id,
              is_used: 0,
              context: 'physical_deposit_step-1',
              ref_id: requestBody?.deposit_id,
              expires_at: {
                [Op.gte]: new Date(),
              },
            };
            const otpRecord = await this.otpLogModel.findOne({
              where: otpWhere,
              order: [['created_at', 'DESC']],
            });
            if (!otpRecord) {
              responseData = prepareJSONResponse(
                {},
                'No OTP data found for customer verification.',
                statusCodes.BAD_REQUEST,
              );
            } else if (otpRecord.attempts >= 5) {
              responseData = prepareJSONResponse(
                {},
                'Too many failed attempts, start new deposit flow.',
                statusCodes.BAD_REQUEST,
              );
            } else {
              const hashedInputOtp = hashOtp(requestBody?.otp.toString());
              if (otpRecord.otp_hash !== hashedInputOtp) {
                otpRecord.attempts += 1;
                await otpRecord.save();
                responseData = prepareJSONResponse({}, 'Invalid OTP.', statusCodes.BAD_REQUEST);
              }
              otpRecord.is_used = true;
              await otpRecord.save();

              await depositRecord.update({
                flow_status: 2,
                vendor_otp_verify: 1,
              });

              logger.info(
                `startPhysicalDeposit - Vendor successfully verified the OTP and updated the deposit details: ${JSON.stringify(depositRecord)} }`,
              );

              let data: any = {};
              data = {
                id: recordExists?.id,
                customer_code: recordExists?.customerDetails?.customer_code,
                deposit_code: depositRecord?.deposit_code,
                deposit_id: depositRecord?.id,
                first_name: recordExists?.first_name,
                last_name: recordExists?.last_name,
                email: recordExists?.email,
                profile_pic: recordExists?.profile_pic,
                role_id: recordExists?.role_id,
                phone_country_code: recordExists?.phone_country_code,
                phone_code: recordExists?.phone_code,
                phone: recordExists?.phone,
                dob: recordExists?.dob || '',
                gender: recordExists?.gender,
                user_verified: recordExists?.user_verified,
                ist: await this.convertToIST(recordExists?.created_at),
                customerAddress: recordExists?.customerAddress,
              };
              responseData = prepareJSONResponse(data, 'Success', statusCodes.OK);
            }
          }
        }
      } catch (error) {
        logger.error('startPhysicalDeposit - Error in OTP verifying by vendor.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(
      `startPhysicalDeposit - OTP Verification Step-1 Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async addProductsPhysicalDeposit(req: Request, res: Response) {
    const requestBody = req.body;
    const mandatoryFields = ['deposit_id', 'material_id', 'products'];
    const { deposit_id, material_id, products } = req.body;

    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';

    const serviceStatus = await this.getLatestServiceStatus();

    if (!serviceStatus.is_active) {
      responseData = prepareJSONResponse(
        {},
        'Service is under maintenance and will resume shortly.',
        statusCodes.FORBIDDEN,
      );
    } else if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else if (!Array.isArray(products) || products.length === 0) {
      responseData = prepareJSONResponse({}, 'products cannot be empty', statusCodes.BAD_REQUEST);
    } else {
      const materialSet = new Set(products.map((p: any) => p.material_id));

      if (materialSet.size > 1) {
        responseData = prepareJSONResponse(
          {},
          'All products must belong to the same material',
          statusCodes.BAD_REQUEST,
        );
      } else if (!materialSet.has(material_id)) {
        responseData = prepareJSONResponse(
          {},
          'Products material_id does not match request material_id',
          statusCodes.BAD_REQUEST,
        );
      } else {
        try {
          const depositWhere: any = {
            id: deposit_id,
            vendor_otp_verify: 1,
            flow_status: 2,
          };
          const depositRecord = await this.physicalDepositModel.findOne({
            where: depositWhere,
          });

          logger.info(`addProductsPhysicalDeposit - fetched deposit details: ${JSON.stringify(depositRecord)}}`);
          if (!depositRecord) {
            responseData = prepareJSONResponse({}, 'Deposit details not found', statusCodes.NOT_FOUND);
          } else {
            const live = await this.getLiveMaterialPrice(material_id);
            const pricePerGram = Number(live?.live_price?.price_per_gram);

            let totalPure = 0;
            let totalNetWeight = 0;
            let totalGrossWeight = 0;
            products.forEach((p: any) => {
              totalPure += Number(p.pure_metal_equivalent);
              totalNetWeight += Number(p.net_weight);
              totalGrossWeight += Number(p.gross_weight);
            });
            const estimatedValue = totalPure * pricePerGram;

            const productInsertData = products.map((p: any) => ({
              deposit_id,
              product_type: p?.product_type,
              material_id,
              purity: p?.purity,
              gross_weight: p?.gross_weight,
              net_weight: p?.net_weight,
              pure_metal_equivalent: p?.pure_metal_equivalent,
            }));

            const newDepositProducts = await this.physicalDepositProductsModel.bulkCreate(productInsertData);

            logger.info(
              `addProductsPhysicalDeposit - Added new entry in physicalDepositProducts table: ${JSON.stringify(newDepositProducts)} }`,
            );

            await depositRecord.update({
              total_pure_grams: totalPure,
              price_per_gram: pricePerGram,
              estimated_value: estimatedValue,
              flow_status: 3,
            });

            logger.info(
              `addProductsPhysicalDeposit - Products successfully added and updated the deposit details: ${JSON.stringify(depositRecord)} }`,
            );
            responseData = prepareJSONResponse(
              {
                deposit_id,
                total_pure_grams: totalPure,
                price_per_gram: pricePerGram,
                estimated_value: estimatedValue,
                total_net_weight: totalNetWeight,
                total_gross_weight: totalGrossWeight,
                total_items: products.length,
                products: productInsertData,
              },
              'Success',
              statusCodes.OK,
            );
          }
        } catch (error) {
          logger.error('addProductsPhysicalDeposit - Error in adding the products.', error);
          responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
        }
      }
      logger.info(
        `addProductsPhysicalDeposit - add products Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
      );
      return res.status(responseData.status).json(responseData);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async summaryPhysicalDeposit(req: Request, res: Response) {
    const requestBody = req.body;
    const mandatoryFields = ['customer_id', 'deposit_id'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';

    const serviceStatus = await this.getLatestServiceStatus();

    if (!serviceStatus.is_active) {
      responseData = prepareJSONResponse(
        {},
        'Service is under maintenance and will resume shortly.',
        statusCodes.FORBIDDEN,
      );
    } else if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const userWhere: any = {
          id: requestBody.customer_id,
          is_deactivated: 0,
          status: 1,
        };
        const customerWhere: any = {};
        const recordExists = await this.usersModel.findOne({
          where: userWhere,
          include: [
            {
              model: this.customerDetailsModel,
              where: customerWhere,
              as: 'customerDetails',
              attributes: { exclude: ['created_at', 'updated_at'] },
            },
          ],
        });

        logger.info(`summaryPhysicalDeposit - fetched user details: ${JSON.stringify(recordExists)}}`);

        if (!recordExists) {
          responseData = prepareJSONResponse({}, 'User not found', statusCodes.NOT_FOUND);
        } else {
          const depositWhere: any = {
            id: requestBody?.deposit_id,
            vendor_otp_verify: 1,
            // flow_status: 3,
          };
          const depositProductWhere: any = {
            deposit_id: requestBody?.deposit_id,
          };
          const depositRecord = await this.physicalDepositModel.findOne({
            where: depositWhere,
            include: [
              {
                model: this.physicalDepositProductsModel,
                where: depositProductWhere,
                as: 'depositProducts',
                attributes: { exclude: ['created_at', 'updated_at'] },
              },
            ],
          });

          logger.info(`summaryPhysicalDeposit - fetched deposit details: ${JSON.stringify(depositRecord)}}`);
          if (!depositRecord) {
            responseData = prepareJSONResponse({}, 'Deposit details not found', statusCodes.NOT_FOUND);
          } else {
            // const otp = generateNumericOtp(6);
            const otp = 123456;
            const otpHash = hashOtp(otp.toString());
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

            const otpLogRecord = await this.otpLogModel.create({
              user_id: recordExists?.id,
              otp_hash: otpHash,
              expires_at: expiresAt,
              context: 'physical_deposit_summary',
              attempts: 0,
              is_used: false,
              ref_id: depositRecord.id,
            });

            logger.info(`summaryPhysicalDeposit - Added new entry in otp log table: ${JSON.stringify(otpLogRecord)}}`);

            const fullName = `${recordExists?.first_name} ${recordExists?.last_name}`;

            const materialId =
              depositRecord?.depositProducts.length > 0 && depositRecord?.depositProducts?.[0]?.material_id;

            const depositSummary = {
              deposit_code: depositRecord?.deposit_code,
              customer_code: recordExists?.customerDetails?.customer_code,
              material: Object.values(predefinedMaterials).find((m) => m.id === materialId)?.name || 'Unknown',
              total_items: depositRecord?.depositProducts?.length,
              total_pure_grams: depositRecord?.total_pure_grams,
              price_per_gram: depositRecord?.price_per_gram,
              estimated_value: depositRecord?.estimated_value,
            };

            const emailBody = physicalDepositSummary(fullName, otp, depositSummary, depositRecord?.depositProducts);

            const emailStatus = await sendEmail(
              recordExists?.email,
              emailBody,
              `VYAPAR-E - Physical Deposit - ${depositRecord?.deposit_code}`,
            );
            logger.info(
              `summaryPhysicalDeposit Summary mail Status: ${recordExists?.email} ${JSON.stringify(emailStatus)}`,
            );

            await depositRecord.update({
              flow_status: 4,
              agreed_by_customer: 1,
              agreed_at: new Date(),
            });

            responseData = prepareJSONResponse({}, `Sent OTP to ${recordExists?.email}.`, statusCodes.OK);
          }
        }
      } catch (error) {
        logger.error('summaryPhysicalDeposit - Error creating physical deposit.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(
      `summaryPhysicalDeposit - Physical Deposit Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async completePhysicalDeposit(req: Request, res: Response) {
    const requestBody = req.body;
    const mandatoryFields = ['customer_id', 'deposit_id', 'otp'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';

    const serviceStatus = await this.getLatestServiceStatus();

    if (!serviceStatus.is_active) {
      responseData = prepareJSONResponse(
        {},
        'Service is under maintenance and will resume shortly.',
        statusCodes.FORBIDDEN,
      );
    } else if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const userWhere: any = {
          id: requestBody.customer_id,
          is_deactivated: 0,
          status: 1,
        };
        const customerWhere: any = {};
        const recordExists = await this.usersModel.findOne({
          where: userWhere,
          include: [
            {
              model: this.customerDetailsModel,
              where: customerWhere,
              as: 'customerDetails',
              attributes: { exclude: ['created_at', 'updated_at'] },
            },
          ],
        });

        logger.info(`completePhysicalDeposit - fetched user details: ${JSON.stringify(recordExists)}}`);

        if (!recordExists) {
          responseData = prepareJSONResponse({}, 'User not found', statusCodes.NOT_FOUND);
        } else {
          const depositWhere: any = {
            id: requestBody?.deposit_id,
            vendor_otp_verify: 1,
            agreed_by_customer: 1,
            flow_status: 4,
          };

          const depositProductWhere: any = {
            deposit_id: requestBody?.deposit_id,
          };
          const depositRecord = await this.physicalDepositModel.findOne({
            where: depositWhere,
            include: [
              {
                model: this.physicalDepositProductsModel,
                where: depositProductWhere,
                as: 'depositProducts',
                attributes: { exclude: ['created_at', 'updated_at'] },
              },
            ],
          });
          logger.info(`completePhysicalDeposit - fetched deposit details: ${JSON.stringify(depositRecord)}}`);
          if (!depositRecord) {
            responseData = prepareJSONResponse({}, 'Deposit details not found', statusCodes.NOT_FOUND);
          } else {
            const otpWhere: any = {
              user_id: requestBody?.customer_id,
              is_used: 0,
              context: 'physical_deposit_summary',
              ref_id: requestBody?.deposit_id,
              expires_at: {
                [Op.gte]: new Date(),
              },
            };
            const otpRecord = await this.otpLogModel.findOne({
              where: otpWhere,
              order: [['created_at', 'DESC']],
            });
            if (!otpRecord) {
              responseData = prepareJSONResponse({}, 'No OTP data found for final deposit.', statusCodes.BAD_REQUEST);
            } else if (otpRecord.attempts >= 5) {
              responseData = prepareJSONResponse(
                {},
                'Too many failed attempts, Try again after 5 mintues',
                statusCodes.BAD_REQUEST,
              );
            } else {
              const hashedInputOtp = hashOtp(requestBody?.otp.toString());
              if (otpRecord.otp_hash !== hashedInputOtp) {
                otpRecord.attempts += 1;
                await otpRecord.save();
                responseData = prepareJSONResponse({}, 'Invalid OTP.', statusCodes.BAD_REQUEST);
              }
              otpRecord.is_used = true;
              await otpRecord.save();

              const materialIdNum = depositRecord?.depositProducts?.[0]?.material_id;

              const lastLedger = await this.digitalHoldingModel.findOne({
                where: {
                  customer_id: requestBody?.customer_id,
                  material_id: materialIdNum,
                },
                order: [['created_at', 'DESC']],
              });

              const previousBalance = lastLedger ? Number(lastLedger.running_total_grams) : 0.0;

              const depositGrams = Number(depositRecord?.total_pure_grams || 0);

              const updatedBalance = Number((previousBalance + depositGrams).toFixed(6));

              const newHolding = await this.digitalHoldingModel.create({
                customer_id: requestBody?.customer_id,
                material_id: materialIdNum,
                deposit_id: depositRecord?.id,
                transaction_type_id: predefinedTransactionType?.Deposit?.id,
                grams: depositGrams,
                running_total_grams: updatedBalance,
              });

              logger.info(`completePhysicalDeposit - updated digital holdings: ${JSON.stringify(newHolding)}`);

              await depositRecord.update({
                flow_status: 10,
                final_summary_otp_verify: 1,
                vendor_remarks: requestBody?.vendor_remarks,
              });

              logger.info(
                `completePhysicalDeposit - Vendor successfully verified final summary OTP and finished the deposit flow: ${JSON.stringify(depositRecord)} }`,
              );

              const finalRes = {
                deposit_code: depositRecord?.deposit_code,
              };
              responseData = prepareJSONResponse(finalRes, 'Success', statusCodes.OK);
            }
          }
        }
      } catch (error) {
        logger.error('completePhysicalDeposit - Error in completing physical deposit.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
      logger.info(
        `completePhysicalDeposit - Complete Physical Deposit Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
      );
      return res.status(responseData.status).json(responseData);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async getPhysicalDeposit(req: Request, res: Response) {
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
        const dateCheck = await this.validateDateRange(start_date, end_date);

        if (!dateCheck.isValid) {
          responseData = prepareJSONResponse({}, dateCheck.error, statusCodes.BAD_REQUEST);
          return res.status(responseData.status).json(responseData);
        }

        const { start, end } = dateCheck;

        const depositWhere: any = {
          created_at: {
            [Op.between]: [start, end],
          },
        };

        if (requestBody?.customer_id) {
          depositWhere.customer_id = requestBody?.customer_id;
        }
        if (requestBody?.vendor_id) {
          depositWhere.vendor_id = requestBody?.vendor_id;
        }

        const depositRecord = await this.physicalDepositModel.findAll({
          where: depositWhere,
          attributes: { exclude: ['updated_at'] },
          include: [
            {
              model: this.usersModel,
              as: 'user',
              attributes: ['first_name', 'last_name', 'phone_code', 'phone', 'phone_country_code'],
            },
            {
              model: this.customerDetailsModel,
              as: 'customerDetails',
              attributes: ['customer_code'],
            },
            {
              model: this.vendorDetailsModel,
              as: 'vendorDetails',
              attributes: [
                'vendor_id',
                'vendor_code',
                'business_name',
                'address_line',
                'country',
                'state',
                'city',
                'pincode',
                'gst_number',
                'is_gst_registered',
                'website',
              ],
            },
            {
              model: this.physicalDepositProductsModel,
              as: 'depositProducts',
              attributes: [
                'id',
                'product_type',
                'material_id',
                'purity',
                'gross_weight',
                'net_weight',
                'pure_metal_equivalent',
              ],
            },
            {
              model: this.digitalHoldingModel,
              as: 'digitalHoldings',
              attributes: ['id', 'deposit_id', 'transaction_type_id', 'grams', 'running_total_grams'],
            },
          ],
        });
        logger.info(`getPhysicalDeposit - fetched deposit details: ${JSON.stringify(depositRecord)}}`);

        if (!depositRecord) {
          responseData = prepareJSONResponse({}, 'Deposit details not found', statusCodes.NOT_FOUND);
        } else {
          if (depositRecord?.length === 0) {
            responseData = prepareJSONResponse([], 'No deposit found.', statusCodes.NOT_FOUND);
          } else {
            const allDeposits = await Promise.all(
              depositRecord.map(async (customer: any) => {
                return customer;
              }),
            );
            responseData = prepareJSONResponse(allDeposits, 'Success', statusCodes.OK);
          }
        }
      } catch (error) {
        logger.error('getPhysicalDeposit - Error in getting physical deposit data.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
      logger.info(
        `getPhysicalDeposit - Get Physical Deposit Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
      );
      return res.status(responseData.status).json(responseData);
    }
  }
}
