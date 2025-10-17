import express from 'express';
import VendorController from '../../../controller/VendorController';
import Authentication from '../../../middleware/authentication.js';

const router = express.Router();

export default (vendorsController: VendorController) => {
  router.get('/all', Authentication(), vendorsController.getVendors.bind(vendorsController));
  router.post('/register', Authentication(), vendorsController.registerVendor.bind(vendorsController));
  router.post('/update', Authentication(), vendorsController.updateVendor.bind(vendorsController));
  router.post('/add/material', Authentication(), vendorsController.vendorAddMaterial.bind(vendorsController));
  router.post('/update/material', Authentication(), vendorsController.vendorUpdateMaterial.bind(vendorsController));
  router.post('/delete/material', Authentication(), vendorsController.vendorDeleteMaterial.bind(vendorsController));
  router.post('/add/payment-mode', Authentication(), vendorsController.vendorAddPaymentMode.bind(vendorsController));
  router.post(
    '/delete/payment-mode',
    Authentication(),
    vendorsController.vendorDeletePaymentMode.bind(vendorsController),
  );
  return router;
};
