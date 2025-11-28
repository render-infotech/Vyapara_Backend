import express from 'express';
import DashboardController from '../../../controller/DashboardController';
import Authentication from '../../../middleware/authentication';

const router = express.Router();

export default (dashboardController: DashboardController) => {
  router.get('/admin', Authentication(), dashboardController.getAdminDashboard.bind(dashboardController));
  router.get('/vendor', Authentication(), dashboardController.getVendorDashboard.bind(dashboardController));
  router.get('/rider', Authentication(), dashboardController.getRiderDashboard.bind(dashboardController));
  return router;
};
