import Driver from '../models/taxiDriver.model';
import Ride from '../models/ride.model';
import httpStatus from 'http-status';
import { EventSender } from '../utils/eventSystem'; 
import ApiError from '../utils/ApiError';
import tomtomApiServices from './tomtomApi.services';
import { logger } from 'common';
const eventSender = new EventSender();



const acceptRide = async (data: any) => {
    const driver = await Driver.findOne({ _id: data.driverId });
    const selectedRide = await Ride.findOne({ _id: data.rideId });

    
  
    if (!selectedRide) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Ride is no longer Available');
    }
  
    if (driver) {
      if (driver.rideOffers.includes(data.rideId)) {
        driver.availability = false;
        driver.currentRide = selectedRide?._id;
        
        // Remove the selected ride from the rideOffers list
        const index = driver.rideOffers.indexOf(data.rideId);
        if (index > -1) {
          driver.rideOffers.splice(index, 1);
        }
   
        selectedRide.status = "Ongoing";
        eventSender.sendEvent({
          name: 'DriverAcceptRide',
          service: 'taxi_main', // Assuming 'user' is the service name
          payload: selectedRide,
        })
        await selectedRide.save();
        await driver.save();
  
        return driver.populate('currentRide');
      } else {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Selected ride is not in ride offers');
      }
    } else {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Perhaps wrong driver Id or na kidnapper');
    }
  };


  const rejectRide = async (data: any) => {
    const driver = await Driver.findOne({ _id: data.driverId });
    const selectedRide = await Ride.findOne({ _id: data.rideId });
  
    if (!selectedRide) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Ride is no longer Available');
    }
  
    if (driver) {
      if (driver.rideOffers.includes(data.rideId)) {
        
        // Remove the selected ride from the rideOffers list
        const index = driver.rideOffers.indexOf(data.rideId);
        if (index > -1) {
          driver.rideOffers.splice(index, 1);
        }
        eventSender.sendEvent({
          name: 'DriverRejectRide',
          service: 'taxi_main', // Assuming 'user' is the service name
          payload: {customerId: selectedRide.customerId },
        })
        await selectedRide.delete();
        await driver.save();
  
        return driver;
      } else {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Selected ride is not in ride offers');
      }
    } else {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Perhaps wrong driver Id');
    }
  };
  
const createTaxiAccount = async (data: any) => {
    if (await Driver.isUserTaken(data.userID)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'User already has a taxi driver account');
    }

    const taxiData = {
      user: data.userID,
      phoneNumber: data.phoneNumber,
      carInformation: data.carInformation,
    };
    
    const driver = await Driver.create(taxiData);
    eventSender.sendEvent({
      name: 'createTaxiAccount',
      service: 'user', // Assuming 'user' is the service name
      payload: {accountInfo: driver, type: "TaxiDriver"},
    })
    return driver
}; 

const endTrip = async (data: any) => {
    const driver = await Driver.findOne({ _id: data.driverId });
    const currentRide = await Ride.findOne({ _id: data.rideId });

    if(!currentRide)
    {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Ride is no longer Available');
    }
    if(driver)
    {
        driver.availability = true
        driver.currentRide = null
        currentRide.status = "Complete"
        eventSender.sendEvent({
          name: 'DriverEndTrip',
          service: 'taxi_main', // Assuming 'user' is the service name
          payload: {customerId: currentRide.customerId}
        })
        await currentRide.save()
        await driver.save()
        return driver;
    }else
    {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Perhaps wrong driver Id or na kidnapper');
    }
};

const rateCustomer = async(data: any) => 
{  
    try {
      eventSender.sendEvent({
        name: 'rateUser',
        service: 'user', // Assuming 'user' is the service name
        payload: { userId: data.customerUserId, rating: data.rating }
      });
      return {message: "Rated"}
    } catch (error) {
      logger.error(error);
      throw new ApiError(httpStatus.BAD_REQUEST, 'Something went Wrong');
    }
    
}


const getClosestDrivers = async (data: any) => { 
  async function findFinalDrivers(targetLocation: any, limit: number, ridePreference: string) {
    
    try {
      const [longitude, latitude] = targetLocation.split(',').map(parseFloat);
      let driverQuery = {
        availability: true,
        driverType: "regular",
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
          },
        },
      };

      // If ridePreference is available, add it to the driver query
      if (ridePreference) {
        driverQuery.driverType = ridePreference;
      }
      //add time function
      const finalDrivers = await Driver.find(driverQuery)
        .limit(limit)
        .exec();
      logger.info(JSON.stringify(finalDrivers))

      return finalDrivers;
    } catch (error) {
      // Handle any errors
      logger.error('Error finding final drivers: ' + error);
      throw new Error("Error finding final drivers");
    }
  }

    const { location, ridePreference } = data; // Assuming ridePreference is included in the data
    const drivers = findFinalDrivers(location, 5, ridePreference)
    return {data: drivers}
  }


  const GetRideOffer = async (data: any) => {
    const {
        driverId,
        driverUserId,
        customerId,
        customerUserId,
        rideType,
        status,
        pickupLocation,
        dropOffLocation,
    } = data
    const pickupLocationString = `${pickupLocation.lat},${pickupLocation.lon}`;
    const dropOffLocationString = `${dropOffLocation.lat},${dropOffLocation.lon}`;
    const driver = await Driver.findOne({ _id: driverId});
    
    try {
      if (driver) {
        const driverLocationString = `${driver.location.coordinates[1]},${driver.location.coordinates[0]}`;
        const pickUpData = await tomtomApiServices.getRoute(driverLocationString, pickupLocationString )
        const mainRideData = await tomtomApiServices.getRoute(pickupLocationString, dropOffLocationString )
        
        const rideData = await Ride.create({
            driverId,
            driverUserId,
            customerId,
            customerUserId,
            rideType,
            status,
            pickupLocation,
            dropOffLocation,
            distance: mainRideData.summary.lengthInMeters,
            arrivalEta: pickUpData.summary.travelTimeInSeconds,
            rideEta: mainRideData.summary.travelTimeInSeconds
        });

        driver.rideOffers.push(rideData._id)
        await driver.save()
        return {
          distance: rideData.distance,
          arrivalEta: rideData.arrivalEta,
          rideEta: rideData.rideEta 
        }
    } 
    } catch (error) {
      logger.error(error);
      throw new Error("An Error occured");
    }
}
export default {
    acceptRide,
    endTrip,
    rateCustomer,
    createTaxiAccount,
    rejectRide,
    getClosestDrivers,
    GetRideOffer
  };