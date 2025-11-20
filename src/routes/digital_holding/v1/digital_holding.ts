import express from 'express';
import DigitalHoldingController from '../../../controller/DigitalHoldingController';
import Authentication from '../../../middleware/authentication';

const router = express.Router();

export default (digitalHoldingController: DigitalHoldingController) => {
  router.post(
    '/',
    Authentication(),
    digitalHoldingController.getCustomerCurrentHoldings.bind(digitalHoldingController),
  );
  router.post(
    '/history',
    Authentication(),
    digitalHoldingController.getCustomerHoldings.bind(digitalHoldingController),
  );
  return router;
};
