import express from 'express';
import AdminProductController from '../../../controller/AdminProductController';
import Authentication from '../../../middleware/authentication';

const router = express.Router();

export default (adminProductController: AdminProductController) => {
  router.post('/create', Authentication(), adminProductController.createProduct.bind(adminProductController));
  router.post('/all', Authentication(), adminProductController.getAllProducts.bind(adminProductController));
  router.post('/get-one', Authentication(), adminProductController.getProductById.bind(adminProductController));
  router.post('/update', Authentication(), adminProductController.updateProduct.bind(adminProductController));
  router.post(
    '/enable-product',
    Authentication(),
    adminProductController.reactivateProduct.bind(adminProductController),
  );
  router.post(
    '/disable-product',
    Authentication(),
    adminProductController.deactivateProduct.bind(adminProductController),
  );
  return router;
};
