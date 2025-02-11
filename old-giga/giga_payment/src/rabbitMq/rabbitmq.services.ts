import Rabbit from './setup';
import dotenv from 'dotenv';
const rabbit = new Rabbit();  

import Flutterwave from 'flutterwave-node-v3';
import generateTransactionReference from '../utils/payment';
//call dotenv to load environment variables

dotenv.config();

const flutterwave = new Flutterwave('FLWPUBK_TEST-b84f980af3c945155bf845f2680028cc-X', 'FLWSECK_TEST-90782a4930b5c5eae4552ded6441098b-X');

const payFee = async () => {
    //function to do something with the data in the rabbit mq message(add card)
    async function processData(data: any) {
        // Perform custom actions with the data
        const details = {
            token: data.token,
            currency: "NGN",
            country: "NG",
            amount: data.amount,
            email: "generic@yahoo.com",
            tx_ref: generateTransactionReference(),
            narration: data.narration,
        };
        const response = await flutterwave.Tokenized.charge(details);
        rabbit.publishMessage('payFeeResponse', response);
    }

    // Call consumeMessage and pass the processData function

    rabbit.consumeMessage('payFee', processData);
};

export default {
    payFee
}; 