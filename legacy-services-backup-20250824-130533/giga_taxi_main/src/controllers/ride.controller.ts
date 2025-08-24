import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import rideService from '../services/ride.services';


class RideController {
    getClosestDrivers = catchAsync(async (req: Request, res: Response) => {
    const data = await rideService.getClosestDrivers(req.body);
    res.status(httpStatus.CREATED).send({ message: 'Closest available rides', data: data, status: true });
  });

  requestRide = catchAsync(async (req: Request, res: Response) => {
    const data = await rideService.requestRide(req.body);
    res.status(httpStatus.CREATED).send({ message: "Ride request sent", data: data , status: true });
  });

  rateDriver = catchAsync(async (req: Request, res: Response) => {
    const resp = await rideService.rateDriver(req.body);
    res.status(httpStatus.CREATED).send({ ...resp, status: true });
  });

  createAccount = catchAsync(async (req: Request, res: Response) => {
    const resp = await rideService.createTaxiAccount(req.body);
    res.status(httpStatus.CREATED).send({ ...resp, status: true });
  });

  payTaxiFee = catchAsync(async (req: Request, res: Response) => {
    const resp = await rideService.payTaxiFee(req.body);
    res.status(httpStatus.CREATED).send({ ...resp, status: true });
  });

  DriverEndTrip = catchAsync(async (req: Request, res: Response) => {
    const resp = await rideService.DriverEndTrip(req.body);
    res.status(httpStatus.CREATED).send({ ...resp, status: true });
  });

  DriverAcceptRide = catchAsync(async (req: Request, res: Response) => {
    const resp = await rideService.DriverAcceptRide(req.body);
    res.status(httpStatus.CREATED).send({ ...resp, status: true });
  });

  DriverRejectRide = catchAsync(async (req: Request, res: Response) => {
    const resp = await rideService.DriverRejectRide(req.body);
    res.status(httpStatus.CREATED).send({ ...resp, status: true });
  });
}

export default new RideController();