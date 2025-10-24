import serverless from 'serverless-http';
import app from '../../../utils/express.js';
import { sequelize } from '../../../utils/database.js';
import UserController from '../../../controller/UserController';
import UsersModel from '../../../models/users';
import CustomerDetailsModel from '../../../models/customerDetails';
import CustomerAddressModel from '../../../models/customerAddress';
import VendorDetailsModel from '../../../models/vendorDetails';
import ControllerRoutes from './users';

const Users = UsersModel(sequelize);
const CustomerDetails = CustomerDetailsModel(sequelize);
const CustomerAddress = CustomerAddressModel(sequelize);
const VendorDetails = VendorDetailsModel(sequelize);

Users.associate({
  CustomerDetails,
  CustomerAddress,
  VendorDetails,
});
CustomerDetails.associate({ Users, CustomerAddress });
CustomerAddress.associate({ Users, CustomerDetails });
VendorDetails.associate({ Users });

const UsersController = new UserController(Users, CustomerDetails, CustomerAddress, VendorDetails);

const UsersControllerRoutes = ControllerRoutes(UsersController);

app.use('/v1/users', UsersControllerRoutes);

export default serverless(app);
exports.users = serverless(app);
