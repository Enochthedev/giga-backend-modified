import { Router } from "express";
import productApi from "./products.routes";
import cartApi from "./cart.routes";
import sellerApi from "./vendor.route";
import categoryApi from "./category.routes";
import { getAllEndpointsHandler } from '../utils/endpointsUtil';


const router = Router();
const allEndpointsHandler = getAllEndpointsHandler(router);

router.get('/all-endpoints', allEndpointsHandler);
// router.use("/main/v1", ridesApi);
router.use("/products/v1", productApi);
router.use("/cart/v1", cartApi);
router.use("/seller/V1", sellerApi);
router.use("/category/v1", categoryApi);




export default router;