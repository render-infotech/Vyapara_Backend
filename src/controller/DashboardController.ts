/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { predefinedRoles, predefinedRedeemFlowStatus, statusCodes } from '../utils/constants';
import UsersModel from '../models/users';
import RiderDetailsModel from '../models/riderDetails';
import PhysicalRedeemModel from '../models/physicalRedeem';
import { prepareJSONResponse } from '../utils/utils';

/**
 * Dashboard Controller
 */
export default class DashboardController {
  // @ts-ignore
  private usersModel: UsersModel;

  // @ts-ignore
  private riderDetailsModel: RiderDetailsModel;

  // @ts-ignore
  private physicalRedeemModel: PhysicalRedeemModel;

  constructor(
    // @ts-ignore
    usersModel: UsersModel,
    // @ts-ignore
    riderDetailsModel: RiderDetailsModel,
    // @ts-ignore
    physicalRedeemModel: PhysicalRedeemModel,
  ) {
    this.usersModel = usersModel;
    this.riderDetailsModel = riderDetailsModel;
    this.physicalRedeemModel = physicalRedeemModel;
  }

  /**
   * Get Admin Dashboard Metrics
   * @param req
   * @param res
   */
  async getAdminDashboard(req: Request, res: Response) {
    let responseData: any = {};
    try {
      // @ts-ignore
      const { role_id } = req.user;
      if (role_id !== predefinedRoles.Admin.id) {
        responseData = prepareJSONResponse({}, 'Access denied. Only Admin can assign vendors.', statusCodes.FORBIDDEN);
        return res.status(responseData.status).json(responseData);
      }
      const totalVendors = await this.usersModel.count({
        where: { role_id: predefinedRoles.Vendor.id },
      });

      const totalCustomers = await this.usersModel.count({
        where: { role_id: predefinedRoles.User.id },
      });

      const totalRiders = await this.usersModel.count({
        where: { role_id: predefinedRoles.Rider.id },
      });

      responseData = prepareJSONResponse(
        {
          total_vendors: totalVendors,
          total_customers: totalCustomers,
          total_riders: totalRiders,
        },
        'Admin dashboard metrics fetched successfully',
        statusCodes.OK,
      );
      return res.status(responseData.status).json(responseData);
    } catch (error) {
      responseData = prepareJSONResponse(
        { error: 'Error Exception.' },
        'Internal Server Error',
        statusCodes.INTERNAL_SERVER_ERROR,
      );
      return res.status(responseData.status).json(responseData);
    }
  }

  /**
   * Get Vendor Dashboard Metrics
   * @param req
   * @param res
   */
  async getVendorDashboard(req: Request, res: Response) {
    let responseData: any = {};
    try {
      // @ts-ignore
      const { userId, role_id } = req.user;
      if (role_id !== predefinedRoles.Vendor.id) {
        responseData = prepareJSONResponse(
          {},
          'Access denied. Only Vendors can accept redemptions.',
          statusCodes.FORBIDDEN,
        );
        return res.status(responseData.status).json(responseData);
      }

      const totalRiders = await this.riderDetailsModel.count({
        where: { vendor_id: userId },
      });

      const totalPendingDeliveries = await this.physicalRedeemModel.count({
        where: {
          vendor_id: userId,
          flow_status: {
            [Op.in]: [predefinedRedeemFlowStatus.Vendor_Assigned.id, predefinedRedeemFlowStatus.Rider_Assigned.id],
          },
        },
      });

      const totalDeliveriesDelivered = await this.physicalRedeemModel.count({
        where: {
          vendor_id: userId,
          flow_status: predefinedRedeemFlowStatus.Delivered.id,
        },
      });

      // Count distinct riders currently out for delivery
      const ridersOutForDelivery = await this.physicalRedeemModel.count({
        distinct: true,
        col: 'rider_id',
        where: {
          vendor_id: userId,
          flow_status: predefinedRedeemFlowStatus.Out_for_Delivery.id,
        },
      });

      responseData = prepareJSONResponse(
        {
          total_riders: totalRiders,
          total_pending_deliveries: totalPendingDeliveries,
          total_deliveries_delivered: totalDeliveriesDelivered,
          riders_out_for_delivery: ridersOutForDelivery,
        },
        'Vendor dashboard metrics fetched successfully',
        statusCodes.OK,
      );
      return res.status(responseData.status).json(responseData);
    } catch (error) {
      responseData = prepareJSONResponse(
        { error: 'Error Exception.' },
        'Internal Server Error',
        statusCodes.INTERNAL_SERVER_ERROR,
      );
      return res.status(responseData.status).json(responseData);
    }
  }

  /**
   * Get Rider Dashboard Metrics
   * @param req
   * @param res
   */
  async getRiderDashboard(req: Request, res: Response) {
    let responseData: any = {};
    try {
      // @ts-ignore
      const { userId, role_id } = req.user;
      const riderId = userId;
      if (role_id !== predefinedRoles.Rider.id) {
        responseData = prepareJSONResponse(
          {},
          'Access denied. Only Riders view their dashboard',
          statusCodes.FORBIDDEN,
        );
        return res.status(responseData.status).json(responseData);
      }

      const totalAssignedRedemptions = await this.physicalRedeemModel.count({
        where: { rider_id: riderId },
      });

      const currentlyOutForDelivery = await this.physicalRedeemModel.count({
        where: {
          rider_id: riderId,
          flow_status: predefinedRedeemFlowStatus.Out_for_Delivery.id,
        },
      });

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const totalRedemptionDeliveriesToday = await this.physicalRedeemModel.count({
        where: {
          rider_id: riderId,
          flow_status: predefinedRedeemFlowStatus.Delivered.id,
          updated_at: {
            [Op.between]: [startOfDay, endOfDay],
          },
        },
      });

      responseData = prepareJSONResponse(
        {
          total_assigned_redemptions: totalAssignedRedemptions,
          currently_out_for_delivery: currentlyOutForDelivery,
          total_redemption_deliveries_today: totalRedemptionDeliveriesToday,
        },
        'Rider dashboard metrics fetched successfully',
        statusCodes.OK,
      );
      return res.status(responseData.status).json(responseData);
    } catch (error) {
      responseData = prepareJSONResponse(
        { error: 'Error Exception.' },
        'Internal Server Error',
        statusCodes.INTERNAL_SERVER_ERROR,
      );
      return res.status(responseData.status).json(responseData);
    }
  }
}
