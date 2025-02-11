import { AnyExpression, Document, Model, model, Schema,Types } from 'mongoose';
import Review, { IReview } from '../users/reviews.model'; 

export interface IProduct extends Document {
    vendor: Schema.Types.ObjectId;
    shop: Schema.Types.ObjectId;
    productName: string;
    productDisplayName: string;//might not be needed
    productDescription: string;
    productCategory: Schema.Types.ObjectId;
    productSubCategory: Schema.Types.ObjectId;
    productImages: string[];
    productPrice: number;
    productAmountInStock: number;
    productRating: number;
    productFulfilmentTime: number;
    productReviews: Types.ObjectId[];
    score?: number;
    [key: string]: any;
}

interface IProductModel extends Model<IProduct> {
    averageRating(productId: Types.ObjectId): Promise<number>;
    searchByText(query: string): Promise<IProduct[]>;
    findByCategory(productCategory: string): Promise<IProduct[]>;
    getHighestSales(): Promise<number>;
    getProductObjectId(productName: string, vendorId:any): Promise<Types.ObjectId>;
}

const productSchema = new Schema<IProduct>({
    vendor: { type: Schema.Types.ObjectId, ref: 'vendor', required: true },
    productName: { type: String, required: true },
    productDisplayName: { type: String, required: true },
    productDescription: { type: String, required: true },
    productCategory: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    productSubCategory: { type: Schema.Types.ObjectId, ref: 'SubCategory', required: true },
    productImages: [{ type: String, required: true }],
    productPrice: { type: Number, required: true },
    productAmountInStock: { type: Number, required: true },
    //create section for product rating and set default to 0
    productRating: { type: Number, default: 0 },
    productFulfilmentTime: { type: Number, required: true},
    productReviews: [{ type: Schema.Types.ObjectId, ref: 'Review' , default: []}],
    sales: { type: Number, default: 0 },
},
{
    timestamps: true,
});

//find by category
productSchema.statics.findByCategory = async function (productCategory: string): Promise<IProduct[]> {
    return await this.find({ productCategory });
};

productSchema.statics.averageRating = async function (productId: Types.ObjectId): Promise<number> {
    const reviews = await Review.find({ productId });
    if (reviews.length === 0) return 0;
    
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    return totalRating / reviews.length;
};

// Text index on productName and productDescription
productSchema.index({ productName: 'text', productDescription: 'text' });

productSchema.statics.searchByText = async function (query: string): Promise<IProduct[]> {
    const results = await this.find(
        { $text: { $search: query } },
        { score: { $meta: 'textScore' } }
    )
        .sort({ score: { $meta: 'textScore' } })
        .exec();

    return results;
};
//get the higest sales among all the products
productSchema.statics.getHighestSales = async function (): Promise<number> {
    const results = await this.find().sort({ sales: -1 }).exec();
    return results[0].sales;
};

productSchema.pre('save', async function (next) {
    const product = this as IProduct;
    if (product.isModified('productReviews')) {
        const avgRating = await Product.averageRating(product._id);
        product.productRating = avgRating;
    }
    next();
});

productSchema.statics.getProductObjectId = async function (productName: string, vendorId:any): Promise<Types.ObjectId> {
    const product = await this.findOne({ productName });
    return product._id;
};


const Product: IProductModel = model<IProduct, IProductModel>('Product', productSchema);

export default Product;

