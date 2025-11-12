import express from 'express';
import CustomerController from '../../../controller/CustomerController';
import Authentication from '../../../middleware/authentication';
import Obsolete from '../../../middleware/obsolete';

const router = express.Router();

export default (customersController: CustomerController) => {
  router.get('/', Authentication(), customersController.getCustomer.bind(customersController));
  router.post('/create', Obsolete(), customersController.createCustomerDetails.bind(customersController));
  router.post('/update', Authentication(), customersController.updateCustomerDetails.bind(customersController));
  router.get('/address/all', Authentication(), customersController.getCustomerAddresses.bind(customersController));
  router.post('/address/create', Authentication(), customersController.createCustomerAddress.bind(customersController));
  router.post('/address/update', Authentication(), customersController.updateCustomerAddress.bind(customersController));
  router.post('/address/delete', Authentication(), customersController.deleteCustomerAddress.bind(customersController));
  router.post('/enable-login', Authentication(), customersController.reactivateCustomer.bind(customersController));
  router.post('/disable-login', Authentication(), customersController.deactivateCustomer.bind(customersController));
  router.post('/delete', Authentication(), customersController.deleteCustomer.bind(customersController));
  router.post(
    '/digital-purchase/step-1',
    Authentication(),
    customersController.getDigitalPurchasePreview.bind(customersController),
  );
  router.post(
    '/digital-purchase/create',
    Authentication(),
    customersController.createDigitalPurchase.bind(customersController),
  );
  router.get(
    '/digital-purchase/get',
    Authentication(),
    customersController.getDigitalPurchase.bind(customersController),
  );
  return router;
};
