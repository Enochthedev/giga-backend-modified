import { Document, Model, model, Schema, Types } from 'mongoose';

export interface ICategory extends Document {
    categoryName: string;
    categoryDescription: string;
    categoryImage: string;
    categorySubCategories: Types.ObjectId[];
    categoryProducts: Types.ObjectId[];
}

interface ICategoryModel extends Model<ICategory> {
    isCategoryTaken(categoryName: string): Promise<boolean>;
    doesCategoryExist(categoryName: string): Promise<boolean>;
    isSubCategoryInCategory(categoryId: Types.ObjectId, subCategoryId: Types.ObjectId): Promise<boolean>;
    getCategoryObjectId(categoryName: string): Promise<Types.ObjectId | null>;
    isProductInCategory(categoryId: Types.ObjectId, productId: Types.ObjectId): Promise<boolean>;
}

const categorySchema = new Schema<ICategory>(
    {
        categoryName: { type: String, required: true, unique: true },
        categoryDescription: { type: String, required: true },
        categoryImage: { type: String, required: true },
        categorySubCategories: [{ type: Schema.Types.ObjectId, ref: 'SubCategory', default: [] }],
        categoryProducts: [{ type: Schema.Types.ObjectId, ref: 'Product', default: [] }],
    },
    {
        timestamps: true,
    }
);

categorySchema.statics.isCategoryTaken = async function (categoryName: string): Promise<boolean> {
    try {
        const category = await this.findOne({ categoryName });
        return !!category;
    } catch (error) {
        console.error('Error checking if category is taken:', error);
        return false;
    }
};

categorySchema.statics.doesCategoryExist = async function (categoryName: string): Promise<boolean> {
    try {
        const category = await this.findOne({ categoryName });
        return !!category;
    } catch (error) {
        console.error('Error checking if category exists:', error);
        return false;
    }
};

categorySchema.statics.isSubCategoryInCategory = async function (
    categoryId: Types.ObjectId,
    subCategoryId: Types.ObjectId
): Promise<boolean> {
    try {
        const category = await this.findOne({ _id: categoryId, categorySubCategories: subCategoryId });
        return !!category;
    } catch (error) {
        console.error('Error checking if subcategory is in category:', error);
        return false;
    }
};

categorySchema.statics.getCategoryObjectId = async function (
    categoryName: string
): Promise<Types.ObjectId | null> {
    try {
        const category = await this.findOne({ categoryName });
        return category ? category._id : null;
    } catch (error) {
        console.error('Error getting category ObjectId:', error);
        return null;
    }
};

categorySchema.statics.isProductInCategory = async function (
    categoryId: Types.ObjectId,
    productId: Types.ObjectId
): Promise<boolean> {
    try {
        const category = await this.findOne({ _id: categoryId, categoryProducts: productId });
        return !!category;
    } catch (error) {
        console.error('Error checking if product is in category:', error);
        return false;
    }
};

const Category = model<ICategory, ICategoryModel>('Category', categorySchema);

export default Category;
