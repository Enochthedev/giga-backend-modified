import { Document, Model, model, Schema, Types } from 'mongoose';

enum PaymentMethod {
    CASH = 'cash',
    CARD = 'card',
    DIGITAL_WALLET = 'digital_wallet'
}

interface ICustomer extends Document {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    location: {
        type: string;
        coordinates: [number, number]; // [longitude, latitude]
    };
    paymentMethod: PaymentMethod;
    preferredVehicleType?: string;
    rideHistory: Types.ObjectId[];
    currentRide?: Types.ObjectId;
    isActive: boolean;
    rating: number;
    totalRides: number;
    createdAt: Date;
    updatedAt: Date;
}

interface ICustomerModel extends Model<ICustomer> {
    isUserTaken(userId: string): Promise<boolean>;
}

const CustomerSchema = new Schema<ICustomer>({
    userId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }
    },
    paymentMethod: {
        type: String,
        enum: Object.values(PaymentMethod),
        default: PaymentMethod.CASH
    },
    preferredVehicleType: { type: String },
    rideHistory: [{ type: Schema.Types.ObjectId, ref: 'Ride' }],
    currentRide: { type: Schema.Types.ObjectId, ref: 'Ride', default: null },
    isActive: { type: Boolean, default: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalRides: { type: Number, default: 0, min: 0 }
}, {
    timestamps: true
});

// Indexes
CustomerSchema.index({ userId: 1 });
CustomerSchema.index({ email: 1 });
CustomerSchema.index({ location: '2dsphere' });

// Static methods
CustomerSchema.statics.isUserTaken = async function (userId: string): Promise<boolean> {
    const customer = await this.findOne({ userId });
    return !!customer;
};

// Instance methods
CustomerSchema.methods.getFullName = function (): string {
    return `${this.firstName} ${this.lastName}`;
};

CustomerSchema.methods.updateLocation = function (longitude: number, latitude: number): void {
    this.location = {
        type: 'Point',
        coordinates: [longitude, latitude]
    };
};

const Customer: ICustomerModel = model<ICustomer, ICustomerModel>('Customer', CustomerSchema);

export default Customer;
export { ICustomer, ICustomerModel, PaymentMethod };