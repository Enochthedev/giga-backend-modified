// This route handles all the payment related request for the taxi app only (giga_taxi)
import { NextFunction, Request, response, Response, Router } from "express";
import TaxiController from "../controllers/taxi.payment.controller";
import SUCCESS from "../utils/successResponse";
import { valid } from "joi";

const router = Router();

// post request to create a new payment for a particular order
router
  .route('/')
  .post(TaxiController.payRideFee)

// router.post(
//     "/connect-card",
//     // validateWorkSpaceOwnership,
//     async (req: Request, res: Response, next: NextFunction) => {
//         return res.status(201).json(SUCCESS("Hello world,this is  where you collect the card details of the user and add it to their dashboard"));
//     }
// );

// router.post(
//     "/charge-card-stripe:cardId",
//     // validateWorkSpaceOwnership,
//     async (req: Request, res: Response, next: NextFunction) => {
//         return res.status(201).json(SUCCESS("Hello world,this is where you charge the user's card, cardId is the id of the card you want to charge using the stripe api"));
//     }
// );

// router.post(
//     "/charge-card-paystack:cardId",
//     // validateWorkSpaceOwnership,
//     async (req: Request, res: Response, next: NextFunction) => {
//         return res.status(201).json(SUCCESS("Hello world,this is where you charge the user's card, cardId is the id of the card you want to charge using the paystack api"));
//     }
// );

// router.post(
//     "/charge-card-flutterwave:cardId",
//     // validateWorkSpaceOwnership,
//     async (req: Request, res: Response, next: NextFunction) => {
//         return res.status(201).json(SUCCESS("Hello world,this is where you charge the user's card, cardId is the id of the card you want to charge using the flutterwave api"));
//     }
// );

// router.post(
//     "/charge-card-paypal:cardId",
//     // validateWorkSpaceOwnership,
//     async (req: Request, res: Response, next: NextFunction) => {
//         return res.status(201).json(SUCCESS("Hello world,this is where you charge the user's card, cardId is the id of the card you want to charge using the paypal api"));
//     }
// );

// //temporary card endpoints in case the user doesn't want to save their card details
// router.post(
//     "/charge-card-stripe",
//     // validateWorkSpaceOwnership,
//     async (req: Request, res: Response, next: NextFunction) => {
//         return res.status(201).json(SUCCESS("This is where you charge the user's card, using the stripe api, takes the temp card without saving it"));
//     }
// );

// router.post(
//     "/charge-card-paystack",
//     // validateWorkSpaceOwnership,
//     async (req: Request, res: Response, next: NextFunction) => {
//         return res.status(201).json(SUCCESS("This is where you charge the user's card, using the paystack api, takes the temp card without saving it"));
//     }
// );

// router.post(
//     "/charge-card-flutterwave",
//     // validateWorkSpaceOwnership,
//     async (req: Request, res: Response, next: NextFunction) => {
//         return res.status(201).json(SUCCESS("This is where you charge the user's card, using the flutterwave api, takes the temp card without saving it"));
//     }
// );

// router.post(
//     "/charge-card-paypal",
//     // validateWorkSpaceOwnership,
//     async (req: Request, res: Response, next: NextFunction) => {
//         return res.status(201).json(SUCCESS("This is where you charge the user's card, using the paypal api, takes the temp card without saving it"));
//     }
// );

// router.post(
//     "/credit-bank-account-stripe",
//     // validateWorkSpaceOwnership,
//     async (req: Request, res: Response, next: NextFunction) => {
//         return res.status(201).json(SUCCESS("This is where you credit the user's bank account, using the stripe api"));
//     }
// );

// router.post(
//     "/credit-bank-account-paystack",
//     // validateWorkSpaceOwnership,
//     async (req: Request, res: Response, next: NextFunction) => {
//         return res.status(201).json(SUCCESS("This is where you credit the user's bank account, using the paystack api"));
//     }
// );

// router.post(
//     "/credit-stripe-account-stripe",
//     // validateWorkSpaceOwnership,
//     async (req: Request, res: Response, next: NextFunction) => {
//         // this is where you credit the user's stripe account, using the stripe api
//         return res.status(201).json(SUCCESS("This is where you credit the user's stripe account, using the stripe api"));
//     }
// );

// router.post(
//     "/credit-stripe-account-paystack",
//     // validateWorkSpaceOwnership,
//     async (req: Request, res: Response, next: NextFunction) => {
//         // this is where you credit the user's stripe account, using the paystack api
//         return res.status(201).json(SUCCESS("This is where you credit the user's stripe account, using the paystack api"));
//     }
// );

// router.post(
//     "/credit-paypal-account-paypal",
//     // validateWorkSpaceOwnership,
//     async (req: Request, res: Response, next: NextFunction) => {
//         // this is where you credit the user's paypal account, using the flutterwave api
//         return res.status(201).json(SUCCESS("This is where you credit the user's paypal account, using the flutterwave api"));
//     }
// );






export default router;