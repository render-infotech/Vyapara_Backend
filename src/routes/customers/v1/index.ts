import serverless from 'serverless-http';
import app from '../../../utils/express.js';
import { sequelize } from '../../../utils/database.js';
import CustomerController from '../../../controller/CustomerController';
import UsersModel from '../../../models/users';
import CustomerDetailsModel from '../../../models/customerDetails';
import CustomerAddressModel from '../../../models/customerAddress';
import DigitalPurchaseModel from '../../../models/digitalPurchase';
import ControllerRoutes from './customers';

const Users = UsersModel(sequelize);
const CustomerDetails = CustomerDetailsModel(sequelize);
const CustomerAddress = CustomerAddressModel(sequelize);
const DigitalPurchase = DigitalPurchaseModel(sequelize);

Users.associate({
  CustomerDetails,
  CustomerAddress,
});
CustomerDetails.associate({ Users, CustomerAddress, DigitalPurchase });
CustomerAddress.associate({ Users, CustomerDetails });
DigitalPurchase.associate({ CustomerDetails });

const CustomersController = new CustomerController(Users, CustomerDetails, CustomerAddress, DigitalPurchase);

const CustomersControllerRoutes = ControllerRoutes(CustomersController);

app.use('/v1/customer', CustomersControllerRoutes);

export default serverless(app);
exports.customers = serverless(app);
