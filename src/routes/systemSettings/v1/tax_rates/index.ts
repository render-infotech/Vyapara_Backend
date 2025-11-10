import serverless from 'serverless-http';
import app from '../../../../utils/express.js';
import { sequelize } from '../../../../utils/database.js';
import AdminTaxRateController from '../../../../controller/AdminTaxRateController';
import TaxRateModel from '../../../../models/taxRate';
import ControllerRoutes from './tax_rates';

const TaxRate = TaxRateModel(sequelize);

// TaxRate.associate({});

const adminTaxRateController = new AdminTaxRateController(TaxRate);

const adminTaxRateControllerRoutes = ControllerRoutes(adminTaxRateController);

app.use('/v1/tax-rates', adminTaxRateControllerRoutes);

export default serverless(app);
exports.tax_rates = serverless(app);
