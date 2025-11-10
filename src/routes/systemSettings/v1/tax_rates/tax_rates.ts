import express from 'express';
import Authentication from '../../../../middleware/authentication';
import AdminTaxRateController from '../../../../controller/AdminTaxRateController';

const router = express.Router();

export default (adminTaxRateController: AdminTaxRateController) => {
  router.post('/add', Authentication(), adminTaxRateController.addTaxRate.bind(adminTaxRateController));
  router.get('/latest', Authentication(), adminTaxRateController.getTaxLatestRate.bind(adminTaxRateController));
  router.post('/tax-history', Authentication(), adminTaxRateController.getTaxRatesHistory.bind(adminTaxRateController));

  return router;
};
