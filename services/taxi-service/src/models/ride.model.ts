import { Document, Model, model, Schema, Types } from 'mongoose';
import { VehicleType } from './driver.model';

export enum RideStatus {
    REQUESTED = 'requested',
    ACCEPTED = 'accepted',
    DRIVER_ARRIVING = 'driver_arriving',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled'
}

interface IRide extends Document {
    customerId: string;
    driverId: Types.ObjectId;
    status: RideStatus;
    vehicleType: VehicleType;
    pickupLocation: {
        type: string;
        coordinates: [number, number]; // [longitude, latitude]
        address?: string;
    };
    dropoffLocation: {
        type: string;
        coordinates: [number, number]; // [longitude, latitude]
        address?: string;
    };
    estimatedFare: number;
    finalFare?: number;
    estimatedDistance: number; // in meters
    actualDistance?: number; // in meters
    estimatedDuration: number; // in seconds
    actualDuration?: number; // in seconds
    driverArrivalTime?: number; // in seconds
    acceptedAt?: Date;
    driverArrivedAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
    cancelledAt?: Date;
    cancellationReason?: string;
    customerNotes?: string;
    driverNotes?: string;
    customerRating?: number;
    driverRating?: number;
    customerReview?: string;
    driverReview?: string;
    route?: {
        coordinates: number[][];
        distance: number;
        duration: number;
    };
    paymentDetails?: {
        method: string;
        transactionId?: string;
        tip?: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

interface IRideModel extends Model<IRide> {
    findActiveRideForDriver(driverId: string): Promise<IRide | null>;
    findActiveRideForCustomer(customerId: string): Promise<IRide | null>;
}

const RideSchema = new Schema<IRide>({
    customerId: { type: String, required: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'Driver', required: true },
    status: {
        type: String,
        enum: Object.values(RideStatus),
        default: RideStatus.REQUESTED
    },
    vehicleType: {
        type: String,
        enum: Object.values(VehicleType),
        default: VehicleType.REGULAR
    },
    pickupLocation: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true },
        address: { type: String }
    },
    dropoffLocation: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true },
        address: { type: String }
    },
    estimatedFare: { type: Number, required: true, min: 0 },
    finalFare: { type: Number, min: 0 },
    estimatedDistance: { type: Number, required: true, min: 0 },
    actualDistance: { type: Number, min: 0 },
    estimatedDuration: { type: Number, required: true, min: 0 },
    actualDuration: { type: Number, min: 0 },
    driverArrivalTime: { type: Number, min: 0 },
    acceptedAt: { type: Date },
    driverArrivedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
    customerNotes: { type: String },
    driverNotes: { type: String },
    customerRating: { type: Number, min: 1, max: 5 },
    driverRating: { type: Number, min: 1, max: 5 },
    customerReview: { type: String },
    driverReview: { type: String },
    route: {
        coordinates: [[Number]],
        distance: { type: Number },
        duration: { type: Number }
    },
    paymentDetails: {
        method: { type: String },
        transactionId: { type: String },
        tip: { type: Number, min: 0 }
    }
}, {
    timestamps: true
});

// Indexes
RideSchema.index({ customerId: 1 });
RideSchema.index({ driverId: 1 });
RideSchema.index({ status: 1 });
RideSchema.index({ createdAt: -1 });
RideSchema.index({ pickupLocation: '2dsphere' });
RideSchema.index({ dropoffLocation: '2dsphere' });

// Static methods
RideSchema.statics.findActiveRideForDriver = async function (driverId: string): Promise<IRide | null> {
    return this.findOne({
        driverId,
        status: {
            $in: [
                RideStatus.ACCEPTED,
                RideStatus.DRIVER_ARRIVING,
                RideStatus.IN_PROGRESS
            ]
        }
    });
};

RideSchema.statics.findActiveRideForCustomer = async function (customerId: string): Promise<IRide | null> {
    return this.findOne({
        customerId,
        status: {
            $in: [
                RideStatus.REQUESTED,
                RideStatus.ACCEPTED,
                RideStatus.DRIVER_ARRIVING,
                RideStatus.IN_PROGRESS
            ]
        }
    });
};

// Instance methods
RideSchema.methods.isActive = function (): boolean {
    return [
        RideStatus.REQUESTED,
        RideStatus.ACCEPTED,
        RideStatus.DRIVER_ARRIVING,
        RideStatus.IN_PROGRESS
    ].includes(this.status);
};

RideSchema.methods.isCompleted = function (): boolean {
    return this.status === RideStatus.COMPLETED;
};

RideSchema.methods.isCancelled = function (): boolean {
    return this.status === RideStatus.CANCELLED;
};

RideSchema.methods.canBeCancelled = function (): boolean {
    return [
        RideStatus.REQUESTED,
        RideStatus.ACCEPTED,
        RideStatus.DRIVER_ARRIVING
    ].includes(this.status);
};

RideSchema.methods.canBeRated = function (): boolean {
    return this.status === RideStatus.COMPLETED;
};

RideSchema.methods.getDuration = function (): number | null {
    if (this.startedAt && this.completedAt) {
        return Math.floor((this.completedAt.getTime() - this.startedAt.getTime()) / 1000);
    }
    return null;
};

const Ride: IRideModel = model<IRide, IRideModel>('Ride', RideSchema);

export default Ride;
export { IRide, IRideModel };