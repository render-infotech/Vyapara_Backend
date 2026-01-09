import { Request, Response } from 'express';
import { predefinedRoles, statusCodes } from '../utils/constants';
import logger from '../utils/logger.js';
import UsersModel from '../models/users';
import CustomerDetailsModel from '../models/customerDetails';
import DigitalHoldingModel from '../models/digitalHoldings';
import DigitalPurchaseModel from '../models/digitalPurchase';
import PhysicalRedeemModel from '../models/physicalRedeem';
import PhysicalDepositModel from '../models/physicalDeposit';
import { Op } from 'sequelize';
import { prepareJSONResponse, generateUserInactiveReport, generateUserActiveReport } from '../utils/utils';

export default class ReportsController {
  // @ts-ignore
  private usersModel: UsersModel;

  // @ts-ignore
  private customerDetailsModel: CustomerDetailsModel;

  // @ts-ignore
  private digitalHoldingModel: DigitalHoldingModel;

  // @ts-ignore
  private digitalPurchaseModel: DigitalPurchaseModel;

  // @ts-ignore
  private physicalRedeemModel: PhysicalRedeemModel;

  // @ts-ignore
  private physicalDepositModel: PhysicalDepositModel;

  constructor(
    // @ts-ignore
    usersModel: UsersModel,

    // @ts-ignore
    customerDetailsModel: CustomerDetailsModel,

    // @ts-ignore
    digitalHoldingModel: DigitalHoldingModel,

    // @ts-ignore
    digitalPurchaseModel: DigitalPurchaseModel,

    // @ts-ignore
    physicalRedeemModel: PhysicalRedeemModel,

    // @ts-ignore
    physicalDepositModel: PhysicalDepositModel,
  ) {
    this.usersModel = usersModel;
    this.customerDetailsModel = customerDetailsModel;
    this.digitalHoldingModel = digitalHoldingModel;
    this.digitalPurchaseModel = digitalPurchaseModel;
    this.physicalRedeemModel = physicalRedeemModel;
    this.physicalDepositModel = physicalDepositModel;
  }

  // eslint-disable-next-line class-methods-use-this
  async getAdminUser() {
    let result: any = null;

    try {
      const adminData = await this.usersModel.findOne({
        where: {
          role_id: predefinedRoles.Admin.id,
        },
        // attributes: ['id'],
        order: [['created_at', 'ASC']],
      });

      if (!adminData) {
        logger.info('getAdminUser - No admin user found');
      } else {
        result = adminData;
        logger.info(`getAdminUser - Success: admin_id=${adminData.id}`);
      }
    } catch (error) {
      logger.error(`getAdminUser - Error: ${(error as Error).message}`);
    }

    return result;
  }

  // eslint-disable-next-line class-methods-use-this
  async getUserActiveReport(start_date: string, end_date: string, customer_id: Number = null, template: Number = 0) {
    const userWhere: any = {
      status: 1,
      user_verified: 1,
      is_deactivated: 0,
      role_id: predefinedRoles?.User?.id,
      created_at: {
        [Op.between]: [start_date, end_date],
      },
    };

    if (customer_id) {
      userWhere.id = customer_id;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);

    const activeUserData = await this.usersModel.findAll({
      where: userWhere,
      attributes: [
        'id',
        'first_name',
        'middle_name',
        'last_name',
        'email',
        'phone_country_code',
        'phone',
        'created_at',
      ],
      include: [
        {
          model: this.digitalHoldingModel,
          as: 'digitalHoldings',
          required: true,
          limit: 1,
          where: {
            created_at: {
              [Op.between]: [startDate, endDate],
            },
          },
          attributes: ['id', 'transaction_type_id', 'material_id', 'grams', 'running_total_grams', 'created_at'],
        },
      ],
      distinct: true,
    });

    logger.info(`userActiveReport - fetched all active customers data ${JSON.stringify(activeUserData)}`);

    if (activeUserData.length > 0) {
      const adminData = await this.getAdminUser();

      const responseData = {
        headers: {
          name: 'VYAPAR-E',
          logo: adminData?.profile_pic ?? '#',
          reportGeneratedOn: new Date().toISOString().split('T')[0],
          disclaimer:
            'Active users are defined as customers who have completed at least one transaction within the last 6 months from the report generation date.',
        },
        filters: {
          start_date,
          end_date,
          customer_code: customer_id === null ? 'All' : null,
        },
        data: [],
        total_users: 0,
      };

      if (responseData.filters.customer_code === null) {
        responseData.filters.customer_code = activeUserData[0]?.user?.name ?? 'NA';
      }

      const reportData: any[] = [];

      await Promise.all(
        activeUserData.map(async (user: any) => {
          const lastTxn = user.digitalHoldings?.[0];

          const row: any = {};

          row.id = user.id;
          row.name = [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' ');
          row.email = user.email;
          row.contact = user.phone;

          row.last_transaction = lastTxn
            ? {
                transaction_type_id: lastTxn.transaction_type_id,
                material_id: lastTxn.material_id,
                grams: lastTxn.grams,
                running_total_grams: lastTxn.running_total_grams,
                created_at: lastTxn.created_at,
              }
            : null;

          reportData.push(row);
          return null;
        }),
      );

      reportData.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

      responseData.data = reportData;
      responseData.total_users = reportData?.length ?? 0;

      if (template === 1) {
        const templateData = await generateUserActiveReport(responseData);
        return templateData;
      }

      return responseData;
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async userActiveReport(req: Request, res: Response) {
    const mandatoryFields = ['start_date', 'end_date', 'template'];
    const requestBody = req.query;

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)).toISOString();
    const endOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
    ).toISOString();

    if (!requestBody.start_date || !requestBody.end_date) {
      requestBody.start_date = startOfMonth.slice(0, 10);
      requestBody.end_date = endOfMonth.slice(0, 10);
    }
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);

    let responseData: typeof prepareJSONResponse;

    if (missingFields.length > 0) {
      const message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const { start_date, end_date, customer_id, template } = requestBody;

        const userActiveReportData = await this.getUserActiveReport(
          start_date.toString(),
          end_date.toString(),
          customer_id ? Number(customer_id) : null,
          Number(template) || 0,
        );
        responseData = prepareJSONResponse(userActiveReportData, 'Success', statusCodes.OK);
      } catch (error) {
        logger.error('Error retrieving in userActiveReport.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }

    logger.info(`userActiveReport Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async getUserInactiveReport(start_date: string, end_date: string, customer_id: Number = null, template: Number = 0) {
    const userWhere: any = {
      status: 1,
      user_verified: 1,
      role_id: predefinedRoles?.User?.id,
      created_at: {
        [Op.between]: [start_date, end_date],
      },
    };
    if (customer_id) {
      userWhere.id = customer_id;
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const inactiveUserData = await this.usersModel.findAll({
      where: userWhere,
      attributes: [
        'id',
        'first_name',
        'middle_name',
        'last_name',
        'email',
        'phone_country_code',
        'phone',
        'is_deactivated',
        'created_at',
      ],
      include: [
        {
          model: this.digitalHoldingModel,
          as: 'digitalHoldings',
          required: false,
          limit: 1,
          where: {
            created_at: {
              [Op.lt]: sixMonthsAgo,
            },
          },
          attributes: ['id', 'transaction_type_id', 'material_id', 'grams', 'running_total_grams', 'created_at'],
        },
      ],
    });

    logger.info(`getUserInactiveReport - fetched all inactive customers data ${JSON.stringify(inactiveUserData)}`);

    if (inactiveUserData.length > 0) {
      const adminData = await this.getAdminUser();

      const responseData = {
        headers: {
          name: 'VYAPAR-E',
          logo: adminData?.profile_pic ?? '#',
          reportGeneratedOn: new Date().toISOString().split('T')[0],
          disclaimer:
            // eslint-disable-next-line max-len
            'Inactive users are defined as verified customers who have not performed any digital transactions within the last six (6) months from the report generation date, and customers who have been deactivated by an administrator.',
        },
        filters: {
          start_date,
          end_date,
          customer_code: customer_id === null ? 'All' : null,
        },
        data: [],
        total_users: 0,
      };

      if (responseData.filters.customer_code === null) {
        responseData.filters.customer_code = inactiveUserData[0]?.user?.name ?? 'NA';
      }

      const reportData: any[] = [];

      await Promise.all(
        inactiveUserData.map(async (user: any) => {
          const lastTxn = user.digitalHoldings?.[0];

          const row: any = {};

          row.id = user.id;
          row.name = [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' ');
          row.email = user.email;
          row.contact = user.phone;
          row.is_deactivated = user.is_deactivated;

          row.last_transaction = lastTxn
            ? {
                transaction_type_id: lastTxn.transaction_type_id,
                material_id: lastTxn.material_id,
                grams: lastTxn.grams,
                running_total_grams: lastTxn.running_total_grams,
                created_at: lastTxn.created_at,
              }
            : null;

          reportData.push(row);
          return null;
        }),
      );

      reportData.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

      responseData.data = reportData;
      responseData.total_users = reportData?.length ?? 0;

      if (template === 1) {
        const templateData = await generateUserInactiveReport(responseData);
        return templateData;
      }

      return responseData;
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async userInactiveReport(req: Request, res: Response) {
    const mandatoryFields = ['start_date', 'end_date', 'template'];
    const requestBody = req.query;

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)).toISOString();
    const endOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
    ).toISOString();

    if (!requestBody.start_date || !requestBody.end_date) {
      requestBody.start_date = startOfMonth.slice(0, 10);
      requestBody.end_date = endOfMonth.slice(0, 10);
    }
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);

    let responseData: typeof prepareJSONResponse;

    if (missingFields.length > 0) {
      const message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const { start_date, end_date, customer_id, template } = requestBody;

        const userInactiveReportData = await this.getUserInactiveReport(
          start_date.toString(),
          end_date.toString(),
          customer_id ? Number(customer_id) : null,
          Number(template) || 0,
        );
        responseData = prepareJSONResponse(userInactiveReportData, 'Success', statusCodes.OK);
      } catch (error) {
        logger.error('Error retrieving in userInactiveReport.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(`userInactiveReport Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }
}
