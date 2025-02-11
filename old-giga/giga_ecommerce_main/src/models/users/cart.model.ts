import { Document, Model, model, Schema } from 'mongoose';

interface ICartItem {
    productId: Schema.Types.ObjectId;
    quantity: number;
    price: number;
}

interface ICart extends Document {
    userId: Schema.Types.ObjectId;
    items: ICartItem[];
    getTotalPrice(): number;
}

interface ICartModel extends Model<ICart> {
    getCartByUserId(userId: string): Promise<ICart | null>;
}

const CartSchema: Schema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        items: [
            {
                productId: {
                    type: Schema.Types.ObjectId,
                    required: true,
                    ref: 'Product'
                },
                quantity: {
                    type: Number,
                    required: true,
                    default: 1
                },
                price: {
                    type: Number,
                    required: true
                }
            }
        ]
    },
    {
        timestamps: true
    }
);

CartSchema.methods.getTotalPrice = function (this: ICart): number {
    return this.items.reduce((total: number, item: ICartItem) => total + item.quantity * item.price, 0);
};

CartSchema.statics.getCartByUserId = async function (userId: string) {
    const cart = await this.findOne({ userId }).populate('items.productId', 'name price'); // Adjust the fields as needed
    return cart?.toObject(); // Convert to plain JavaScript object
};

const Cart = model<ICart, ICartModel>('Cart', CartSchema);

export default Cart;

