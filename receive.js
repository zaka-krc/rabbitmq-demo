const amqp = require('amqplib');
const config = require('./config');
const salesforce = require('./salesforce');

// Receive messages from the orders queue
async function startReceiver(onMessageReceived) {
  const connection = await amqp.connect(config.RABBITMQ_URL);
  const channel = await connection.createChannel();
  
  // Declare durable exchange (survives broker restart)
  await channel.assertExchange(config.EXCHANGE_NAME, 'topic', { durable: true });
  
  // Declare durable named queue (survives broker restart)
  await channel.assertQueue(config.QUEUE_NAME, { durable: true });
  
  // Bind queue to exchange with routing pattern 'order.*'
  await channel.bindQueue(config.QUEUE_NAME, config.EXCHANGE_NAME, 'order.*');

  console.log(" [*] Waiting for orders in '%s'... (Press Ctrl+C to exit)", config.QUEUE_NAME);

  channel.consume(config.QUEUE_NAME, (msg) => {
    if (msg !== null) {
      (async () => {
        const routingKey = msg.fields.routingKey;
        const messageData = JSON.parse(msg.content.toString());

        console.log("\n [x] Received order:");
        console.log("     Routing key: %s", routingKey);
        console.log("     Order ID: %s", messageData.data.orderId);
        console.log("     Customer: %s", messageData.data.customerName);
        console.log("     Timestamp: %s", messageData.timestamp);

        // If a callback exists (like from our Test), run it!
        if (onMessageReceived) {
          try { onMessageReceived(messageData, routingKey); } catch (e) { console.error('onMessageReceived callback error', e); }
        }

        // Try to sync with Salesforce before acknowledging. On error, requeue message.
        try {
          await salesforce.upsertOrder(messageData.data);
          channel.ack(msg);
        } catch (err) {
          console.error('Failed to sync order to Salesforce, will requeue:', err);
          // nack with requeue = true so the message can be retried
          try { channel.nack(msg, false, true); } catch (e) { console.error('Failed to nack message', e); }
        }
      })();
    }
  }, { noAck: false });
  
  return { connection, channel };
}

// If running directly, start listening
if (require.main === module) {
  console.log("Starting order receiver...");
  let connection;
  
  startReceiver()
    .then(result => {
      connection = result.connection;
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
