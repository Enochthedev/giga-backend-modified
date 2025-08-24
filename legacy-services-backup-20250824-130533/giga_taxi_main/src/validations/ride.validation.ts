import Joi from 'joi';
import { password, objectId } from './custom.validation';

const createAccount = {
  body: Joi.object().keys({
    userID: Joi.string().required(),
    phoneNumber: Joi.string().required(),
  }),
};


const getClosestDrivers = {
  body: Joi.object().keys({
    pickupLocation: Joi.string().required(),
  }),
};

const requestRide = {
  body: Joi.object().keys({
    driverId: Joi.string().required(),
    driverUserId: Joi.string().required(),
    driverType: Joi.string().required(),
    customerId: Joi.string().required(),
    customerUserId: Joi.string().required(),
    pickupLocation: Joi.required(),
    dropOffLocation: Joi.required(),
  }),
};

const rateDriver = {
  body: Joi.object().keys({
    driverUserId: Joi.string().required(),
    rating: Joi.number().required(),
  }),
};

const updatePassword = {
  body: Joi.object().keys({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().required(),
  }),
};

const payTaxiFee = {
  body: Joi.object().keys({
    id: Joi.string().required(),
    token: Joi.string().required(),
    amount: Joi.number().required(),
    narration: Joi.string().required(),
  }),
};


export default {
  createAccount,
  getClosestDrivers,
  requestRide,
  rateDriver,
  payTaxiFee,
};
