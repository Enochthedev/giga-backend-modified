import Rabbit from './setup';
import TaxiModel from '../models/taxiMain.model';
import RideModel from '../models/ride.model';

const rabbit = new Rabbit();  

const DriverEndTrip = async () => {
    //function to do something with the data in the rabbit mq message(add card)
    async function processData(data: any) {
        // Perform custom actions with the data
        const customer = await TaxiModel.findOne({ _id: data.customerId});
        const currentRide = await RideModel.findOne({ _id: customer?.currentRide})
        if(currentRide && customer)
        {
            currentRide.status = "Completed"
            customer.currentRide = null 
            customer.rideHistory.push(currentRide._id);
            await customer.save()
            await currentRide.save()
        }
        
    }
      
    // Call consumeMessage and pass the processData function

    rabbit.consumeMessage('EndTrip', processData);
};

const DriverAcceptRide = async () => {
    //function to do something with the data in the rabbit mq message(add card)
    async function processData(data: any) {
        // Perform custom actions with the data
        const customer = await TaxiModel.findOne({ _id: data.customerId});
        const ride = await RideModel.findOne({ _id: customer?.requestedRide})
        if(ride && customer)
        {
            ride.status = "Ongoing"
            customer.currentRide = ride._id
            customer.requestedRide = null
            await customer.save()
            await ride.save()
        }
        
    }
      
    // Call consumeMessage and pass the processData function

    rabbit.consumeMessage('acceptRide', processData);
};

const DriverRejectRide = async () => {
    //function to do something with the data in the rabbit mq message(add card)
    async function processData(data: any) {
        // Perform custom actions with the data
        const customer = await TaxiModel.findOne({ _id: data.customerId});
        const ride = await RideModel.findOne({ _id: customer?.requestedRide})
        if(ride && customer)
        {
            await ride.delete()
            customer.requestedRide = null
            await customer.save()
            
        }
        
    }
      
    // Call consumeMessage and pass the processData function

    rabbit.consumeMessage('rejectRide', processData);
};

export default {
    DriverEndTrip,
    DriverAcceptRide,
    DriverRejectRide
};