import { Document, Model, model, Schema,Types } from 'mongoose';


export interface IproductOrder extends Document {
    cartId: Types.ObjectId;
    productId: Types.ObjectId;
    orderEntryTime: Date;
    orderFulfilmentTime: Date;
    quantity: number;
    price: number;
    customer: Types.ObjectId;
    seller: Types.ObjectId;
    orderStatus: string;
    paymentStatus: string;
    paymentMode: string;
    paymentTime: Date;
    deliveryStatus: string;
}