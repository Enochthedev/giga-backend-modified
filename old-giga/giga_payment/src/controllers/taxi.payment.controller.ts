import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import taxiService from '../services/taxi.payments.services';

export class TaxiController {
  payRideFee = catchAsync(async (req: Request, res: Response) => {
        const user = await taxiService.payRideFee(req.body.token, req.body.amount);
    
        res.status(httpStatus.CREATED).send({ message: 'User Created', data: user, status: true });
      });
    
}

export default new TaxiController();
