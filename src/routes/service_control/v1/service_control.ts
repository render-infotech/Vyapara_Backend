import express from 'express';
import ServiceControlController from '../../../controller/ServiceControlController';
import Authentication from '../../../middleware/authentication';

const router = express.Router();

export default (serviceControlController: ServiceControlController) => {
  router.post('/activate', Authentication(), serviceControlController.activateService.bind(serviceControlController));
  router.post(
    '/deactivate',
    Authentication(),
    serviceControlController.deactivateService.bind(serviceControlController),
  );
  router.get(
    '/current-status',
    Authentication(),
    serviceControlController.getServiceCurrentStatus.bind(serviceControlController),
  );

  return router;
};
