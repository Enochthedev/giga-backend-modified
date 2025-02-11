import { Document, Model, model, Schema,Types } from 'mongoose';

export interface ISubCategory extends Document {
    subCategoryName: string;
    subCategoryDescription: string;
    subCategoryImage: string;
    subCategoryProducts: Types.ObjectId[];
}

interface ISubCategoryModel extends Model<ISubCategory> {
    isSubCategoryNameTaken(subCategoryName: string): Promise<boolean>;
    doesSubCategoryExist(subCategoryName: string): Promise<boolean>;
    getSubCategoryObjectId(subCategoryName: string): Promise<Types.ObjectId>;
}

const subCategorySchema = new Schema<ISubCategory>({
    subCategoryName: { type: String, required: true },
    subCategoryDescription: { type: String, required: true },
    subCategoryImage: { type: String, required: true },
    subCategoryProducts: [{ type: Schema.Types.ObjectId, ref: 'Product', default: []}],
    
},
{
    timestamps: true,
});

// check if subcategory already exists
subCategorySchema.statics.isSubCategoryNameTaken = async function (subCategoryName: string) {
    const subCategory = await this.findOne({ subCategoryName });
    return !!subCategory;
};

subCategorySchema.statics.doesSubCategoryExist = async function (subCategoryName: string) {
    const subCategory = await this.findOne({ subCategoryName });
    return !!subCategory;
}

subCategorySchema.statics.getSubCategoryObjectId = async function (subCategoryName: string) {
    const subCategory = await this.findOne({ subCategoryName });
    return subCategory._id;
}

const SubCategory: ISubCategoryModel = model<ISubCategory, ISubCategoryModel>('SubCategory', subCategorySchema);

export default SubCategory;