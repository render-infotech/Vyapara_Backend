import serverless from 'serverless-http';
import app from '../../../utils/express.js';
import { sequelize } from '../../../utils/database.js';
import UserController from '../../../controller/UserController';
import UsersModel from '../../../models/users';
import CustomerDetailsModel from '../../../models/customerDetails';
import CustomerAddressModel from '../../../models/customerAddress';
import VendorDetailsModel from '../../../models/vendorDetails';
import DigitalPurchaseModel from '../../../models/digitalPurchase';
import ControllerRoutes from './users';

const Users = UsersModel(sequelize);
const CustomerDetails = CustomerDetailsModel(sequelize);
const CustomerAddress = CustomerAddressModel(sequelize);
const VendorDetails = VendorDetailsModel(sequelize);
const DigitalPurchase = DigitalPurchaseModel(sequelize);

Users.associate({
  CustomerDetails,
  CustomerAddress,
  VendorDetails,
  DigitalPurchase,
});
CustomerDetails.associate({ Users, CustomerAddress, DigitalPurchase });
CustomerAddress.associate({ Users, CustomerDetails });
VendorDetails.associate({ Users });
DigitalPurchase.associate({ Users, CustomerDetails });

const userController = new UserController(Users, CustomerDetails, CustomerAddress, VendorDetails);

const userControllerRoutes = ControllerRoutes(userController);

app.use('/v1/users', userControllerRoutes);

export default serverless(app);
exports.users = serverless(app);
