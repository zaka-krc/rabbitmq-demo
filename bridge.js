import 'dotenv/config';
import amqp from 'amqplib';
import jsforce from 'jsforce';

async function startBridge() {
    // 1. Configureer de verbinding
    const conn = new jsforce.Connection({
        oauth2: {
            loginUrl: process.env.SF_LOGIN_URL,
            clientId: process.env.SF_CLIENT_ID,
            clientSecret: process.env.SF_CLIENT_SECRET
        }
    });

    try {
        // 2. Eenmalig inloggen bij Salesforce
        console.log("Poging tot inloggen bij Salesforce...");
        await conn.login(
            process.env.SF_USERNAME, 
            process.env.SF_PASSWORD + process.env.SF_TOKEN
        );
        console.log("✅ Verbonden met Salesforce via OAuth2!");

        // 3. Eenmalig verbinden met RabbitMQ
        const rabbitConn = await amqp.connect(process.env.RABBITMQ_URL);
        const channel = await rabbitConn.createChannel();
        const queue = 'salesforce_queue'; 

        await channel.assertQueue(queue, { durable: true });
        console.log(`✅ Wachten op berichten in queue: ${queue}`);

        // 4. Luisteren naar berichten en verwerken
        channel.consume(queue, async (msg) => {
            if (msg !== null) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    console.log("📩 Bericht ontvangen uit RabbitMQ:", content);

                    // 5. DATA NAAR SALESFORCE STUREN (Dit is wat er ontbrak)
                    const result = await conn.sobject("Lead").create({
                        FirstName: content.firstName,
                        LastName:  content.lastName,
                        Company:   content.company,
                        Email:     content.email,
                        Status:    'Open - Not Contacted'
                    });

                    if (result.success) {
                        console.log("🚀 Succesvol Lead aangemaakt! ID:", result.id);
                        channel.ack(msg); // Bevestig aan RabbitMQ dat het gelukt is
                    } else {
                        console.error("❌ Salesforce weigering:", result.errors);
                    }

                } catch (error) {
                    console.error("❌ Fout bij verwerken bericht:", error.message);
                    // Bij een fout laten we het bericht in de wachtrij staan (geen ack)
                }
            }
        });

    } catch (err) {
        console.error("❌ Kritieke verbindingsfout:", err.message);
        process.exit(1);
    }
}

startBridge();