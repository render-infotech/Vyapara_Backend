import express from 'express';
import CustomerController from '../../../controller/CustomerController';
import Authentication from '../../../middleware/authentication.js';

const router = express.Router();

export default (customersController: CustomerController) => {
  router.get('/', Authentication(), customersController.getCustomer.bind(customersController));
  router.post('/create', Authentication(), customersController.createCustomerDetails.bind(customersController));
  router.post('/update', Authentication(), customersController.updateCustomerDetails.bind(customersController));
  router.post('/enable-login', Authentication(), customersController.reactivateCustomer.bind(customersController));
  router.post('/disable-login', Authentication(), customersController.deactivateCustomer.bind(customersController));
  router.post('/delete', Authentication(), customersController.deleteCustomer.bind(customersController));
  return router;
};
