import serverless from 'serverless-http';
import app from '../../../../utils/express.js';
import { sequelize } from '../../../../utils/database.js';
import AdminMaterialRateController from '../../../../controller/AdminMaterialRateController';
import MaterialRateModel from '../../../../models/materialRate';
import ControllerRoutes from './material_rates';

const MaterialRate = MaterialRateModel(sequelize);

// MaterialRate.associate({});

const AdminMaterialRatesController = new AdminMaterialRateController(MaterialRate);

const UsersControllerRoutes = ControllerRoutes(AdminMaterialRatesController);

app.use('/v1/material-rates', UsersControllerRoutes);

export default serverless(app);
exports.material_rates = serverless(app);
