const amqp = require('amqplib/callback_api');

// We testen of we verbinding kunnen maken met RabbitMQ
// In GitHub Actions draait dit op 'localhost'
amqp.connect('amqp://localhost', (error0, connection) => {
    if (error0) {
        console.error("❌ Test gefaald: Kan geen verbinding maken met RabbitMQ");
        process.exit(1);
    }
    console.log("✅ Test geslaagd: Verbinding met RabbitMQ werkt!");
    setTimeout(() => {
        connection.close();
        process.exit(0);
    }, 500);
});