import serverless from 'serverless-http';
import app from '../../../utils/express.js';
import { sequelize } from '../../../utils/database.js';
import DigitalHoldingController from '../../../controller/DigitalHoldingController';
import UsersModel from '../../../models/users';
import CustomerDetailsModel from '../../../models/customerDetails';
import CustomerAddressModel from '../../../models/customerAddress';
import DigitalPurchaseModel from '../../../models/digitalPurchase';
import DigitalHoldingModel from '../../../models/digitalHolding';
import MaterialRateModel from '../../../models/materialRate';
import TaxRateModel from '../../../models/taxRate';
import ServiceFeeRateModel from '../../../models/serviceFeeRate';
import PhysicalRedeemModel from '../../../models/physicalRedeem';
import PhysicalDepositModel from '../../../models/physicalDeposit';
import VendorDetailsModel from '../../../models/vendorDetails';

import ControllerRoutes from './digital_holding';

const Users = UsersModel(sequelize);
const CustomerDetails = CustomerDetailsModel(sequelize);
const CustomerAddress = CustomerAddressModel(sequelize);
const DigitalPurchase = DigitalPurchaseModel(sequelize);
const DigitalHolding = DigitalHoldingModel(sequelize);
const MaterialRate = MaterialRateModel(sequelize);
const TaxRate = TaxRateModel(sequelize);
const ServiceFeeRate = ServiceFeeRateModel(sequelize);
const PhysicalRedeem = PhysicalRedeemModel(sequelize);
const PhysicalDeposit = PhysicalDepositModel(sequelize);
const VendorDetails = VendorDetailsModel(sequelize);

Users.associate({
  CustomerDetails,
  CustomerAddress,
  DigitalPurchase,
  DigitalHolding,
});
CustomerDetails.associate({ Users, CustomerAddress, DigitalPurchase, DigitalHolding });
CustomerAddress.associate({ Users, CustomerDetails });
DigitalPurchase.associate({ Users, DigitalHolding, CustomerDetails });
DigitalHolding.associate({ Users, DigitalPurchase, CustomerDetails, PhysicalRedeem, PhysicalDeposit });
PhysicalDeposit.associate({ DigitalHolding, VendorDetails });
VendorDetails.associate({ PhysicalDeposit });

const digitalHoldingController = new DigitalHoldingController(
  Users,
  CustomerDetails,
  CustomerAddress,
  DigitalPurchase,
  MaterialRate,
  TaxRate,
  ServiceFeeRate,
  DigitalHolding,
  PhysicalRedeem,
  PhysicalDeposit,
  VendorDetails,
);

const digitalHoldingControllerRoutes = ControllerRoutes(digitalHoldingController);

app.use('/v1/digital-holdings', digitalHoldingControllerRoutes);

export default serverless(app);
exports.digital_holding = serverless(app);
