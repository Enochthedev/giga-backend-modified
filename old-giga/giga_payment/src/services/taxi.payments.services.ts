import { CreditCard, ICreditCard } from '../models/creditCard.model';
import Rabbit from '../rabbitMq/setup';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError';
import Flutterwave from 'flutterwave-node-v3';
import generateTransactionReference from '../utils/payment';

const flutterwave = new Flutterwave('FLWPUBK_TEST-b84f980af3c945155bf845f2680028cc-X', 'FLWSECK_TEST-90782a4930b5c5eae4552ded6441098b-X');

const rabbit = new Rabbit();

const payRideFee = async (token: string, amount: number) => {
    try {
      // // Fetch credit card data from the database
      // const creditCard: ICreditCard | null = await CreditCard.findById(cardId);
  
      // if (!creditCard) {
      //   throw new Error('Credit card not found');
      // }
  
      // Now you have the credit card data, use Flutterwave to make the payment
      
  
       
    } catch (error) {
      console.log('Payment error:', error);
      throw error;
    }
  };
  




export default {
    payRideFee
 };
