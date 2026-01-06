const amqp = require('amqplib');
const queue = 'demo_queue';

// We accept a "callback" function. 
// This lets the Test inject its own logic (like "did the test pass?")
async function startReceiver(onMessageReceived) {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();
  
  await channel.assertQueue(queue, { durable: false });

  console.log(" [*] Waiting for messages...");

  channel.consume(queue, (msg) => {
    if (msg !== null) {
      console.log(" [x] Received '%s'", msg.content.toString());
      
      // If a callback exists (like from our Test), run it!
      if (onMessageReceived) {
          onMessageReceived(msg.content.toString());
      }
    }
  }, { noAck: true });
  
  return connection; // Return connection so the test can close it later
}

// If running directly, just log the message
if (require.main === module) {
    startReceiver();
}

module.exports = startReceiver;