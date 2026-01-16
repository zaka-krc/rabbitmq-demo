// send_bridge_test.js
const amqp = require('amqplib');
const config = require('./config');
const { encrypt } = require('./crypto-utils');

async function sendTest() {
    try {
        const connection = await amqp.connect(config.RABBITMQ_URL);
        const channel = await connection.createChannel();

        console.log("Sending encrypted test message...");

        const testOrder = {
            orderId: `SF-TEST-${Math.floor(Math.random() * 1000)}`,
            customerName: "Elon Musk"
        };

        const message = {
            type: 'order.create',
            timestamp: new Date().toISOString(),
            data: testOrder
        };

        // Encrypt de data zoals de bridge verwacht
        const payload = { encryptedData: encrypt(message) };

        await channel.assertExchange(config.EXCHANGE_NAME, 'topic', { durable: true });
        
        // Publish naar de exchange (niet direct naar de queue!)
        channel.publish(config.EXCHANGE_NAME, 'order.create', Buffer.from(JSON.stringify(payload)));

        console.log("✅ Sent:", testOrder);

        setTimeout(() => {
            connection.close();
            process.exit(0);
        }, 500);

    } catch (err) {
        console.error(err);
    }
}

sendTest();