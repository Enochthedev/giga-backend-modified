import mongoose, { Document, Model } from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcryptjs';



interface ICreditCard extends Document {
    creditCard: ICreditCard['_id'];
    cardHolderName: string;
    token: string;
    createdAt: Date;
    updatedAt: Date;
}

interface ICreditCardModel extends Model<ICreditCard> {
    
}

const creditCardSchema = new mongoose.Schema<ICreditCard>(
    {
    cardHolderName: {
        type: String,
        trim: true,
        lowercase: true,
    },
    token: {
        type: String,
        unique: true,
        required: true,
        },
    },
    {
        timestamps: true,
    }
);

const CreditCard = mongoose.model<ICreditCard, ICreditCardModel>('CreditCard', creditCardSchema);

export { CreditCard, ICreditCard, ICreditCardModel };
