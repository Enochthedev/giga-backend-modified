import { Document, Model, model, Schema,Types } from 'mongoose';
// call user ID into the user using rabbit

interface IVendor extends Document {
    user: Schema.Types.ObjectId;
    VendorName: string;
    normalizedName: string;
    earnings: number;
    KYC: boolean;
    email: string;
    KYCData: Schema.Types.ObjectId;
    phoneNumber: string;
    location: { type: 'Point'; coordinates: [number, number] };
    availability: boolean;
    rating: number;
    numberOfSales: number;
    customerSatisfaction: number;
    products: Schema.Types.ObjectId[];
    vendorType: string;
    reportCount: number;
    currentOrders: Schema.Types.ObjectId | null;
    accountStatus: string;
    BankDetails: Schema.Types.ObjectId;
    BlackListStatus: string;
}

interface IVendorModel extends Model<IVendor> {
    isVendorNameTaken(vendorName:string): Promise<boolean>;
    isPhoneNumberTaken(phoneNumber:string): Promise<boolean>;
    calculateAverageRating(vendorId: Schema.Types.ObjectId | string, newRating: number): Promise<number>;
}

const vendorSchema = new Schema<IVendor>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    VendorName: { type: String, required: true, unique: true},
    earnings: { type: Number, default: 0 },
    normalizedName: { type: String, required: true},
    phoneNumber: { type: String, required: true ,unique: true },
    location: {
        type: 'Point',
        coordinates: { type: [Number], required: true },
    },
    email: { type: String,required : true },
    availability: { type: Boolean, default: true },
    KYC: { type: Boolean, default: false },
    KYCData: { type: Schema.Types.ObjectId, ref: 'KYC', default: null },
    rating: { type: Number, default: 0 },
    vendorType: {type: String, required: true},//get back to this (time stamp 20:06, 19/09/2023)
    numberOfSales: { type: Number, default: 0 },
    customerSatisfaction: { type: Number, default: 0 },
    currentOrders: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    reportCount: { type: Number, default: 0 },
    products: [{ type: Schema.Types.ObjectId, ref: 'Product', default: [] }],
    accountStatus: { type: String, enum: ['Activated', 'DeActivated'], default: 'DeActivated' },
    BankDetails: { type: Schema.Types.ObjectId, ref: 'BankDetails', default: null },
    BlackListStatus: { type: String, enum: ['BlackListed', 'NotBlackListed'], default: 'NotBlackListed' },

},
{
    timestamps: true,
});

vendorSchema.index({ location: '2dsphere' });



vendorSchema.statics.isVendorNameTaken = async function (normalizedName:string): Promise<boolean> {
    const vendor = await this.findOne({ normalizedName });
    return !!vendor;
};

vendorSchema.statics.isPhoneNumberTaken = async function (phoneNumber:string): Promise<boolean> {
    const vendor = await this.findOne({ phoneNumber });
    return !!vendor;
}

//rating system, gets the current rating and the new rating, makes the average and returns the new rating
vendorSchema.statics.calculateAverageRating = async function (vendorId: Schema.Types.ObjectId, newRating: number) {
    //get the current rating
    const vendor = await this.findById(vendorId);
    const currentRating = vendor.rating;
    //calculate the new rating
    const newAverageRating = (currentRating + newRating) / 2;
    //return the new rating
    return newAverageRating;
};

const vendor: IVendorModel = model<IVendor, IVendorModel>('vendor', vendorSchema);
export default vendor;

