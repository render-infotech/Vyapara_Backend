import express from 'express';
import PhysicalDepositController from '../../../controller/PhysicalDepositController';
import Authentication from '../../../middleware/authentication';

const router = express.Router();

export default (physicalDepositController: PhysicalDepositController) => {
  router.post(
    '/step-1',
    Authentication(),
    physicalDepositController.checkUserKYCVerifiction.bind(physicalDepositController),
  );
  router.post(
    '/verify/otp-1',
    Authentication(),
    physicalDepositController.startPhysicalDeposit.bind(physicalDepositController),
  );
  router.post(
    '/step-2',
    Authentication(),
    physicalDepositController.addProductsPhysicalDeposit.bind(physicalDepositController),
  );
  router.post(
    '/step-3',
    Authentication(),
    physicalDepositController.summaryPhysicalDeposit.bind(physicalDepositController),
  );
  router.post(
    '/verify/otp-2',
    Authentication(),
    physicalDepositController.completePhysicalDeposit.bind(physicalDepositController),
  );
  router.post('/get', Authentication(), physicalDepositController.getPhysicalDeposit.bind(physicalDepositController));

  return router;
};
