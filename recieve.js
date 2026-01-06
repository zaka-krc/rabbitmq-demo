const amqp = require('amqplib');

const queue = 'demo_queue';

async function receive() {
  try {
    // 1. Connect to the RabbitMQ server
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    // 2. Define the queue (Must match the producer's queue name)
    await channel.assertQueue(queue, { durable: false });

    console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", queue);

    // 3. Define what to do when a message arrives
    channel.consume(queue, (msg) => {
      console.log(" [x] Received '%s'", msg.content.toString());
    }, {
        noAck: true // Automatically tell RabbitMQ "I got it"
    });
  } catch (error) {
    console.error("Error:", error);
  }
}

receive();