const amqp = require('amqplib');
const readline = require('readline');

const exchange = 'demo_exchange';

// Send a message with a routing key and JSON data
async function sendMessage(routingKey, data) {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();
  
  // Use topic exchange for routing
  await channel.assertExchange(exchange, 'topic', { durable: false });
  
  // Create JSON message with metadata
  const message = {
    type: routingKey,
    timestamp: new Date().toISOString(),
    data: data
  };
  
  const msgBuffer = Buffer.from(JSON.stringify(message));
  channel.publish(exchange, routingKey, msgBuffer, { persistent: false });
  
  console.log(" [x] Sent with routing key [%s]: %s", routingKey, JSON.stringify(data));
  
  setTimeout(() => {
    connection.close();
  }, 500);
}

// If running this file directly (node send.js), execute the function
if (require.main === module) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Enter routing key (e.g., order.create, customer.update): ', (routingKey) => {
        rl.question('Enter message data as JSON (or press Enter for default): ', (dataInput) => {
            rl.close();
            
            let data;
            if (dataInput.trim()) {
                try {
                    data = JSON.parse(dataInput);
                } catch (e) {
                    console.log('Invalid JSON, using as text...');
                    data = { message: dataInput };
                }
            } else {
                data = { 
                    orderId: '12345', 
                    product: 'Widget', 
                    quantity: 10,
                    customer: 'ACME Corp'
                };
            }
            
            sendMessage(routingKey.trim(), data);
        });
    });
}

// Export the function for the test to use
module.exports = sendMessage;