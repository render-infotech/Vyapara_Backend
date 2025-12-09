import serverless from 'serverless-http';
import app from '../../../utils/express.js';
import { sequelize } from '../../../utils/database.js';
import PhysicalDepositController from '../../../controller/PhysicalDepositController';
import PhysicalDepositModel from '../../../models/physicalDeposit';
import PhysicalDepositProductsModel from '../../../models/physicalDepositProducts';
import UsersModel from '../../../models/users';
import CustomerDetailsModel from '../../../models/customerDetails';
import MaterialRateModel from '../../../models/materialRate';
import VendorDetailsModel from '../../../models/vendorDetails';

import ControllerRoutes from './physical_deposit';

const PhysicalDeposit = PhysicalDepositModel(sequelize);
const PhysicalDepositProducts = PhysicalDepositProductsModel(sequelize);
const Users = UsersModel(sequelize);
const CustomerDetails = CustomerDetailsModel(sequelize);
const MaterialRate = MaterialRateModel(sequelize);
const VendorDetails = VendorDetailsModel(sequelize);

Users.associate({
  CustomerDetails,
  VendorDetails,
  PhysicalDeposit,
});
CustomerDetails.associate({ Users, PhysicalDeposit });
VendorDetails.associate({ Users, PhysicalDeposit });
PhysicalDeposit.associate({ PhysicalDepositProducts, Users, CustomerDetails, VendorDetails });
PhysicalDepositProducts.associate({ PhysicalDeposit });

const physicalDepositController = new PhysicalDepositController(
  PhysicalDeposit,
  PhysicalDepositProducts,
  Users,
  CustomerDetails,
  VendorDetails,
  MaterialRate,
);

const physicalDepositControllerRoutes = ControllerRoutes(physicalDepositController);

app.use('/v1/physical-deposit', physicalDepositControllerRoutes);

export default serverless(app);
exports.physical_deposit = serverless(app);
