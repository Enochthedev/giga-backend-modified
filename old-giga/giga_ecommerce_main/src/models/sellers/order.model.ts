import { Document, Model, model, Schema,Types } from 'mongoose';
// this is a seller module , use rabbit mq to call the orders from the main module(ecommerce main and get the orders from there)


export interface IOrder extends Document {
    customers: Types.ObjectId[];
    product: Types.ObjectId[];
    orderEntryTime: Date;
    orderFulfilmentTime: Date;
    
}




