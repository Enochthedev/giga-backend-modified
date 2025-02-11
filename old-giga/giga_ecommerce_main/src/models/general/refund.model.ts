//write a model for refunded products for the shop 
import mongoose, { Document, Schema } from 'mongoose';

interface IRefund extends Document {
    productId: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    sellerId: Schema.Types.ObjectId;
    reason: string;
    refundDate: Date;
    status: string;
}


const RefundSchema: Schema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'Seller', required: true },
    reason: { type: String, required: true },
    refundDate: { type: Date, default: Date.now },
    status: { type: String, required: true },
},
{
        timestamps: true
    }
);


export default mongoose.model<IRefund>('Refund', RefundSchema);