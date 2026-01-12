const amqp = require('amqplib');
const readline = require('readline');
const config = require('./config');
require('dotenv').config();


// Send a message with a routing key and JSON data
async function sendMessage(routingKey, data) {
  const connection = await amqp.connect(config.RABBITMQ_URL);
  const channel = await connection.createChannel();
  
  // Declare durable exchange (survives broker restart)
  await channel.assertExchange(config.EXCHANGE_NAME, 'topic', { durable: true });
  
  // Declare durable queue (survives broker restart)
  await channel.assertQueue(config.QUEUE_NAME, { durable: true });
  
  // Bind queue to exchange with routing pattern
  await channel.bindQueue(config.QUEUE_NAME, config.EXCHANGE_NAME, 'order.*');
  
  // Create JSON message with metadata
  const message = {
    type: routingKey,
    timestamp: new Date().toISOString(),
    data: data
  };
  
  const msgBuffer = Buffer.from(JSON.stringify(message));
  
  // Publish with persistent: true (message survives broker restart)
  channel.publish(config.EXCHANGE_NAME, routingKey, msgBuffer, { persistent: true });
  
  console.log("\n [x] Sent order to queue!");
  console.log("     Routing key: %s", routingKey);
  console.log("     Data: %s", JSON.stringify(data, null, 2));
  
  setTimeout(() => {
    connection.close(); 
  }, 500);
}

// Interactive order creation
function createOrder() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("\n=== Create New Order ===\n");

  rl.question('Enter order ID: ', (orderId) => {
    rl.question('Enter customer name: ', (customerName) => {
      rl.close();

      // Validate inputs
      if (!orderId.trim() || !customerName.trim()) {
        console.log('\n❌ Error: Both order ID and customer name are required!');
        process.exit(1);
      }

      // Build the order object
      const order = {
        orderId: orderId.trim(),
        customerName: customerName.trim()
      };

      // Send with routing key 'order.create'
      sendMessage(config.ROUTING_KEY, order);
    });
  });
}

// If running this file directly, start the interactive order creation
if (require.main === module) {
  createOrder();
}

// Export the function for tests
module.exports = sendMessage;
