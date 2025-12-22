import serverless from 'serverless-http';
import app from '../../../utils/express.js';
import { sequelize } from '../../../utils/database.js';
import PhysicalRedeemController from '../../../controller/PhysicalRedeemController';
import PhysicalRedeemModel from '../../../models/physicalRedeem';
import UsersModel from '../../../models/users';
import CustomerDetailsModel from '../../../models/customerDetails';
import CustomerAddressModel from '../../../models/customerAddress';
import DigitalHoldingModel from '../../../models/digitalHolding';
import MaterialRateModel from '../../../models/materialRate';
import VendorDetailsModel from '../../../models/vendorDetails';
import RiderDetailsModel from '../../../models/riderDetails';
import ProductsModel from '../../../models/products';
import DigitalPurchaseModel from '../../../models/digitalPurchase';
import OtpLogModel from '../../../models/otpLog';
import ServiceControlModel from '../../../models/serviceControl';

import ControllerRoutes from './physical_redeem';

const PhysicalRedeem = PhysicalRedeemModel(sequelize);
const Users = UsersModel(sequelize);
const CustomerDetails = CustomerDetailsModel(sequelize);
const CustomerAddress = CustomerAddressModel(sequelize);
const MaterialRate = MaterialRateModel(sequelize);
const DigitalHolding = DigitalHoldingModel(sequelize);
const VendorDetails = VendorDetailsModel(sequelize);
const RiderDetails = RiderDetailsModel(sequelize);
const Products = ProductsModel(sequelize);
const DigitalPurchase = DigitalPurchaseModel(sequelize);
const OtpLog = OtpLogModel(sequelize);
const ServiceControl = ServiceControlModel(sequelize);

PhysicalRedeem.associate({ Users, CustomerDetails, CustomerAddress, VendorDetails });
Users.associate({
  CustomerDetails,
  CustomerAddress,
  DigitalHolding,
  VendorDetails,
  PhysicalRedeem,
  OtpLog,
});
CustomerDetails.associate({ Users, CustomerAddress, DigitalHolding, PhysicalRedeem });
CustomerAddress.associate({ Users, CustomerDetails, PhysicalRedeem });
DigitalHolding.associate({ Users, CustomerDetails });
VendorDetails.associate({ Users, PhysicalRedeem });
OtpLog.associate({ Users });

const physicalRedeemController = new PhysicalRedeemController(
  PhysicalRedeem,
  Users,
  CustomerDetails,
  CustomerAddress,
  MaterialRate,
  DigitalHolding,
  VendorDetails,
  RiderDetails,
  Products,
  DigitalPurchase,
  OtpLog,
  ServiceControl,
);

const physicalRedeemControllerRoutes = ControllerRoutes(physicalRedeemController);

app.use('/v1/physical-redeem', physicalRedeemControllerRoutes);

export default serverless(app);
exports.physical_redeem = serverless(app);
