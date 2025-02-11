import { Router } from "express";
import appsApi from "./user.routes";
import ecommercePaymentApi from "./ecommerce.payment.routes";
import adsPaymentApi from "./ads.payment.routes";
import hotelsPaymentApi from "./hotels.payment.routes";
import socialMediaPaymentApi from "./social.payment.routes";
import taxiPaymentApi from "./taxi.payment.routes";
import admin from "./admin.payment.routes";
import subAdmin from "./subAdmin.payment.routes";
import creditCard from "./creditcard.routes";


const router = Router();
//this is the sample model introduction method for the payment service
router.use("/payment/v1", appsApi);
//main routes for the payment service
router.use("/payment/v1/creditCard", creditCard);
router.use("/payment/v1/ecommerce", ecommercePaymentApi);
router.use("/payment/v1/ads", adsPaymentApi);
router.use("/payment/v1/hotels", hotelsPaymentApi);
router.use("/payment/v1/social_media", socialMediaPaymentApi);
router.use("/payment/v1/taxi", taxiPaymentApi);
router.use("/payment/v1/admin", admin);
router.use("/payment/v1/subAdmin", subAdmin);



export default router;