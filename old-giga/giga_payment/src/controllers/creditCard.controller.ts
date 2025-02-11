import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import creditCardService from '../services/creditCard.service';

export class CreditCardController {
  createCreditCard = catchAsync(async (req: Request, res: Response) => {
        const user = await creditCardService.createCard(req.body.cardNumber, req.body.cardHolderName, req.body.cardExpiryMonth, req.body.cardExpiryYear, req.body.cardCVV, req.body.email, req.body.pin);
    
        res.status(httpStatus.CREATED).send({ message: 'User Created', data: user, status: true });
      });
  validateTransaction = catchAsync(async (req: Request, res: Response) => {
      const creditCard = await creditCardService.validateTransaction(req.body.flutterwaveReference, req.body.otp, req.body.userId);
      res.status(httpStatus.CREATED).send({ message: 'Credit card added', data: creditCard, status: true });
  });

  payFee = catchAsync(async (req: Request, res: Response) => {
    const data = await creditCardService.payFee(req.body);
    res.status(httpStatus.CREATED).send({ message: 'Payment Made', data, status: true });
});

    // getCreditCard = catchAsync(async (req: Request, res: Response) => {
    //     const creditCard = await creditCardService.getUserById(req.params.userId);
    
    //     res.status(httpStatus.OK).send({ message: 'Credit card found', data: creditCard, status: true });
    // });

    // deleteCreditCard = catchAsync(async (req: Request, res: Response) => {
    //     await creditCardService.deleteUserById(req.params.userId);
    
    //     res.status(httpStatus.OK).send({ message: 'Credit card deleted', status: true });
    // });

    // updateCreditCard = catchAsync(async (req: Request, res: Response) => {
    //     const creditCard = await creditCardService.updateUserById(req.params.userId, req.body);
    
    //     res.status(httpStatus.OK).send({ message: 'Credit card updated', data: creditCard, status: true });
    // });
    // getAllCreditCards = catchAsync(async (req: Request, res: Response) => {
    //     const creditCards = await creditCardService.getAllUsers();
    
    //     res.status(httpStatus.OK).send({ message: 'Credit cards found', data: creditCards, status: true });
    // });


}

export default new CreditCardController();





