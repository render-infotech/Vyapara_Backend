import express from 'express';
import DigitalPurchaseController from '../../../controller/DigitalPurchaseController';
import Authentication from '../../../middleware/authentication';

const router = express.Router();

export default (digitalPurchaseController: DigitalPurchaseController) => {
  router.post(
    '/step-1',
    Authentication(),
    digitalPurchaseController.getDigitalPurchasePreview.bind(digitalPurchaseController),
  );
  router.post(
    '/create',
    Authentication(),
    digitalPurchaseController.createDigitalPurchase.bind(digitalPurchaseController),
  );
  router.get(
    '/get',
    Authentication(),
    digitalPurchaseController.getDigitalPurchaseList.bind(digitalPurchaseController),
  );
  router.post(
    '/all',
    Authentication(),
    digitalPurchaseController.getAllCustomersDigitalPurchases.bind(digitalPurchaseController),
  );
  router.post(
    '/verify-payment',
    Authentication(),
    digitalPurchaseController.verifyPayment.bind(digitalPurchaseController),
  );
  router.post(
    '/razorpay/webhook',
    express.json({ type: '*/*' }),
    digitalPurchaseController.handleRazorpayWebhook.bind(digitalPurchaseController),
  );
  return router;
};
