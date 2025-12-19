import serverless from 'serverless-http';
import app from '../../../utils/express.js';
import { sequelize } from '../../../utils/database.js';
import ContentPageModel from '../../../models/contentPage';
import ControllerRoutes from './content_page';
import ContentPageController from '../../../controller/ContentPageController';

const ContentPage = ContentPageModel(sequelize);

const contentPageController = new ContentPageController(ContentPage);

const contentPageControllerRoutes = ControllerRoutes(contentPageController);

app.use('/v1/content-page', contentPageControllerRoutes);

export default serverless(app);
exports.content_page = serverless(app);
