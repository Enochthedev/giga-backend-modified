// This route handles all the payment related request for the ads app only (giga_ads)
import { NextFunction, Request, response, Response, Router } from "express";
import SUCCESS from "../utils/successResponse";
import { valid } from "joi";


const router = Router();

// post request to create a new payment for a particular order
router.post(
    "/",
    // validateWorkSpaceOwnership,
    async (req: Request, res: Response, next: NextFunction) => {
        return res.status(201).json(SUCCESS("Hello world,this is the ads payment route"));
    }
);


export default router;