import { NextFunction, Request, response, Response, Router } from "express";
import SUCCESS from "../utils/successResponse";
import { valid } from "joi";


const router = Router();

//general route for the payments
router.get(
    "/",
    // validateWorkSpaceOwnership,
    async (req: Request, res: Response, next: NextFunction) => {
        return res.status(201).json(SUCCESS("Hello world,this is the payment route for the admin app"));
    }
);

// ads payment route for the admin app

//get request to get all the payments for the ads app
router.get(
    "/ads",
    // validateWorkSpaceOwnership,
    async (req: Request, res: Response, next: NextFunction) => {
        return res.status(201).json(SUCCESS("Hello world,this is the ads payment route"));
    }
);

// ecommerce payment route for the admin app

//get request to get all the payments for the ecommerce app
router.get(
    "/ecommerce",
    // validateWorkSpaceOwnership,
    async (req: Request, res: Response, next: NextFunction) => {
        return res.status(201).json(SUCCESS("Hello world,this is the ecommerce payment route"));
    }
);

export default router;