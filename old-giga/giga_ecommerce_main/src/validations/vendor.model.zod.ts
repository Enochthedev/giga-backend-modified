import { z } from "zod";
import mongoose from "mongoose";

const CreateUserPayload = z.object({
    email: z.string().email(),
    password: z.string(),
    userName: z.string(),
    phoneNumber: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    otherNames: z.string(),
});

const userIdSchema = z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
    message: "Invalid categoryId",
});


const CreateVendorPayload = z.object({

    //userId will be any thing that can be converted to mongoose.Types.ObjectId
    userId: userIdSchema.optional(),
    createUserPayload: CreateUserPayload.optional(),
    VendorName: z.string(),
    normalizedName: z.string().optional(),
    phoneNumber: z.string(),
    location: z.object({
        type: z.literal('Point'),
        coordinates: z.tuple([z.number(), z.number()]),
    }),
    email: z.string().email(),
    KYC: z.boolean().optional(),
    KYCData: z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
        message: "Invalid KYCData",
    }).optional(),
    vendorType: z.string().optional(),
    BankDetails: z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
        message: "Invalid BankDetails",
    }).optional(),
});

const UpdateVendorPayload = z.object({
    vendorId: z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
        message: "Invalid vendorId",
    }),
    VendorName: z.string().optional(),
    normalizedName: z.string().optional(),
    phoneNumber: z.string().optional(),
    location: z.object({
        type: z.literal('Point'),
        coordinates: z.tuple([z.number(), z.number()])
    }).optional(),
    email: z.string().email().optional(),
    availability: z.boolean().optional(),
    KYC: z.boolean().optional(),
    KYCData: z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
        message: "Invalid KYCData",
    }).optional(),
    vendorType: z.string().optional(),
    BankDetails: z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
        message: "Invalid BankDetails",
    }).optional(),
});

const GetVendorPayload = z.object({
    vendorId: z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
        message: "Invalid vendorId",
    }),
});

const GetAllVendorsPayload = z.object({
    limit: z.number().positive().optional(),
    page: z.number().positive().optional(),
});

const AddKYCPayload = z.object({
    vendorId:  z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
        message: "Invalid vendorId",
    }),
    KYCData: z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
        message: "Invalid KYCData",
    }),
});

const AddBankDetailsPayload = z.object({
    vendorId:  z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
        message: "Invalid vendorId",
    }),
    BankDetails: z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
        message: "Invalid BankDetails",
    }),
});

const RateVendorPayload = z.object({
    vendorId: z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
        message: "Invalid vendorId",
    }),
    rating: z.number().positive(),
});

export default {
    CreateUserPayload,
    CreateVendorPayload,
    UpdateVendorPayload,
    GetVendorPayload,
    GetAllVendorsPayload,
    AddKYCPayload,
    AddBankDetailsPayload,
    RateVendorPayload,
};