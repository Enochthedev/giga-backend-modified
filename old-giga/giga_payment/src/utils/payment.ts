
const generateTransactionReference = () => {
    // Generate a random number
  const randomNumber: number = Math.floor(Math.random() * 10000000000); // Adjust the range as needed
  
  // Get current timestamp
  const timestamp: number = Date.now();
  
  // Concatenate with a prefix or use any other logic you prefer
  const transactionReference: string = `TXN-${timestamp}-${randomNumber}`;
  
  return transactionReference;
};


export default generateTransactionReference;