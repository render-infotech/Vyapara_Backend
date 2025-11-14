import express from 'express';
import VendorController from '../../../controller/VendorController';
import Authentication from '../../../middleware/authentication';
import Obsolete from '../../../middleware/obsolete';

const router = express.Router();

export default (vendorsController: VendorController) => {
  router.get('/all', Authentication(), vendorsController.getVendors.bind(vendorsController));
  router.post('/register', Authentication(), vendorsController.registerVendor.bind(vendorsController));
  router.post('/update', Authentication(), vendorsController.updateVendor.bind(vendorsController));
  router.post('/add/material', Authentication(), vendorsController.vendorAddMaterial.bind(vendorsController));
  router.post('/update/material', Obsolete(), vendorsController.vendorUpdateMaterial.bind(vendorsController));
  router.post('/delete/material', Authentication(), vendorsController.vendorDeleteMaterial.bind(vendorsController));
  router.post('/add/payment-mode', Authentication(), vendorsController.vendorAddPaymentMode.bind(vendorsController));
  router.post(
    '/delete/payment-mode',
    Authentication(),
    vendorsController.vendorDeletePaymentMode.bind(vendorsController),
  );
  router.post('/add/working-hours', Authentication(), vendorsController.vendorAddWorkingHour.bind(vendorsController));
  router.post('/update/working-hours', Obsolete(), vendorsController.vendorUpdateWorkingHour.bind(vendorsController));
  router.post(
    '/delete/working-hours',
    Authentication(),
    vendorsController.vendorDeleteWorkingHour.bind(vendorsController),
  );
  router.post('/enable-login', Authentication(), vendorsController.reactivateVendor.bind(vendorsController));
  router.post('/disable-login', Authentication(), vendorsController.deactivateVendor.bind(vendorsController));
  router.post('/delete', Authentication(), vendorsController.deleteVendor.bind(vendorsController));
  return router;
};
