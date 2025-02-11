import Joi, { CustomHelpers, LanguageMessages } from 'joi';

export const objectId = (value: string, helpers: CustomHelpers<any>) => {
  if (!value.match(/^[0-9a-fA-F]{24}$/)) {
    return helpers.error('any.invalid');
  }
  return value;
};

export const password = (value: string, helpers: CustomHelpers<any>) => {
  if (value.length < 8) {
    return helpers.error('string.min');
  }
  if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
    return helpers.error('string.regex.base');
  }
  return value;
};

const customMessages: LanguageMessages = {
  'any.invalid': '{{#label}} must be a valid mongo id',
  'string.min': 'password must be at least 8 characters',
  'string.regex.base': 'password must contain at least 1 letter and 1 number',
};

const joiOptions = {
  messages: customMessages,
  abortEarly: false,
};

export const validationSchema = Joi.object({
  objectId: Joi.string().custom(objectId),
  password: Joi.string().custom(password),
}).options(joiOptions);
