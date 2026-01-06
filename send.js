const amqp = require('amqplib');

const queue = 'demo_queue';
const msg = 'Test';

async function send() {
  try {
    // 1. Connect to the RabbitMQ server
    const connection = await amqp.connect('amqp://localhost'); 
    const channel = await connection.createChannel();

    // 2. Define the queue (idempotent: creates it if it doesn't exist)
    await channel.assertQueue(queue, { durable: false });

    // 3. Send the message
    channel.sendToQueue(queue, Buffer.from(msg));
    console.log(" [x] Sent '%s'", msg);

    // 4. Close connection and exit
    setTimeout(() => {
      connection.close();
      process.exit(0);
    }, 500);
  } catch (error) {
    console.error("Error:", error);
  }
}

send();