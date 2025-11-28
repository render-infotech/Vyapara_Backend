import serverless from 'serverless-http';
import app from '../../../utils/express';
import { sequelize } from '../../../utils/database';
import DashboardController from '../../../controller/DashboardController';
import UsersModel from '../../../models/users';
import RiderDetailsModel from '../../../models/riderDetails';
import PhysicalRedeemModel from '../../../models/physicalRedeem';
import DashboardRoutes from './dashboard';

const Users = UsersModel(sequelize);
const RiderDetails = RiderDetailsModel(sequelize);
const PhysicalRedeem = PhysicalRedeemModel(sequelize);

const dashboardController = new DashboardController(Users, RiderDetails, PhysicalRedeem);
const dashboardRoutes = DashboardRoutes(dashboardController);

app.use('/v1/dashboard', dashboardRoutes);

export default serverless(app);
exports.dashboard = serverless(app);
