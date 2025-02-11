import express from 'express';
import mongoose from 'mongoose';
import * as dotEnv from 'dotenv';
import ApiError from './utils/ApiError';
import httpStatus from 'http-status';
import router from './routes/routesConfig';
import cors from 'cors';
import { errorConverter, errorHandler } from './middleware/error';
//import the rabbit mq here

const app = express();
const port = process.env.PORT || 5000;

dotEnv.config();
// Bodyparser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

app.use(router);
/* This code is creating a middleware function that will be executed for any incoming request that does
not match any of the defined routes. It creates a new instance of the `ApiError` class with a
`NOT_FOUND` status code and a message of `'Not found'`, and passes it to the `next` function. This
will trigger the error handling middleware to handle the error and send an appropriate response to
the client. */
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});
mongoose.connect(process.env.DB_HOST as string).catch((e) => {
  console.log(e);
});

mongoose.connection.on('open', () => {
  console.log('Mongoose Connection');
});

//add the rabbit mq here


app.use(errorConverter);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`ductape-apps-api application is running on port ${port}.`);
});