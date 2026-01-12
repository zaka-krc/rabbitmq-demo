const amqp = require('amqplib');
const config = require('./config');

// Ontvang berichten van de orders wachtrij
async function startReceiver(onMessageReceived) {
  const connection = await amqp.connect(config.RABBITMQ_URL);
  const channel = await connection.createChannel();

  // Declareer durable exchange (overleeft broker restart)
  await channel.assertExchange(config.EXCHANGE_NAME, 'topic', { durable: true });

  // Declareer durable named queue (overleeft broker restart)
  await channel.assertQueue(config.QUEUE_NAME, { durable: true });

  // Verbind queue aan exchange met routing pattern 'order.*'
  await channel.bindQueue(config.QUEUE_NAME, config.EXCHANGE_NAME, 'order.*');

  console.log(" [*] Waiting for orders in '%s'... (Press Ctrl+C to exit)", config.QUEUE_NAME);

  channel.consume(config.QUEUE_NAME, (msg) => {
    if (msg !== null) {
      const { decrypt } = require('./crypto-utils');

      const routingKey = msg.fields.routingKey;
      let messageData = JSON.parse(msg.content.toString());

      if (messageData.encryptedData) {
        messageData = decrypt(messageData.encryptedData);
      }

      console.log("\n [x] Received order:");
      console.log("     Routing key: %s", routingKey);
      console.log("     Order ID: %s", messageData.data.orderId);
      console.log("     Customer: %s", messageData.data.customerName);
      console.log("     Timestamp: %s", messageData.timestamp);

      // Als er een callback is (zoals van onze Test), voer deze uit!
      if (onMessageReceived) {
        onMessageReceived(messageData, routingKey);
      }

      // Bevestig het bericht (vertelt RabbitMQ dat we het verwerkt hebben)
      channel.ack(msg);
    }
  }, { noAck: false });

  return { connection, channel };
}

// Indien direct uitgevoerd, start luisteren
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

  // Sluit de verbinding netjes bij afsluiten
  process.on('SIGINT', () => {
    console.log("\nClosing RabbitMQ connection...");
    if (connection) {
      connection.close();
    }
    process.exit(0);
  });
}

module.exports = startReceiver;
