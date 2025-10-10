import serverless from 'serverless-http';
import app from '../../../utils/express.js';
import { sequelize } from '../../../utils/database.js';
import UserController from '../../../controller/UserController';
import UsersModel from '../../../models/users';
import CustomerDetailsModel from '../../../models/customerDetails';
import ControllerRoutes from './users';

const Users = UsersModel(sequelize);
const CustomerDetails = CustomerDetailsModel(sequelize);

Users.associate({
  CustomerDetails,
});
CustomerDetails.associate({ Users });

const UsersController = new UserController(Users, CustomerDetails);

const UsersControllerRoutes = ControllerRoutes(UsersController);

app.use('/v1/users', UsersControllerRoutes);

export default serverless(app);
exports.users = serverless(app);
