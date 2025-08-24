import { Document, Model, model, Schema,Types } from 'mongoose';

enum PaymentMethod {
    CASH = 'cash',
    CARD = 'card',
  }

interface ITaxiCustomer extends Document {
  user: Types.ObjectId;
  phoneNumber: string;
  location: { type: string; coordinates: [number, number] };
  paymentMethod: PaymentMethod;
  rideHistory: Types.ObjectId[];
  requestedRide: Schema.Types.ObjectId | null;
  currentRide: Schema.Types.ObjectId | null;
  isUserTaken(email: string): Promise<boolean>;
}

interface ITaxiCustomerModel extends Model<ITaxiCustomer> {
  isUserTaken(email: string): Promise<boolean>;
}

const TaxiCustomerSchema = new Schema<ITaxiCustomer>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  phoneNumber: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Schema.Types.Decimal128], default: [0, 0] },
  },
  paymentMethod: { type: String, enum: Object.values(PaymentMethod), default: PaymentMethod.CASH },
  currentRide: { type: Schema.Types.ObjectId, ref: 'Ride', default: null },
  requestedRide: { type: Schema.Types.ObjectId, ref: 'Ride', default: null },
  rideHistory: [{ type: Schema.Types.ObjectId, ref: 'Ride' }],
});

TaxiCustomerSchema.index({ location: '2dsphere' });

TaxiCustomerSchema.statics.isUserTaken = async function (user: string ): Promise<boolean> {

  const taxiCustomer = await this.findOne({ user });
  return !!taxiCustomer;
};

const TaxiCustomer: ITaxiCustomerModel = model<ITaxiCustomer, ITaxiCustomerModel>('TaxiCustomer', TaxiCustomerSchema);
export default TaxiCustomer