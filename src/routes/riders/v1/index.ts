import serverless from 'serverless-http';
import app from '../../../utils/express.js';
import { sequelize } from '../../../utils/database.js';
import RiderController from '../../../controller/RiderController';
import UsersModel from '../../../models/users';
import RiderDetailsModel from '../../../models/riderDetails';
import VendorDetailsModel from '../../../models/vendorDetails';

import ControllerRoutes from './riders';

const Users = UsersModel(sequelize);
const RiderDetails = RiderDetailsModel(sequelize);
const VendorDetails = VendorDetailsModel(sequelize);

// Initialize associations
RiderDetails.associate({ Users });
Users.associate({ RiderDetails, VendorDetails });
VendorDetails.associate({ Users });

const riderController = new RiderController(Users, RiderDetails);

const riderControllerRoutes = ControllerRoutes(riderController);

app.use('/v1/riders', riderControllerRoutes);

export default serverless(app);
exports.riders = serverless(app);
