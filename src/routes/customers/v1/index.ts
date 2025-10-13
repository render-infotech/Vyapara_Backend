import serverless from 'serverless-http';
import app from '../../../utils/express.js';
import { sequelize } from '../../../utils/database.js';
import CustomerController from '../../../controller/CustomerController';
import UsersModel from '../../../models/users';
import CustomerDetailsModel from '../../../models/customerDetails';
import ControllerRoutes from './customers';

const Users = UsersModel(sequelize);
const CustomerDetails = CustomerDetailsModel(sequelize);

Users.associate({
  CustomerDetails,
});
CustomerDetails.associate({ Users });

const CustomersController = new CustomerController(Users, CustomerDetails);

const CustomersControllerRoutes = ControllerRoutes(CustomersController);

app.use('/v1/customer', CustomersControllerRoutes);

export default serverless(app);
exports.customers = serverless(app);
