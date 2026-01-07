const amqp = require('amqplib');

const exchange = 'demo_exchange';

// Receive messages matching a routing pattern
async function startReceiver(routingPattern = '#', onMessageReceived) {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();
  
  // Use topic exchange
  await channel.assertExchange(exchange, 'topic', { durable: false });
  
  // Create a temporary exclusive queue (auto-deleted when connection closes)
  const q = await channel.assertQueue('', { exclusive: true });
  
  // Bind queue to exchange with routing pattern
  await channel.bindQueue(q.queue, exchange, routingPattern);

  console.log(" [*] Waiting for messages matching '%s'... (Press Ctrl+C to exit)", routingPattern);

  channel.consume(q.queue, (msg) => {
    if (msg !== null) {
      const routingKey = msg.fields.routingKey;
      const messageData = JSON.parse(msg.content.toString());
      
      console.log(" [x] Received [%s]: %s", routingKey, JSON.stringify(messageData.data));
      
      // If a callback exists (like from our Test), run it!
      if (onMessageReceived) {
          onMessageReceived(messageData, routingKey);
      }
      
      // Acknowledge the message
      channel.ack(msg);
    }
  }, { noAck: false });
  
  return connection; // Return connection so the test can close it later
}

// If running directly, listen to all messages automatically
if (require.main === module) {
    console.log("Starting receiver...");
    let connection;
    
    startReceiver('#')
        .then(conn => {
            connection = conn;
            console.log("Receiver is now active and listening...");
        })
        .catch(err => {
            console.error("Failed to start receiver:", err);
            process.exit(1);
        });

    // Gracefully close the connection on exit
    process.on('SIGINT', () => {
        console.log("\nClosing RabbitMQ connection...");
        if (connection) {
            connection.close();
        }
        process.exit(0);
    });
}

module.exports = startReceiver;