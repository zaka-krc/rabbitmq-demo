import 'dotenv/config';
import amqp from 'amqplib';

async function sendTestMessage() {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL);
        const channel = await connection.createChannel();
        const queue = 'salesforce_queue';

        // Dit is de data die we naar Salesforce willen sturen
        const message = {
            firstName: "Rabbit",
            lastName: "Tester",
            company: "RabbitMQ Demo BV",
            email: "test@example.com"
        };

        await channel.assertQueue(queue, { durable: true });
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));

        console.log("🚀 Bericht verzonden naar de wachtrij:", message);

        setTimeout(() => {
            connection.close();
            process.exit(0);
        }, 500);
    } catch (err) {
        console.error("❌ Fout bij verzenden:", err);
    }
}

sendTestMessage();