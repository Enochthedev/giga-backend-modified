// This route handles all the payment related request for the hotels  only (giga_hotels)

import { NextFunction, Request, response, Response, Router } from "express";
import SUCCESS from "../utils/successResponse";
import { valid } from "joi";


const router = Router();

// post request to create a new payment for a particular order
router.post(
    "/",
    // validateWorkSpaceOwnership,
    async (req: Request, res: Response, next: NextFunction) => {
        return res.status(201).json(SUCCESS("Hello world,this is the hotels payment route"));
    }
);


export default router;