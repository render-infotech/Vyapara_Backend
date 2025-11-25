import express from 'express';
import PhysicalRedeemController from '../../../controller/PhysicalRedeemController';
import Authentication from '../../../middleware/authentication';

const router = express.Router();

export default (physicalRedeemController: PhysicalRedeemController) => {
  router.post('/', Authentication(), physicalRedeemController.createPhysicalRedeem.bind(physicalRedeemController));
  router.post(
    '/generate-otp',
    Authentication(),
    physicalRedeemController.generateRedeemOtp.bind(physicalRedeemController),
  );
  router.get('/', Authentication(), physicalRedeemController.listRedemptions.bind(physicalRedeemController));
  router.post(
    '/assign-vendor',
    Authentication(),
    physicalRedeemController.assignVendor.bind(physicalRedeemController),
  );
  router.post('/reject', Authentication(), physicalRedeemController.rejectRedemption.bind(physicalRedeemController));
  router.get('/:id', Authentication(), physicalRedeemController.getRedemptionDetails.bind(physicalRedeemController));
  return router;
};
