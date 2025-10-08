import serverless from 'serverless-http';
import app from '../../../utils/express.js';
import { sequelize } from '../../../utils/database.js';
import UserController from '../../../controller/UserController';
import UsersModel from '../../../models/users';
import ControllerRoutes from './users';

const Users = UsersModel(sequelize);

// Users.associate({
//   Franchisor: FranchiseeCompany,
//   Franchisee: FranchiseeCompany,
//   CaregiverDetails,
//   Institutions,
//   OfficeUsers,
// });

const UsersController = new UserController(Users);

const UsersControllerRoutes = ControllerRoutes(UsersController);

app.use('/v1/users', UsersControllerRoutes);

export default serverless(app);
exports.users = serverless(app);
