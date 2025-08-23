import { Document, Model, model, Schema, Types } from 'mongoose';

export enum DriverStatus {
    OFFLINE = 'offline',
    AVAILABLE = 'available',
    BUSY = 'busy',
    ON_RIDE = 'on_ride'
}

export enum VehicleType {
    REGULAR = 'regular',
    LUXURY = 'luxury',
    SUV = 'suv',
    MOTORCYCLE = 'motorcycle'
}

interface IDriver extends Document {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    licenseNumber: string;
    licenseExpiryDate: Date;
    status: DriverStatus;
    rating: number;
    totalRides: number;
    totalEarnings: number;
    isActive: boolean;
    isVerified: boolean;
    profileImageUrl?: string;
    documents?: {
        license?: string;
        insurance?: string;
        background_check?: string;
    };
    vehicle: {
        make: string;
        model: string;
        year: number;
        color: string;
        licensePlate: string;
        vin: string;
        type: VehicleType;
        capacity: number;
        insuranceExpiryDate: Date;
        registrationExpiryDate: Date;
        isActive: boolean;
        isVerified: boolean;
        features?: {
            airConditioning?: boolean;
            bluetooth?: boolean;
            gps?: boolean;
            childSeat?: boolean;
            wheelchairAccessible?: boolean;
        };
    };
    location: {
        type: string;
        coordinates: [number, number]; // [longitude, latitude]
        heading?: number;
        speed?: number;
        accuracy?: number;
        timestamp: Date;
    };
    currentRide?: Types.ObjectId;
    rideOffers: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

interface IDriverModel extends Model<IDriver> {
    isUserTaken(userId: string): Promise<boolean>;
    findAvailableDrivers(
        location: { latitude: number; longitude: number },
        radiusKm: number,
        vehicleType?: VehicleType,
        limit?: number
    ): Promise<IDriver[]>;
}

const DriverSchema = new Schema<IDriver>({
    userId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    licenseNumber: { type: String, required: true, unique: true },
    licenseExpiryDate: { type: Date, required: true },
    status: {
        type: String,
        enum: Object.values(DriverStatus),
        default: DriverStatus.OFFLINE
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalRides: { type: Number, default: 0, min: 0 },
    totalEarnings: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    profileImageUrl: { type: String },
    documents: {
        license: { type: String },
        insurance: { type: String },
        background_check: { type: String }
    },
    vehicle: {
        make: { type: String, required: true },
        model: { type: String, required: true },
        year: { type: Number, required: true, min: 1900 },
        color: { type: String, required: true },
        licensePlate: { type: String, required: true, unique: true },
        vin: { type: String, required: true, unique: true },
        type: {
            type: String,
            enum: Object.values(VehicleType),
            default: VehicleType.REGULAR
        },
        capacity: { type: Number, default: 4, min: 1, max: 8 },
        insuranceExpiryDate: { type: Date, required: true },
        registrationExpiryDate: { type: Date, required: true },
        isActive: { type: Boolean, default: true },
        isVerified: { type: Boolean, default: false },
        features: {
            airConditioning: { type: Boolean, default: false },
            bluetooth: { type: Boolean, default: false },
            gps: { type: Boolean, default: false },
            childSeat: { type: Boolean, default: false },
            wheelchairAccessible: { type: Boolean, default: false }
        }
    },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] },
        heading: { type: Number, min: 0, max: 360 },
        speed: { type: Number, min: 0 },
        accuracy: { type: Number, min: 0 },
        timestamp: { type: Date, default: Date.now }
    },
    currentRide: { type: Schema.Types.ObjectId, ref: 'Ride', default: null },
    rideOffers: [{ type: Schema.Types.ObjectId, ref: 'Ride' }]
}, {
    timestamps: true
});

// Create 2dsphere index for location
DriverSchema.index({ location: '2dsphere' });
DriverSchema.index({ status: 1 });
DriverSchema.index({ isActive: 1 });
DriverSchema.index({ isVerified: 1 });

// Static methods
DriverSchema.statics.isUserTaken = async function (userId: string): Promise<boolean> {
    const driver = await this.findOne({ userId });
    return !!driver;
};

DriverSchema.statics.findAvailableDrivers = async function (
    location: { latitude: number; longitude: number },
    radiusKm: number = 10,
    vehicleType?: VehicleType,
    limit: number = 10
): Promise<IDriver[]> {
    const query: any = {
        status: DriverStatus.AVAILABLE,
        isActive: true,
        isVerified: true,
        'vehicle.isActive': true,
        'vehicle.isVerified': true,
        'location.timestamp': { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // Within last 5 minutes
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [location.longitude, location.latitude]
                },
                $maxDistance: radiusKm * 1000 // Convert km to meters
            }
        }
    };

    if (vehicleType) {
        query['vehicle.type'] = vehicleType;
    }

    return this.find(query).limit(limit);
};

// Instance methods
DriverSchema.methods.getFullName = function (): string {
    return `${this.firstName} ${this.lastName}`;
};

DriverSchema.methods.isAvailable = function (): boolean {
    return this.status === DriverStatus.AVAILABLE && this.isActive && this.isVerified;
};

DriverSchema.methods.canAcceptRide = function (): boolean {
    return this.isAvailable() && this.vehicle?.isActive && this.vehicle?.isVerified;
};

DriverSchema.methods.updateLocation = function (
    longitude: number,
    latitude: number,
    heading?: number,
    speed?: number,
    accuracy?: number
): void {
    this.location = {
        type: 'Point',
        coordinates: [longitude, latitude],
        heading,
        speed,
        accuracy,
        timestamp: new Date()
    };
};

const Driver: IDriverModel = model<IDriver, IDriverModel>('Driver', DriverSchema);

export default Driver;
export { IDriver, IDriverModel };