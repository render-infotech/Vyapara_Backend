import express from 'express';
import DigitalHoldingController from '../../../controller/DigitalHoldingController';
import Authentication from '../../../middleware/authentication';

const router = express.Router();

export default (digitalHoldingController: DigitalHoldingController) => {
  router.post(
    '/customer/all',
    Authentication(),
    digitalHoldingController.getCustomersCurrentHoldings.bind(digitalHoldingController),
  );
  return router;
};
