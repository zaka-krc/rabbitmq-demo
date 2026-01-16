require('dotenv').config(); // Laad .env variabelen (voor Salesforce)
const amqp = require('amqplib');
const jsforce = require('jsforce');
const config = require('./config');
const { decrypt } = require('./crypto-utils');

// We gebruiken een unieke queue naam voor de bridge, 
// zodat we berichten ontvangen ZONDER ze weg te kapen voor de SAP converter.
const SF_QUEUE_NAME = 'salesforce_bridge_queue';

async function startBridge() {
    console.log("--- Salesforce Bridge Starting ---");

    // 1. Salesforce Verbinding
    const sfConn = new jsforce.Connection({
        oauth2: {
            loginUrl: process.env.SF_LOGIN_URL,
            clientId: process.env.SF_CLIENT_ID,
            clientSecret: process.env.SF_CLIENT_SECRET
        }
    });

    try {
        console.log("🔌 Connecting to Salesforce...");
        await sfConn.login(
            process.env.SF_USERNAME, 
            process.env.SF_PASSWORD + process.env.SF_TOKEN
        );
        console.log("✅ Connected to Salesforce!");

        // 2. RabbitMQ Verbinding
        console.log("🔌 Connecting to RabbitMQ...");
        const connection = await amqp.connect(config.RABBITMQ_URL);
        const channel = await connection.createChannel();

        // Zorg dat de exchange bestaat (dezelfde als server.js gebruikt)
        await channel.assertExchange(config.EXCHANGE_NAME, 'topic', { durable: true });

        // Maak onze eigen specifieke queue aan
        await channel.assertQueue(SF_QUEUE_NAME, { durable: true });

        // Bind queue aan de exchange. We luisteren naar 'order.*' (alles wat met orders te maken heeft)
        await channel.bindQueue(SF_QUEUE_NAME, config.EXCHANGE_NAME, 'order.*');

        console.log(`✅ Bridge active. Listening on '${SF_QUEUE_NAME}' bound to '${config.EXCHANGE_NAME}'`);

        // 3. Consume Messages
        channel.consume(SF_QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                try {
                    // A. Data Decryptie & Parsing
                    let content = JSON.parse(msg.content.toString());

                    // Check of het bericht versleuteld is (zoals server.js dat doet)
                    if (content.encryptedData) {
                        content = decrypt(content.encryptedData);
                    }
                    
                    // Nu hebben we toegang tot content.data (orderId, customerName)
                    const orderData = content.data;
                    console.log(`\n📩 Order received: ${orderData.orderId} - ${orderData.customerName}`);

                    // B. Mapping: Order -> Salesforce Lead
                    // Omdat we alleen een klantnaam hebben, splitsen we die grofweg of gebruiken we defaults.
                    const nameParts = orderData.customerName.split(' ');
                    const lastName = nameParts.pop() || 'Unknown';
                    const firstName = nameParts.join(' ') || 'Valued Customer';

                    const sfPayload = {
                        FirstName: firstName,
                        LastName:  lastName,
                        Company:   `Order Ref: ${orderData.orderId}`, // We gebruiken OrderID als bedrijfsnaam voor demo
                        Email:     'demo@example.com', // Placeholder, want die hebben we niet in de order data
                        Status:    'Open - Not Contacted',
                        Description: `Generated via RabbitMQ Bridge. Source Order: ${orderData.orderId}`
                    };

                    // C. Push naar Salesforce
                    const result = await sfConn.sobject("Lead").create(sfPayload);

                    if (result.success) {
                        console.log(`🚀 Salesforce Lead Created! ID: ${result.id}`);
                        channel.ack(msg); // Bevestig succes
                    } else {
                        console.error("❌ Salesforce Error:", result.errors);
                        // We ack-en toch om de queue niet te blokkeren, of je kunt nack gebruiken voor retry
                        channel.ack(msg); 
                    }

                } catch (error) {
                    console.error("❌ Processing Error:", error.message);
                    // Bij fatale fouten (bijv. decryptie fail), ack het bericht om loop te voorkomen
                    channel.ack(msg); 
                }
            }
        });

    } catch (err) {
        console.error("❌ Critical Startup Error:", err);
        process.exit(1);
    }
}

startBridge();