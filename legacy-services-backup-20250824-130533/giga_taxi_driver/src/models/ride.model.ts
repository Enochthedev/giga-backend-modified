import { Schema, model, Document, Types } from 'mongoose';

// Define the interface for DriverRide document
interface IRide extends Document {
  driverId: Types.ObjectId;
  driverUserId: Types.ObjectId;
  customerId: Types.ObjectId;
  customerUserId: Types.ObjectId;
  status: string;
  pickupLocation: { lat: number; lon: number };
  dropOffLocation: { lat: number; lon: number };
  distance: number;
  arrivalEta: number;
  rideEta: number;
  rideType: String,
  estimatedFee: number,
  finalFee: number
  // Other ride-related properties specific to the driver
}
 
// Create the schema for the DriverRide model
const DriverRideSchema = new Schema<IRide>({
  driverId: { type: Schema.Types.ObjectId, ref: 'Driver', required: true },
  driverUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'TaxiCustomer', required: true },
  customerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, required: true },
  pickupLocation: {
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
  },
  dropOffLocation: {
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
  },
  distance: { type: Number, required: true },
  arrivalEta: { type: Number }, 
  rideEta: { type: Number },
  rideType: {
    type: String,
    enum: ['luxury', 'regular'],
    required: true,
  },
  estimatedFee: { type: Number },
  finalFee: { type: Number } 
  // Other ride-related properties specific to the driver
});

// Create and export the DriverRide model
const Ride = model<IRide>('DriverRide', DriverRideSchema);
export default Ride;