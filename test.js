const amqp = require('amqplib');
const sendMessage = require('./send');
const config = require('./config');
const assert = require('assert');

const testData = { orderId: 'TEST-001', customerName: 'Test Customer' };

async function runTest() {
  console.log("--- Starting Integration Test ---\n");

  let connection;
  let channel;

  try {
    // 1. Verbind en zet queue op (hetzelfde als receive.js doet)
    connection = await amqp.connect(config.RABBITMQ_URL, config.RABBITMQ_OPTIONS);
    channel = await connection.createChannel();

    await channel.assertExchange(config.EXCHANGE_NAME, 'topic', { durable: true });
    await channel.assertQueue(config.QUEUE_NAME, { durable: true });
    await channel.bindQueue(config.QUEUE_NAME, config.EXCHANGE_NAME, 'order.*');

    console.log(`[1] Connected to queue '${config.QUEUE_NAME}'`);

    // 2. Verwijder oude berichten (schone lei voor test)
    await channel.purgeQueue(config.QUEUE_NAME);
    console.log("[2] Purged old messages from queue");

    // 3. Zet consumer op met test asserties
    const messageReceived = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout: No message received within 5 seconds"));
      }, 5000);

      channel.consume(config.QUEUE_NAME, (msg) => {
        if (msg !== null) {
          const { decrypt } = require('./crypto-utils');

          clearTimeout(timeout);

          let messageData = JSON.parse(msg.content.toString());
          if (messageData.encryptedData) {
            messageData = decrypt(messageData.encryptedData);
          }

          const routingKey = msg.fields.routingKey;

          console.log(`[4] Received message: ${JSON.stringify(messageData.data)}`);

          try {
            assert.strictEqual(routingKey, config.ROUTING_KEY, "Routing key should match");
            assert.deepStrictEqual(messageData.data, testData, "Message data should match");
            channel.ack(msg);
            resolve();
          } catch (err) {
            channel.nack(msg);
            reject(err);
          }
        }
      }, { noAck: false });
    });

    console.log("[3] Consumer ready, sending test message...");

    // 4. Verstuur test bericht
    await sendMessage(config.ROUTING_KEY, testData);

    // 5. Wacht tot bericht ontvangen en gevalideerd is
    await messageReceived;

    console.log("\n✅ TEST PASSED\n");

    await channel.close();
    await connection.close();
    process.exit(0);

  } catch (error) {
    console.error("\n❌ TEST FAILED:", error.message, "\n");
    if (channel) await channel.close().catch(() => { });
    if (connection) await connection.close().catch(() => { });
    process.exit(1);
  }
}

runTest();
