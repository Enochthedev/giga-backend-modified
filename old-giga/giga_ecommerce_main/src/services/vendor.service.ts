import Vendor from '../models/sellers/vendor.model';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError';
import ApiResponse from 'src/utils/ApiResponse';
import mongoose, {ObjectId ,Schema} from 'mongoose';
import { EventSender } from '../utils/eventSystem';
import productService from './product.service';



interface CreateUserPayload{
    email: string;
    password: string;
    userName: string;
    phoneNumber: string;
    firstName: string;
    lastName: string,
    otherNames: string,
}

interface CreateVendorPayload {
    userId?: Schema.Types.ObjectId | string;
    createUserPayload?: CreateUserPayload;
    VendorName: string;
    normalizedName?: string;
    phoneNumber: string;
    location: { type: 'Point'; coordinates: [number, number] };
    email: string;
    KYC?: boolean;
    KYCData?: Schema.Types.ObjectId | string;
    vendorType?: string;
    BankDetails?:Schema.Types.ObjectId | string;
}

interface UpdateVendorPayload {
    vendorId: Schema.Types.ObjectId | string;
    VendorName?: string;
    normalizedName?: string;
    phoneNumber?: string;
    location?: { type: 'Point'; coordinates: [number, number] };
    email?: string;
    availability?: boolean;
    KYC?: boolean;
    KYCData?: Schema.Types.ObjectId | string;
    vendorType?: string;
    BankDetails?: Schema.Types.ObjectId | string;
}

interface GetVendorPayload {
    vendorId: Schema.Types.ObjectId | string;
}// works for all single vendor queries

interface GetAllVendorsPayload {
    limit?: number;
    page?: number;
}

interface AddKYCPayload {
    vendorId:Schema.Types.ObjectId | string;
    KYCData:Schema.Types.ObjectId | string;
}

interface AddBankDetailsPayload {
    vendorId:Schema.Types.ObjectId | string;
    BankDetails:Schema.Types.ObjectId | string;
}

interface rateVendorPayload {
    vendorId:Schema.Types.ObjectId | string;
    rating: number;
}

export class VendorService {
    private eventSender: EventSender;

    constructor() {
        this.eventSender = new EventSender();
    }

    public async createVendor(payload: CreateVendorPayload): Promise<ApiResponse<any>> {
        try {
            const {
                userId,
                createUserPayload,
                VendorName,
                normalizedName,
                phoneNumber,
                location,
                email,
                KYC,
                KYCData,
                vendorType,
                BankDetails,
            } = payload;
    
            // Check if the userId exists and is valid using event emitter
            let newUserId;
            if (userId) {
                const user = await this.eventSender.sendEvent({
                    name: 'getUser',
                    service: 'user',
                    payload: { userId },
                });
                // If the user doesn't exist and createUserPayload is not provided, throw an error
                if (!user && !createUserPayload) {
                    throw new ApiError(
                        httpStatus.BAD_REQUEST,
                        'User does not exist, and proper details have not been provided to create a new user'
                    );
                }
                if(!createUserPayload){
                    throw new ApiError(
                        httpStatus.BAD_REQUEST,
                        'User does not exist, and proper details have not been provided to create a new user'
                    );
                }
                // If the user doesn't exist, create a new user
                if (!user) {
                    const newUser = await this.eventSender.sendEvent({
                        name: 'createUser',
                        service: 'user',
                        payload: createUserPayload,
                    });
        
                    // Check if the new user was created successfully
                    if (!newUser) {
                        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'User could not be created');
                    }
        
                    // Assign userID
                    newUserId= newUser._id; // Assuming the user ID is available in the newUser object
                }
            }
            
            // Check if VendorName has been taken and throw an error
            if (await Vendor.isVendorNameTaken(VendorName)) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Vendor Name already taken');
            }
    
            // Check if phoneNumber has been taken and throw an error
            if (await Vendor.isPhoneNumberTaken(phoneNumber)) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Phone Number already taken');
            }
    
            // Create a new vendor
            const newVendor = await Vendor.create({
                user: userId || newUserId,
                VendorName,
                normalizedName,
                phoneNumber,
                location,
                email,
                KYC,
                KYCData,
                vendorType,
                BankDetails,
            });
    
            // Check if the new vendor was created successfully
            if (!newVendor) {
                throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Vendor could not be created');
            }
            this.eventSender.sendEvent({
                name: 'updateVendorStatus',
                service: 'User',
                payload: {
                    userId: userId || newUserId,
                    status: 'Activated'
                },
            });

    
            const response = {
                success: true,
                data: {
                    vendor: newVendor,
                    message: 'Vendor created successfully',
                },
            };
    
            return new ApiResponse(httpStatus.CREATED, response);
        } catch (error: any) {
            console.error('Error creating vendor:', error.message);
    
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else if (error.name === 'ValidationError') {
                // Handle validation errors (e.g., required fields missing)
                return new ApiResponse(httpStatus.BAD_REQUEST, { error: 'Validation error', details: error.errors });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }
    

    public async updateVendor(payload: UpdateVendorPayload): Promise<ApiResponse<any>> {
        try {
            const { vendorId, ...updateData } = payload;

            // Check if the vendor with the given ID exists
            const existingVendor = await Vendor.findById(vendorId);

            if (!existingVendor) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
            }

            // Update the vendor fields if they are provided
            Object.assign(existingVendor, updateData);

            // Save the updated vendor
            const updatedVendor = await existingVendor.save();

            const response = {
                success: true,
                data: {
                    vendor: updatedVendor,
                    message: 'Vendor updated successfully',
                },
            };

            return new ApiResponse(httpStatus.OK, response);
        } catch (error: any) {
            console.error('Error updating vendor:', error.message);

            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else if (error.name === 'ValidationError') {
                // Handle validation errors (e.g., required fields missing)
                return new ApiResponse(httpStatus.BAD_REQUEST, { error: 'Validation error', details: error.errors });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

    public async getVendor(payload: GetVendorPayload): Promise<ApiResponse<any>> {
        try{
            const { vendorId } = payload;

            // Check if the vendor with the given ID exists and populate related fields
            const vendor = await Vendor.findById(vendorId)
                .populate('user') 
                .populate('KYCData') 
                .populate('currentOrders') 
                .populate('products') 
                .exec();

            if (!vendor) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
            }

            const response = {
                success: true,
                data: {
                    vendor,
                    message: 'Vendor fetched successfully',
                },
            };

            return new ApiResponse(httpStatus.OK, response);

        } catch (error:any) {
            console.error('Error removing subcategory from category:', error.message);
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else if (error.name === 'ValidationError') {
                // Handle validation errors (e.g., required fields missing)
                return new ApiResponse(httpStatus.BAD_REQUEST, { error: 'Validation error', details: error.errors });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

    public async getAllVendorsInfo(payload: GetAllVendorsPayload): Promise<ApiResponse<any>> {
        try{
            const { limit = 10, page = 1 } = payload;
            const skip = (page - 1) * limit;

        // Fetch vendors with pagination
            const vendors = await Vendor.find({})
            .skip(skip)
            .limit(limit)
            .populate('user KYCData currentOrders products BankDetails');

            const totalDocs = await Vendor.countDocuments({});
            const totalPages = Math.ceil(totalDocs / limit);


            const response = {
                success: true,
                data: {
                    totalPages,
                    currentPage: page,
                    vendors,
                    message: 'Vendors retrieved successfully',
                },
        };
            
            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error removing subcategory from category:', error.message);
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else if (error.name === 'ValidationError') {
                // Handle validation errors (e.g., required fields missing)
                return new ApiResponse(httpStatus.BAD_REQUEST, { error: 'Validation error', details: error.errors });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

    public async getAllVendors(payload: GetAllVendorsPayload): Promise<ApiResponse<any>> {
        try{
            const { limit = 10, page = 1 } = payload;
            const skip = (page - 1) * limit;

        // Fetch vendors with pagination
            const vendors = await Vendor.find({})
            //check if the activation status is activated and if it is dont send their details
            .where('accountStatus').equals('Activated')
            //check if they have been blacklisted and if they have dont send their details
            .where('BlackListStatus').equals('NotBlackListed')
            .skip(skip)
            .limit(limit);

            const totalDocs = await Vendor.countDocuments({});
            const totalPages = Math.ceil(totalDocs / limit);


            const response = {
                success: true,
                data: {
                    totalPages,
                    currentPage: page,
                    totalResults: totalDocs,
                    vendors,
                    message: 'Vendors retrieved successfully',
                },
        };
            
            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error getting all vendors:', error.message);
            return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
        }
    }

    public async addKYC(payload: AddKYCPayload): Promise<ApiResponse<any>> {
        try{
            const { vendorId, KYCData } = payload;

        

            // Find the vendor by ID
            const vendor = await Vendor.findById(vendorId);

            // Check if the vendor exists
            if (!vendor) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
            }
            //check if KYC is valid using event emitter
            const KYC = await this.eventSender.sendEvent({
                name: 'getKYC',
                service: 'user',
                payload: { KYCData },
            });
            if (!KYC) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'KYC does not exist');
            }
            // push the KYC ObjectID to the vendor's KYCData
            vendor.KYCData = KYCData as ObjectId;
            // Save the changes
            await vendor.save();

            const response = {
                success: true,
                data: {
                    vendor,
                    message: 'KYC data added successfully',
                },
            };
            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error removing subcategory from category:', error.message);
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else if (error.name === 'ValidationError') {
                // Handle validation errors (e.g., required fields missing)
                return new ApiResponse(httpStatus.BAD_REQUEST, { error: 'Validation error', details: error.errors });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

    public async addBankDetails(payload: AddBankDetailsPayload): Promise<ApiResponse<any>> {
        try{
            const { vendorId, BankDetails } = payload;

            // Find the vendor by ID
            const vendor = await Vendor.findById(vendorId);
    
            // Check if the vendor exists
            if (!vendor) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
            }
            //check if BankDetails is valid using event emitter
            const ConfirmBankDetails = await this.eventSender.sendEvent({
                name: 'getBankDetails',
                service: 'user',
                payload: { BankDetails },
            });
            if (!ConfirmBankDetails) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'BankDetails does not exist');
            }
            // check if it is an ObjectID else convert it to an ObjectID
            
            vendor.BankDetails = BankDetails as ObjectId;
    
            // Save the changes
            await vendor.save();
    
            const response = {
                success: true,
                data: {
                    vendor,
                    message: 'Bank details added successfully',
                },
            };
            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error removing subcategory from category:', error.message);
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else if (error.name === 'ValidationError') {
                // Handle validation errors (e.g., required fields missing)
                return new ApiResponse(httpStatus.BAD_REQUEST, { error: 'Validation error', details: error.errors });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

    public async deleteVendor(payload: GetVendorPayload): Promise<ApiResponse<any>> {
        try{
            const { vendorId } = payload;

            // Find the vendor by ID
            const vendor = await Vendor.findById(vendorId);
    
            // Check if the vendor exists
            if (!vendor) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
            }
            //delete all products associated with vendor
            const products = vendor.products;
            for (let i = 0; i < products.length; i++) {
                const product = products[i];
                await productService.remove({productId: product});
            }
            // Delete the vendor
            await vendor.remove();
    
            const response = {
                success: true,
                data: {
                    message: 'Vendor deleted successfully',
                },
            };
            //remove vendor status from user do not await a response
            this.eventSender.sendEvent({
                name: 'updateVendorStatus',
                service: 'user',
                payload: { 
                    userId: vendor.user,
                    status: 'DeActivated' 
                },
            });

            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error removing subcategory from category:', error.message);
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else if (error.name === 'ValidationError') {
                // Handle validation errors (e.g., required fields missing)
                return new ApiResponse(httpStatus.BAD_REQUEST, { error: 'Validation error', details: error.errors });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

    public async blacklistVendor(payload: GetVendorPayload): Promise<ApiResponse<any>> {
        try{
            const { vendorId } = payload;

            // Find the vendor by ID
            const vendor = await Vendor.findById(vendorId);
    
            // Check if the vendor exists
            if (!vendor) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
            }
    
            // Update the vendor's BlackListStatus
            vendor.BlackListStatus = 'BlackListed';
            
            // Save the updated vendor
            await vendor.save();
    
            const response = {
                success: true,
                data: {
                    message: 'Vendor blacklisted successfully',
                },
            };  
            
            this.eventSender.sendEvent({
                name:'sendEmail',
                service: 'User',
                payload: {
                    email: vendor.email,
                    subject: 'Account Deactivation',
                    message: 'Your account has been Blacklisted due to multiple reports please contact the admin for more information to appeal this decision',
                },

            });

            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error removing subcategory from category:', error.message);
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else if (error.name === 'ValidationError') {
                // Handle validation errors (e.g., required fields missing)
                return new ApiResponse(httpStatus.BAD_REQUEST, { error: 'Validation error', details: error.errors });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

    public async unblacklistVendor(payload: GetVendorPayload): Promise<ApiResponse<any>> {
        try{
            const { vendorId } = payload;

            // Find the vendor by ID
            const vendor = await Vendor.findById(vendorId);
    
            // Check if the vendor exists
            if (!vendor) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
            }
    
            // Update the vendor's BlackListStatus
            vendor.BlackListStatus = 'NotBlackListed';
    
            // Save the updated vendor
            await vendor.save();
    
            const response = {
                success: true,
                data: {
                    message: 'Vendor unblacklisted successfully',
                },
            };   
            
            this.eventSender.sendEvent({
                name:'sendEmail',
                service: 'User',
                payload: {
                    email: vendor.email,
                    subject: 'Account Deactivation',
                    message: 'Your account has been unblacklisted',
                },

            });
            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error removing subcategory from category:', error.message);
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else if (error.name === 'ValidationError') {
                // Handle validation errors (e.g., required fields missing)
                return new ApiResponse(httpStatus.BAD_REQUEST, { error: 'Validation error', details: error.errors });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

    public async activateVendor(payload: GetVendorPayload): Promise<ApiResponse<any>> {
        try{
            const { vendorId } = payload;

            // Find the vendor by ID
            const vendor = await Vendor.findById(vendorId);

            // Check if the vendor exists
            if (!vendor) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
            }

            // Update the vendor's accountStatus
            vendor.accountStatus = 'Activated';

            // Save the updated vendor
            await vendor.save();

            const response = {
                success: true,
                data: {
                    message: 'Vendor activated successfully',
                },
            };
        


            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error removing subcategory from category:', error.message);
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else if (error.name === 'ValidationError') {
                // Handle validation errors (e.g., required fields missing)
                return new ApiResponse(httpStatus.BAD_REQUEST, { error: 'Validation error', details: error.errors });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

    public async deactivateVendor(payload: GetVendorPayload): Promise<ApiResponse<any>> {
        try{
            const { vendorId } = payload;

            // Find the vendor by ID
            const vendor = await Vendor.findById(vendorId);

            // Check if the vendor exists
            if (!vendor) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
            }

            // Update the vendor's accountStatus
            vendor.accountStatus = 'DeActivated';

            // Save the updated vendor
            await vendor.save();

            const response = {
                success: true,
                data: {
                    message: 'Vendor Deactivated successfully',
                },
            };
            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error removing subcategory from category:', error.message);
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else if (error.name === 'ValidationError') {
                // Handle validation errors (e.g., required fields missing)
                return new ApiResponse(httpStatus.BAD_REQUEST, { error: 'Validation error', details: error.errors });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

    public async reportVendor(payload: GetVendorPayload): Promise<ApiResponse<any>> {
        try{
            const { vendorId } = payload;
            if (!vendorId) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Vendor ID not provided');
            }
               //get the vendor Id and increment the report count
            const vendor = await Vendor.findById(vendorId);
            if (!vendor) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Vendor not found');
            }

            vendor.reportCount += 1;
            if (vendor.reportCount >= 5) {
                vendor.accountStatus = 'DeActivated';
                //send an email to the vendor
                this.eventSender.sendEvent({
                    name: 'sendEmail',
                    service: 'User',
                    payload: {
                        email: vendor.email,
                        subject: 'Account Deactivation',
                        message: 'Your account has been deactivated due to multiple reports please contact the admin for more information to appeal this decision',
                    },
                });
            }
            await vendor.save();

            const response = {
                success: true,
                data: {
                    message: 'Vendor reported successfully',
                },
            };

            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error removing subcategory from category:', error.message);
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else if (error.name === 'ValidationError') {
                // Handle validation errors (e.g., required fields missing)
                return new ApiResponse(httpStatus.BAD_REQUEST, { error: 'Validation error', details: error.errors });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

    public async clearReport(payload: GetVendorPayload): Promise<ApiResponse<any>> {
        try{
            const { vendorId } = payload;
            if (!vendorId) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Vendor ID not provided');
            }
               //get the vendor Id and increment the report count
            const vendor = await Vendor.findById(vendorId);
            if (!vendor) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Vendor not found');
            }
            //clear the report count
            vendor.reportCount = 0;
            await vendor.save();
            this.eventSender.sendEvent({
                name: 'sendEmail',
                service: 'User',
                payload: {
                    email: vendor.email,
                    subject: 'Account Deactivation',
                    message: 'Your account has been reactivated ',
                },
            });
            const response = {
                success: true,
                data: {
                    message: 'Vendor report cleared successfully',
                },
            };
            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error removing subcategory from category:', error.message);
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else if (error.name === 'ValidationError') {
                // Handle validation errors (e.g., required fields missing)
                return new ApiResponse(httpStatus.BAD_REQUEST, { error: 'Validation error', details: error.errors });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

    public async rateVendor(payload: rateVendorPayload): Promise<ApiResponse<any>> {
        try{
            const { vendorId, rating = 0} = payload;

            // Check if the vendorId is empty
            if (!vendorId) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Vendor ID is required');
            }

            // Get the number of ratings (assuming you have a field named 'numberOfRatings' in your vendor model)
            const vendor = await Vendor.findById(vendorId);
            if (!vendor) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
            }
            const updatedVendor = await Vendor.calculateAverageRating(vendorId, rating );

            //update the vendor rating using the new rating from updatedVendor
            vendor.rating = updatedVendor;
            // Save the updated vendor
            await vendor.save();

            // Assuming you have a field named 'ratings' in your vendor model
            const response = {
                success: true,
                data: {
                    message: 'Vendor rated successfully',
                },
            };
            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error removing subcategory from category:', error.message);
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else if (error.name === 'ValidationError') {
                // Handle validation errors (e.g., required fields missing)
                return new ApiResponse(httpStatus.BAD_REQUEST, { error: 'Validation error', details: error.errors });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

}

export default new VendorService();