// send.js
const amqp = require('amqplib');
const config = require('./config');

// Deze functie blijft hetzelfde als je al had
async function sendMessage(routingKey, data) {
  const connection = await amqp.connect(config.RABBITMQ_URL);
  const channel = await connection.createChannel();

  await channel.assertExchange(config.EXCHANGE_NAME, 'topic', { durable: true });
  await channel.assertQueue(config.QUEUE_NAME, { durable: true });
  await channel.bindQueue(config.QUEUE_NAME, config.EXCHANGE_NAME, 'order.*');

  const { encrypt } = require('./crypto-utils');

  const message = {
    type: routingKey,
    timestamp: new Date().toISOString(),
    data: data
  };

  const payload = { encryptedData: encrypt(message) };

  // Verstuur bericht
  channel.publish(config.EXCHANGE_NAME, routingKey, Buffer.from(JSON.stringify(payload)), { persistent: true });

  console.log(` [x] Sent '${routingKey}':`, data);

  // Sluit verbinding na 500ms
  setTimeout(() => {
    connection.close();
  }, 500);
}

// --- DIT STUKJE IS BELANGRIJK ---
// Alleen als we dit bestand direct uitvoeren ("node send.js"), starten we de interactieve modus.
// Als we het importeren in server.js, wordt dit overgeslagen.
if (require.main === module) {
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log("\n=== Create New Order (CLI Mode) ===\n");
  rl.question('Order ID: ', (id) => {
    rl.question('Customer: ', (cust) => {
      sendMessage(config.ROUTING_KEY, { orderId: id, customerName: cust });
      rl.close();
    });
  });
}

// Exporteer de functie zodat server.js hem kan gebruiken
module.exports = sendMessage;