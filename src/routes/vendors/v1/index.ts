import serverless from 'serverless-http';
import app from '../../../utils/express.js';
import { sequelize } from '../../../utils/database.js';
import VendorController from '../../../controller/VendorController';
import UsersModel from '../../../models/users';
import VendorDetailsModel from '../../../models/vendorDetails';
import CustomerDetailsModel from '../../../models/customerDetails';
import ControllerRoutes from './vendors';

const Users = UsersModel(sequelize);
const VendorDetails = VendorDetailsModel(sequelize);
const CustomerDetails = CustomerDetailsModel(sequelize);

Users.associate({
  CustomerDetails,
  VendorDetails,
});
VendorDetails.associate({ Users });
CustomerDetails.associate({ Users });

const vendorController = new VendorController(Users, VendorDetails, CustomerDetails);

const vendorControllerRoutes = ControllerRoutes(vendorController);

app.use('/v1/vendor', vendorControllerRoutes);

export default serverless(app);
exports.vendors = serverless(app);
