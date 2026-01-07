import serverless from 'serverless-http';
import app from '../../../utils/express.js';
import { sequelize } from '../../../utils/database.js';
import DigitalPurchaseController from '../../../controller/DigitalPurchaseController';
import UsersModel from '../../../models/users';
import CustomerDetailsModel from '../../../models/customerDetails';
import CustomerAddressModel from '../../../models/customerAddress';
import DigitalPurchaseModel from '../../../models/digitalPurchase';
import DigitalHoldingsModel from '../../../models/digitalHoldings';
import MaterialRateModel from '../../../models/materialRate';
import TaxRateModel from '../../../models/taxRate';
import ServiceFeeRateModel from '../../../models/serviceFeeRate';
import ServiceControlModel from '../../../models/serviceControl';

import ControllerRoutes from './digital_purchase';

const Users = UsersModel(sequelize);
const CustomerDetails = CustomerDetailsModel(sequelize);
const CustomerAddress = CustomerAddressModel(sequelize);
const DigitalPurchase = DigitalPurchaseModel(sequelize);
const DigitalHoldings = DigitalHoldingsModel(sequelize);
const MaterialRate = MaterialRateModel(sequelize);
const TaxRate = TaxRateModel(sequelize);
const ServiceFeeRate = ServiceFeeRateModel(sequelize);
const ServiceControl = ServiceControlModel(sequelize);

Users.associate({
  CustomerDetails,
  CustomerAddress,
  DigitalPurchase,
  DigitalHoldings,
});
CustomerDetails.associate({ Users, CustomerAddress });
CustomerAddress.associate({ Users, CustomerDetails });
DigitalPurchase.associate({ Users, DigitalHoldings });
DigitalHoldings.associate({ Users, DigitalPurchase });

const digitalPurchaseController = new DigitalPurchaseController(
  Users,
  CustomerDetails,
  CustomerAddress,
  DigitalPurchase,
  MaterialRate,
  TaxRate,
  ServiceFeeRate,
  DigitalHoldings,
  ServiceControl,
);

const digitalPurchaseControllerRoutes = ControllerRoutes(digitalPurchaseController);

app.use('/v1/digital-purchase', digitalPurchaseControllerRoutes);

export default serverless(app);
exports.digital_purchase = serverless(app);
