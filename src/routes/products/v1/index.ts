import serverless from 'serverless-http';
import app from '../../../utils/express.js';
import { sequelize } from '../../../utils/database.js';
import AdminProductController from '../../../controller/AdminProductController';
import ProductsModel from '../../../models/products';
import ControllerRoutes from './products';

const Products = ProductsModel(sequelize);

// Products.associate({});

const adminProductController = new AdminProductController(Products);

const adminProductControllerRoutes = ControllerRoutes(adminProductController);

app.use('/v1/products', adminProductControllerRoutes);

export default serverless(app);
exports.products = serverless(app);
