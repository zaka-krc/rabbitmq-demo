import 'dotenv/config';
import amqp from 'amqplib';
import jsforce from 'jsforce';

async function startBridge() {
    // 1. Configureer de verbinding met OAuth2 gegevens uit je .env
    const conn = new jsforce.Connection({
        oauth2: {
            loginUrl: process.env.SF_LOGIN_URL,
            clientId: process.env.SF_CLIENT_ID,
            clientSecret: process.env.SF_CLIENT_SECRET
        }
    });

    try {
        // 2. Inloggen (De nieuwe manier die de SOAP-fout omzeilt)
        await conn.login(
            process.env.SF_USERNAME, 
            process.env.SF_PASSWORD + process.env.SF_TOKEN
        );
        
        console.log("✅ Verbonden met Salesforce via OAuth2!");

        // 3. Verbinden met RabbitMQ
        const rabbitConn = await amqp.connect(process.env.RABBITMQ_URL);
        const channel = await rabbitConn.createChannel();
        const queue = 'salesforce_queue'; // Zorg dat deze naam klopt met je app

        await channel.assertQueue(queue, { durable: true });
        console.log(`✅ Wachten op berichten in queue: ${queue}`);

        // 4. Luisteren naar berichten
        channel.consume(queue, async (msg) => {
            if (msg !== null) {
                const content = JSON.parse(msg.content.toString());
                console.log("📩 Bericht ontvangen uit RabbitMQ:", content);

                try {
        // We loggen in met de expliciete OAuth2 Password Grant
        // Dit omzeilt de SOAP API volledig
        await conn.login(
            process.env.SF_USERNAME, 
            process.env.SF_PASSWORD + process.env.SF_TOKEN,
            (err, userInfo) => {
                if (err) throw err;
                console.log("✅ Verbonden met Salesforce!");
                console.log("Gebruiker ID: " + userInfo.id);
                console.log("Org ID: " + userInfo.organizationId);
            }
        );

        // Verbinden met RabbitMQ (onder de Salesforce login)
        const rabbitConn = await amqp.connect(process.env.RABBITMQ_URL);
        const channel = await rabbitConn.createChannel();
        const queue = 'salesforce_queue'; 

        await channel.assertQueue(queue, { durable: true });
        console.log(`✅ Wachten op berichten in queue: ${queue}`);

        // De rest van je channel.consume logica...

    } catch (err) {
        console.error("❌ Fout details:", err.message);
    }
            }
        });

    } catch (err) {
        console.error("❌ Verbindingsfout:", err.message);
        process.exit(1);
    }
}

startBridge();