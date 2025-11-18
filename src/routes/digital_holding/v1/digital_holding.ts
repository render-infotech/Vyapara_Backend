import express from 'express';
import DigitalHoldingController from '../../../controller/DigitalHoldingController';
import Authentication from '../../../middleware/authentication';

const router = express.Router();

export default (digitalHoldingController: DigitalHoldingController) => {
  router.post(
    '/all',
    Authentication(),
    digitalHoldingController.getAllCustomersDigitalHoldings.bind(digitalHoldingController),
  );
  return router;
};
