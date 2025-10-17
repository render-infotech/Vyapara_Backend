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

const VendorsController = new VendorController(Users, VendorDetails, CustomerDetails);

const VendorsControllerRoutes = ControllerRoutes(VendorsController);

app.use('/v1/vendor', VendorsControllerRoutes);

export default serverless(app);
exports.vendors = serverless(app);
