import express from 'express';
import Authentication from '../../../../middleware/authentication';
import AdminMaterialRateController from '../../../../controller/AdminMaterialRateController';

const router = express.Router();

export default (adminMaterialRateController: AdminMaterialRateController) => {
  router.post('/add', Authentication(), adminMaterialRateController.addMaterialRate.bind(adminMaterialRateController));
  router.get(
    '/live-rate',
    Authentication(),
    adminMaterialRateController.getMaterialLatestRate.bind(adminMaterialRateController),
  );
  router.post(
    '/rate-history',
    Authentication(),
    adminMaterialRateController.getMaterialRatesHistory.bind(adminMaterialRateController),
  );

  return router;
};
