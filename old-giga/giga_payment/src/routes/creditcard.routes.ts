import { NextFunction, Request, response, Response, Router } from "express";
import CreditCardController from "../controllers/creditCard.controller";
// import validate from '../middleware/validate';
// import validations from '../validations';


const router = Router();

router
  .route('/createCard')
  .post(CreditCardController.createCreditCard)

router
.route('/validate')
  .post(CreditCardController.validateTransaction)

router
.route('/payFee')
.post(CreditCardController.payFee)

  export default router;