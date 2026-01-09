import express from 'express';
import ReportsController from '../../../controller/ReportsController';
import Authentication from '../../../middleware/authentication';

const router = express.Router();

export default (reportsController: ReportsController) => {
  router.get('/users/active', Authentication(), reportsController.userActiveReport.bind(reportsController));
  router.get('/users/inactive', Authentication(), reportsController.userInactiveReport.bind(reportsController));

  return router;
};
