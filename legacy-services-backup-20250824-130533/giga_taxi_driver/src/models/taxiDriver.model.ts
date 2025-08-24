import { Document, Model, model, Schema,Types } from 'mongoose';
import driverConfig  from '../config/ride.config'; // Adjust the path as needed

interface IDriver extends Document {
  user: Types.ObjectId;
  phoneNumber: string;
  carInformation: string;
  location: { type: string; coordinates: [number, number] };
  availability: boolean;
  rating: number;
  earnings: number;
  currentRide: Schema.Types.ObjectId | null;
  rideOffers: Types.ObjectId[];
  driverType: string;
  isUserTaken(email: string): Promise<boolean>;
}

interface IDriverModel extends Model<IDriver> {
  isUserTaken(email: string): Promise<boolean>;
}

const driverSchema = new Schema<IDriver>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  phoneNumber: { type: String, required: true },
  carInformation: { type: String },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Schema.Types.Decimal128], default: [0, 0] },
  },
  availability: { type: Boolean, default: true },
  driverType: {type: String, enum: driverConfig.driverTypes,default: "regular"},
  earnings: { type: Number, default: 0 },
  currentRide: { type: Schema.Types.ObjectId, ref: 'DriverRide', default: null },
  rideOffers: [{ type: Schema.Types.ObjectId, ref: 'DriverRide' }]
});

driverSchema.index({ location: '2dsphere' });

driverSchema.statics.isUserTaken = async function (user: string ): Promise<boolean> {

  const driver = await this.findOne({ user });
  return !!driver;
};


const Driver: IDriverModel = model<IDriver, IDriverModel>('Driver', driverSchema);
export default Driver;