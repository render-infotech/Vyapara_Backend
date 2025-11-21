import express from 'express';
import PhysicalRedeemController from '../../../controller/PhysicalRedeemController';
import Authentication from '../../../middleware/authentication';

const router = express.Router();

export default (physicalRedeemController: PhysicalRedeemController) => {
  router.post('/', Authentication(), physicalRedeemController.createPhysicalRedeem.bind(physicalRedeemController));
  return router;
};
