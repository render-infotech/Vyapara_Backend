import serverless from 'serverless-http';
import app from '../../../utils/express.js';
import { sequelize } from '../../../utils/database.js';
import CustomerController from '../../../controller/CustomerController';
import UsersModel from '../../../models/users';
import CustomerDetailsModel from '../../../models/customerDetails';
import CustomerAddressModel from '../../../models/customerAddress';
import DigitalPurchaseModel from '../../../models/digitalPurchase';
import DigitalHoldingsModel from '../../../models/digitalHoldings';
import MaterialRateModel from '../../../models/materialRate';
import TaxRateModel from '../../../models/taxRate';
import ServiceFeeRateModel from '../../../models/serviceFeeRate';
import PhysicalRedeemModel from '../../../models/physicalRedeem';
import ControllerRoutes from './customers';

const Users = UsersModel(sequelize);
const CustomerDetails = CustomerDetailsModel(sequelize);
const CustomerAddress = CustomerAddressModel(sequelize);
const DigitalPurchase = DigitalPurchaseModel(sequelize);
const DigitalHoldings = DigitalHoldingsModel(sequelize);
const MaterialRate = MaterialRateModel(sequelize);
const TaxRate = TaxRateModel(sequelize);
const ServiceFeeRate = ServiceFeeRateModel(sequelize);
const PhysicalRedeem = PhysicalRedeemModel(sequelize);

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

const customerController = new CustomerController(
  Users,
  CustomerDetails,
  CustomerAddress,
  DigitalPurchase,
  MaterialRate,
  TaxRate,
  ServiceFeeRate,
  DigitalHoldings,
  PhysicalRedeem,
);

const customerControllerRoutes = ControllerRoutes(customerController);

app.use('/v1/customer', customerControllerRoutes);

export default serverless(app);
exports.customers = serverless(app);
