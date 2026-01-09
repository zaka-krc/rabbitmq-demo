const amqp = require('amqplib/callback_api');
const jsforce = require('jsforce');

// Salesforce verbinding configuratie
const conn = new jsforce.Connection({
  loginUrl: 'https://login.salesforce.com' 
});

const username = process.env.SF_USERNAME || 'guest';
const password = process.env.SF_PASSWORD || 'guest';

amqp.connect('amqp://localhost', (error0, connection) => {
    if (error0) throw error0;
    connection.createChannel((error1, channel) => {
        if (error1) throw error1;

        const queue = 'salesforce_orders';
        channel.assertQueue(queue, { durable: true });
        channel.prefetch(1);

        console.log(" [*] Wachten op orders voor Salesforce...");

        channel.consume(queue, async (msg) => {
            const orderData = JSON.parse(msg.content.toString());
            
            // Inloggen en order aanmaken in Salesforce
            conn.login(username, password, function(err, res) {
                if (err) return console.error(err);

                // Hier maken we een 'Order' of 'Account' aan in Salesforce
                conn.sobject("Account").create({ Name: orderData.customerName }, function(err, ret) {
                    if (err || !ret.success) return console.error(err, ret);
                    
                    console.log(" [v] Succes! Order opgeslagen in Salesforce met ID: " + ret.id);
                    channel.ack(msg); // Bevestig aan RabbitMQ dat het gelukt is
                });
            });
        }, { noAck: false });
    });
});