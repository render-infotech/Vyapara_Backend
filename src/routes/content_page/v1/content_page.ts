import express from 'express';
import ContentPageController from '../../../controller/ContentPageController';
import Authentication from '../../../middleware/authentication';

const router = express.Router();

export default (contentPageController: ContentPageController) => {
  router.get('/get-all', contentPageController.getAllPages.bind(contentPageController));
  router.get('/get-one', contentPageController.getPageById.bind(contentPageController));
  router.post('/save', Authentication(), contentPageController.createPage.bind(contentPageController));
  router.post('/update', Authentication(), contentPageController.updatePage.bind(contentPageController));
  router.get('/delete', Authentication(), contentPageController.deletePage.bind(contentPageController));

  return router;
};
