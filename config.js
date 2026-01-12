// Gedeelde configuratie voor RabbitMQ demo
module.exports = {
  RABBITMQ_URL: 'amqps://localhost',
  RABBITMQ_OPTIONS: {
    // Voor lokale ontwikkeling met self-signed certificaten:
    rejectUnauthorized: false
  },
  EXCHANGE_NAME: 'demo_exchange',
  QUEUE_NAME: 'orders_queue',
  ROUTING_KEY: 'order.create',
  ENCRYPTION_SECRET: 'super_secret_key_123!'
};
