import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

global.requestStore = {};

const app = express();
app.use((req, res, next) => {
  global.requestStore.currentRequest = req;
  next();
});
app.use(helmet());
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: '6mb' }));

const corsOptions = {
  origin: '*',
  methods: 'GET,PATCH,POST,DELETE',
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));

export default app;
