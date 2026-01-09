import serverless from 'serverless-http';
import app from '../../../utils/express.js';
import { sequelize } from '../../../utils/database.js';
import ReportsController from '../../../controller/ReportsController';
import UsersModel from '../../../models/users';
import CustomerDetailsModel from '../../../models/customerDetails';
import DigitalHoldingsModel from '../../../models/digitalHoldings';
import DigitalPurchaseModel from '../../../models/digitalPurchase';
import PhysicalRedeemModel from '../../../models/physicalRedeem';
import PhysicalDepositModel from '../../../models/physicalDeposit';

import ControllerRoutes from './reports';

const Users = UsersModel(sequelize);
const CustomerDetails = CustomerDetailsModel(sequelize);
const DigitalHoldings = DigitalHoldingsModel(sequelize);
const DigitalPurchase = DigitalPurchaseModel(sequelize);
const PhysicalRedeem = PhysicalRedeemModel(sequelize);
const PhysicalDeposit = PhysicalDepositModel(sequelize);

Users.associate({
  CustomerDetails,
  DigitalPurchase,
  DigitalHoldings,
  PhysicalRedeem,
  PhysicalDeposit,
});
CustomerDetails.associate({ Users, DigitalPurchase, DigitalHoldings });
DigitalHoldings.associate({ Users, CustomerDetails, DigitalPurchase, PhysicalRedeem, PhysicalDeposit });
DigitalPurchase.associate({ Users, CustomerDetails, DigitalHoldings });
PhysicalDeposit.associate({ Users, DigitalHoldings });

const reportsController = new ReportsController(
  Users,
  CustomerDetails,
  DigitalHoldings,
  DigitalPurchase,
  PhysicalRedeem,
  PhysicalDeposit,
);

const reportsControllerRoutes = ControllerRoutes(reportsController);

app.use('/v1/reports', reportsControllerRoutes);

export default serverless(app);
exports.reports = serverless(app);
