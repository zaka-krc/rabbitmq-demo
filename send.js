const amqp = require('amqplib');

const queue = 'demo_queue';

// We wrap the code in a function that accepts the message as an argument
async function sendMessage(msg) {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();
  
  await channel.assertQueue(queue, { durable: false });
  channel.sendToQueue(queue, Buffer.from(msg));
  
  console.log(" [x] Sent '%s'", msg);
  
  setTimeout(() => {
    connection.close();
  }, 500);
}

// If running this file directly (node send.js), execute the function
if (require.main === module) {
    sendMessage('Hello World from Node!');
}

// Export the function for the test to use
module.exports = sendMessage;