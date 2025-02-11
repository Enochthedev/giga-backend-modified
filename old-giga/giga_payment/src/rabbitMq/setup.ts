import amqp from "amqplib";

//step 1 : Connect to the rabbitmq server
//step 2 : Create a new channel on that connection
//step 3 : Create the exchange
//step 4 : Publish the message to the exchange with a routing key

class Rabbit {
  channel: any;

  async createChannel() {
    const connection = await amqp.connect("amqp://rabbitmq");
    this.channel = await connection.createChannel();
  }

  async publishMessage(queueName: string, data: any) {
    if (!this.channel) {
      await this.createChannel();
    }
    try {
        this.channel.sendToQueue(
            queueName,
            Buffer.from(
            JSON.stringify(data)
            )
        );
    
        console.log(
          `message sent`
        );
    } catch (error) {
        console.log(
            `Error occured: ${error}`
          );
    }
    
  }

  async consumeMessage(queueName: string, processData?: (data: any) => void) {
    return new Promise(async (resolve, reject) => {
      if (!this.channel) {
        await this.createChannel();
      }
  
      this.channel.assertQueue(queueName);
  
      this.channel.consume(queueName, (msg: any) => {
        const data = JSON.parse(msg.content);
        console.log(data);
        const message = data;
  
        // if you want to run a function with the message or just services texting each other
        if (processData) {
          processData(data);
        }
  
        
        resolve(message); // Resolve the promise with the received message
      },
      { noAck: true }
      );
    });
  }
}

export default Rabbit;