import express from 'express';
import PhysicalDepositController from '../../../controller/PhysicalDepositController';
import Authentication from '../../../middleware/authentication';

const router = express.Router();

export default (physicalDepositController: PhysicalDepositController) => {
  router.post('/', Authentication(), physicalDepositController.createPhysicalDeposit.bind(physicalDepositController));

  return router;
};
