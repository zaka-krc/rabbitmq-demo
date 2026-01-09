// Shared configuration for RabbitMQ demo
module.exports = {
  RABBITMQ_URL: 'amqp://localhost',
  EXCHANGE_NAME: 'demo_exchange',
  QUEUE_NAME: 'orders_queue',
  ROUTING_KEY: 'order.create'
};