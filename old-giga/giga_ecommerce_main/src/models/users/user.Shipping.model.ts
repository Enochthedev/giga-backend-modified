import { Schema, model, Document } from 'mongoose';
import { z } from 'zod';
// Define the schema for the Shipping model
const shippingSchema = new Schema<ShippingDocument>({
    packageId: { type: Number, required: true },
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    weight: { type: Number, required: true },
    dimensions: {
        length: { type: Number, required: true },
        width: { type: Number, required: true },
        height: { type: Number, required: true },
    },
    deliveryDate: { type: Date, required: true },
    status: { type: String, required: true },
});

// Define the interface for the Shipping document
interface Shipping {
    packageId: number;
    origin: string;
    destination: string;
    weight: number;
    dimensions: {
        length: number;
        width: number;
        height: number;
    };
    deliveryDate: Date;
    status: string;
}

// Define the Shipping document type using Mongoose's Document type
type ShippingDocument = Shipping & Document;

// Validate the Shipping object using Zod
const shippingValidator = z.object({
    packageId: z.number(),
    origin: z.string(),
    destination: z.string(),
    weight: z.number(),
    dimensions: z.object({
        length: z.number(),
        width: z.number(),
        height: z.number(),
    }),
    deliveryDate: z.date(),
    status: z.string(),
});

// Export the Mongoose model and the Zod validator
export const ShippingModel = model<ShippingDocument>('Shipping', shippingSchema);
export const ShippingValidator = shippingValidator;
