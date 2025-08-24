import Joi from 'joi';
import { password, objectId } from './custom.validation';

const createAccount = {
  body: Joi.object().keys({
    userID: Joi.string().required(),
    phoneNumber: Joi.string().required(),
  }),
};


const rateCustomer = {
  body: Joi.object().keys({
    customerUserId: Joi.string().required(),
    rating: Joi.number().required(),
  }),
};

const endTrip = {
  body: Joi.object().keys({
    driverId: Joi.string().required(),
    rideId: Joi.string().required(),
  }),
};

const acceptRide = {
  body: Joi.object().keys({
    driverId: Joi.string().required(),
    rideId: Joi.string().required(),
  }),
};


export default {
  createAccount,
  rateCustomer,
  endTrip,
  acceptRide,
};
