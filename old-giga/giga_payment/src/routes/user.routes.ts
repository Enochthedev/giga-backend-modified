import { NextFunction, Request, response, Response, Router } from "express";
import SUCCESS from "../utils/successResponse";


import { valid } from "joi";

const router = Router();

router.get(
    "/",
    // validateWorkSpaceOwnership,
    async (req: Request, res: Response, next: NextFunction) => {
        return res.status(201).json(SUCCESS("Hello world(this is the test route for the payment service)"));
    }
);



export default router;