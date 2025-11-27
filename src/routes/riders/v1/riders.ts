import express from 'express';
import RiderController from '../../../controller/RiderController';
import Authentication from '../../../middleware/authentication';

const router = express.Router();

export default (riderController: RiderController) => {
  router.post('/', Authentication(), riderController.createRider.bind(riderController));
  router.get('/', Authentication(), riderController.listRiders.bind(riderController));
  router.get('/all', Authentication(), riderController.listAllRiders.bind(riderController));
  router.put('/:id', Authentication(), riderController.updateRider.bind(riderController));
  router.delete('/:id', Authentication(), riderController.deleteRider.bind(riderController));
  return router;
};
