require('dotenv').config();

const amqp = require('amqplib/callback_api');
 
// Configuratie

const queue = 'salesforce_orders';

const testOrder = {

    customerName: "EhB Test Groep 2", // Dit komt in Salesforce

    product: "Laptop Pro",

    price: 1200,

    orderDate: new Date().toISOString()

};
 
// 1. Verbinding maken met RabbitMQ

amqp.connect('amqps://iwndpuvk:qzEAZ2AlolLtGK058h8lzPRV259qGHNC@goose.rmq2.cloudamqp.com/iwndpuvk', (error0, connection) => {

    if (error0) {

        console.error("❌ Kan niet verbinden met RabbitMQ. Staat je VM/Docker aan?");

        process.exit(1);

    }
 
    connection.createChannel((error1, channel) => {

        if (error1) throw error1;
 
        // 2. Bericht versturen naar de queue

        channel.assertQueue(queue, { durable: true });

        channel.sendToQueue(queue, Buffer.from(JSON.stringify(testOrder)), { persistent: true });
 
        console.log("🚀 [STAP 1] Test-order verzonden naar RabbitMQ!");

        console.log("Details:", testOrder);
 
        // Sluit verbinding na verzenden

        setTimeout(() => {

            connection.close();

            console.log("\n💡 Start nu 'node receive.js' om te zien of het naar Salesforce gaat!");

            process.exit(0);

        }, 500);

    });

});
 