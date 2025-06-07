import TaxiModel from '../models/taxiMain.model';
import Ride from '../models/ride.model';
import httpStatus from 'http-status';
import { EventSender } from '../utils/eventSystem'; 
import ApiError from '../utils/ApiError';
import tomtomApi from './tomtomApi.services';
import rideConfig from '../config/ride.config';
import { logger } from 'common';
const eventSender = new EventSender();

 

const requestRide = async (data: any) => {
    const {
        driverId,
        driverUserId,
        driverType,
        customerId,
        customerUserId,
        pickupLocation,
        dropOffLocation
    } = data
    const rideData = {
        driverId,
        driverUserId,
        customerId,
        customerUserId,
        status: "pending",
        pickupLocation,
        dropOffLocation,
        rideType: driverType
      };
    
    try {
        const customer = await TaxiModel.findOne({ _id: customerId});
        
        
        if(customer)
        {
          
          const ride = await Ride.create(rideData);
          customer.requestedRide = ride._id
          customer.save()
          const data = (eventSender.sendEvent({
            name: 'GetRideOffer',
            service: 'taxi_driver', // Assuming 'user' is the service name
            payload: rideData,
          })) as any
          
          ride.distance = data.distance
          ride.driverArrivalEta = data.arrivalEta
          ride.rideEta = data.rideEta
          const estimatedFee = await calculateRideFee(driverType,3,data.distance )
          ride.estimatedFee = estimatedFee
          
          ride.save()
          
          
          return ride
        }
        
    } 
    catch (error) {
        logger.error(error);
        throw new ApiError(httpStatus.BAD_REQUEST, 'Something went wrong');
    }
};

const calculateRideFee = async (rideType: any, fuelPricePerLiter: any, distanceInTomTom: any) => {
    const feePerKm = rideConfig.feePerKm[rideType.toLowerCase()];
    if (feePerKm === undefined) {
      throw new Error(`Invalid ride type: ${rideType}`);
    }
  
    // Calculate fee based on ride type and fuel price
    const rideFeeBasedOnFuel = feePerKm * fuelPricePerLiter;
  
    // Convert TomTom distance to kilometers
    const distanceInKm = distanceInTomTom / 1000;
  
    // Calculate total fee based on ride fee and distance
    const totalFee = rideFeeBasedOnFuel * distanceInKm;
  
    return totalFee;
  }



const sortLocationData = async(data: any) =>
{
    if (typeof data === 'string') {
      try {
        const location = await tomtomApi.geocodeAddress(data)
        return location
      } catch (error) {
        logger.error(error);
        return data
      }
        
        // Code to execute when data.pickupLocation is a string
      } else {
        return data
      }
} 

const getClosestDrivers = async(data: any) => 
{
    const location = data.pickupLocation
    logger.info(location as any);
    
    const requestPayload = {
        location,
        // Optionally add ride preferences if available
        ridePreferences: data.ridePreferences ? data.ridePreferences : undefined,
      };
    
    
    try {
      const drivers = (eventSender.sendEvent({
        name: 'getClosestDrivers',
        service: 'taxi_driver', // Assuming 'user' is the service name
        payload: requestPayload,
      })) as any
      return drivers
    } catch (error) {
      logger.error(error);
      return "error occured"
    }
    
}
 
const rateDriver = async(data: any) => 
{  
  eventSender.sendEvent({
    name: 'rateUser',
    service: 'user', // Assuming 'user' is the service name
    payload: {userId: data.driverUserId, rating: data.rating}
  });
    return {message: "Rated"}
}

const createTaxiAccount = async (data: any) => {
    if (await TaxiModel.isUserTaken(data.userID)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'User already has a taxi driver account');
    }

    const taxiData = {
      user: data.userID,
      phoneNumber: data.phoneNumber,
    };
    try {
      const customer = await TaxiModel.create(taxiData);
      eventSender.sendEvent({
        name: 'createTaxiAccount',
        service: 'user', // Assuming 'user' is the service name
        payload: {accountInfo: customer, type: "TaxiCustomer"},
      })

      return customer
    } catch (error) {
      logger.error(error);
      throw new ApiError(httpStatus.BAD_REQUEST, 'Something went wrong and it was your fault, BAD_REQUEST');
    }
    
};

const payTaxiFee = async (data: any) => {
  try {
    const taxiCustomer = await TaxiModel.findById(data.id).populate('user');
    eventSender.sendEvent({
      name: 'payFee',
      service: 'payment', // Assuming 'user' is the service name
      payload: {token: data.token, amount: data.amount, narration: data.narration},
    })
    return taxiCustomer;
  } catch (error) {
    logger.error('Error fetching TaxiCustomer:', error);
    return null;
  }
};

const DriverEndTrip = async (data: any) => {
  // Perform custom actions with the data
  const customer = await TaxiModel.findOne({ _id: data.customerId});
  const currentRide = await Ride.findOne({ _id: customer?.currentRide})
  if(currentRide && customer)
  {
      currentRide.status = "Completed"
      customer.currentRide = null 
      customer.rideHistory.push(currentRide._id);
      await customer.save()
    await currentRide.save()
    return {message: "Driver Ended Trip"}
  }
  
}


const DriverAcceptRide = async (data: any) => {
  const customer = await TaxiModel.findOne({ _id: data.customerId});
  const ride = await Ride.findOne({ _id: customer?.requestedRide})
  if(ride && customer)
  {
      ride.status = "Ongoing"
      customer.currentRide = ride._id
      customer.requestedRide = null
      await customer.save()
    await ride.save()
    return {message: "Driver Accepted Ride"}
  }
  
}

const DriverRejectRide = async (data: any) => {

  const customer = await TaxiModel.findOne({ _id: data.customerId});
  const ride = await Ride.findOne({ _id: customer?.requestedRide})
  if(ride && customer)
  {
      await ride.delete()
      customer.requestedRide = null
      await customer.save()
      return {message: "Driver Rejected Ride"}
  }
  
}
export default {
    getClosestDrivers,
    requestRide,
    rateDriver,
    createTaxiAccount,
    payTaxiFee,
    DriverEndTrip,
    DriverAcceptRide,
    DriverRejectRide
  };

  