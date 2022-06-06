const dotenv = require('dotenv');

dotenv.config();
// Address and Account Use To Connect to RabbitMQ Server of BluePrint.
const {
  PORT,
  HOST,
  HOST_URL,
  AMQP_PORT,
  AMQP_HOST,
  AMQP_VIRTUAL_HOST,
  AMQP_USER_NAME,
  AMQP_PASSWORD,
  AMQP_QUEUE_NAME,
  AMQP_ROUTING_KEY,
  AMQP_EXCHANGE,
} = process.env;

module.exports = {
  port: PORT,
  host: HOST,
  url: HOST_URL,
  amqp_port: AMQP_PORT,
  amqp_host: AMQP_HOST,
  amqp_virtual_host: AMQP_VIRTUAL_HOST,
  amqp_user_name: AMQP_USER_NAME,
  amqp_password: AMQP_PASSWORD,
  amqp_queue_name: AMQP_QUEUE_NAME,
  amqp_routing_key: AMQP_ROUTING_KEY,
  amqp_exchange: AMQP_EXCHANGE,
};
