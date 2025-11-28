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
  router.get('/list', Authentication(), physicalRedeemController.listRedemptions.bind(physicalRedeemController));
  router.post('/assign-vendor', Authentication(), physicalRedeemController.assignVendor.bind(physicalRedeemController));
  router.post('/assign-rider', Authentication(), physicalRedeemController.assignRider.bind(physicalRedeemController));
  router.post('/reject', Authentication(), physicalRedeemController.rejectRedemption.bind(physicalRedeemController));
  router.post(
    '/accept',
    Authentication(),
    physicalRedeemController.acceptRedemptionByVendor.bind(physicalRedeemController),
  );
  router.post(
    '/reject-redemption',
    Authentication(),
    physicalRedeemController.rejectRedemptionByVendor.bind(physicalRedeemController),
  );
  router.post(
    '/rider/accept',
    Authentication(),
    physicalRedeemController.acceptRedemptionByRider.bind(physicalRedeemController),
  );
  router.post(
    '/rider/reject',
    Authentication(),
    physicalRedeemController.rejectRedemptionByRider.bind(physicalRedeemController),
  );
  router.post(
    '/out-for-delivery',
    Authentication(),
    physicalRedeemController.markOutForDelivery.bind(physicalRedeemController),
  );
  router.post(
    '/resend-delivery-otp',
    Authentication(),
    physicalRedeemController.resendDeliveryOtp.bind(physicalRedeemController),
  );
  router.post(
    '/complete-delivery',
    Authentication(),
    physicalRedeemController.markDelivered.bind(physicalRedeemController),
  );
  router.get('/:id', Authentication(), physicalRedeemController.getRedemptionDetails.bind(physicalRedeemController));
  return router;
};
