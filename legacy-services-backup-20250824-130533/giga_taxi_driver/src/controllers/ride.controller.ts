import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import rideService from '../services/ride.services';


class RideController {
    acceptRide = catchAsync(async (req: Request, res: Response) => {
    const data = await rideService.acceptRide(req.body);
    res.status(httpStatus.CREATED).send({ message: 'Ride Accepted', data: data, status: true });
  });

  rejectRide = catchAsync(async (req: Request, res: Response) => {
    const data = await rideService.rejectRide(req.body);
    res.status(httpStatus.CREATED).send({ message: 'Ride Rejected', data: data, status: true });
  });

  endTrip = catchAsync(async (req: Request, res: Response) => {
    const data = await rideService.endTrip(req.body);
    res.status(httpStatus.CREATED).send({ message: "Trip Ended", data: data , status: true });
  });

  rateCustomer = catchAsync(async (req: Request, res: Response) => {
    const resp = await rideService.rateCustomer(req.body);
    res.status(httpStatus.CREATED).send({ ...resp, status: true });
  });

  createAccount = catchAsync(async (req: Request, res: Response) => {
    const resp = await rideService.createTaxiAccount(req.body);
    res.status(httpStatus.CREATED).send({ ...resp, status: true });
  });

  getClosestDrivers = catchAsync(async (req: Request, res: Response) => {
    const resp = await rideService.getClosestDrivers(req.body);
    res.status(httpStatus.CREATED).send({ ...resp, status: true });
  });

  GetRideOffer = catchAsync(async (req: Request, res: Response) => {
    const resp = await rideService.GetRideOffer(req.body);
    res.status(httpStatus.CREATED).send({ ...resp, status: true });
  });
}

export default new RideController();