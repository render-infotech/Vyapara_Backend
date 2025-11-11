import serverless from 'serverless-http';
import app from '../../../../utils/express.js';
import { sequelize } from '../../../../utils/database.js';
import AdminServiceFeeRateController from '../../../../controller/AdminServiceFeeRateController';
import ServiceFeeRateModel from '../../../../models/serviceFeeRate';
import ControllerRoutes from './service_fee_rates';

const ServiceFeeRate = ServiceFeeRateModel(sequelize);

// ServiceFeeRate.associate({});

const adminServiceFeeRateController = new AdminServiceFeeRateController(ServiceFeeRate);

const adminServiceFeeRateControllerRoutes = ControllerRoutes(adminServiceFeeRateController);

app.use('/v1/service-fee-rates', adminServiceFeeRateControllerRoutes);

export default serverless(app);
exports.service_fee_rates = serverless(app);
