import express from 'express';
import Authentication from '../../../../middleware/authentication';
import AdminServiceFeeRateController from '../../../../controller/AdminServiceFeeRateController';

const router = express.Router();

export default (adminServiceFeeRateController: AdminServiceFeeRateController) => {
  router.post(
    '/add',
    Authentication(),
    adminServiceFeeRateController.addServiceFeeRate.bind(adminServiceFeeRateController),
  );
  router.get(
    '/latest',
    Authentication(),
    adminServiceFeeRateController.getLatestServiceFeeRate.bind(adminServiceFeeRateController),
  );
  router.post(
    '/service-fee-history',
    Authentication(),
    adminServiceFeeRateController.getServiceFeeRatesHistory.bind(adminServiceFeeRateController),
  );

  return router;
};
