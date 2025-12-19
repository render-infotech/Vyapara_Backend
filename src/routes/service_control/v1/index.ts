import serverless from 'serverless-http';
import app from '../../../utils/express.js';
import { sequelize } from '../../../utils/database.js';
import ServiceControlModel from '../../../models/serviceControl';
import ControllerRoutes from './service_control';
import ServiceControlController from '../../../controller/ServiceControlController';

const ServiceControl = ServiceControlModel(sequelize);

const serviceControlController = new ServiceControlController(ServiceControl);

const serviceControlControllerRoutes = ControllerRoutes(serviceControlController);

app.use('/v1/service-control', serviceControlControllerRoutes);

export default serverless(app);
exports.service_control = serverless(app);
