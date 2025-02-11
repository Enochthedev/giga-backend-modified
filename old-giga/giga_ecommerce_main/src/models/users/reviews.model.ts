import { Document, Schema, Model,model,Types} from 'mongoose';
import Product from "../general/product.model";

export interface IReview extends Document {
    user: Types.ObjectId;
    productId: Types.ObjectId;
    review: string;
    rating: number;
}


interface IReviewModel extends Model<IReview> {
    calculateAverageRating(productId: Types.ObjectId): Promise<number>;
    updateProductRating(productId: Types.ObjectId, newRating: number): Promise<void>;
}


const reviewSchema = new Schema<IReview>({
    user: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    productId:{ type: Schema.Types.ObjectId, ref: 'product', required: true },
    review: { type: String, required: true },
    rating: { type: Number, required: true ,default: 0, min: 0, max: 5},
},
{
    timestamps: true,
});

reviewSchema.statics.calculateAverageRating = async function (productId: Types.ObjectId) {
    const result = await this.aggregate([
        { $match: { productId } },
        { $group: { _id: null, averageRating: { $avg: '$rating' } } }
    ]);
    //return the average rating in 1 decimal place
    return Math.round(result[0].averageRating * 10) / 10;
};
reviewSchema.statics.updateProductRating = async function (productId: Types.ObjectId, newRating: number) {
    // Assuming you have a Product model
    const Product = require('../models/product.model');

    // Update the Product document with the new average rating
    await Product.updateOne({ _id: productId }, { $set: { productRating: newRating } });
};

reviewSchema.pre('save', async function (next) {
    const productId = this.productId;
    const newRating = this.rating;

    // Calculate the updated average rating for the product
    const updatedAverageRating = await Review.calculateAverageRating(productId);

    // Update the Product document with the new average rating
    await Review.updateProductRating(productId, updatedAverageRating);

    next();
});

const Review: IReviewModel = model<IReview, IReviewModel>('Review', reviewSchema);
export default Review;
