const dotenv = require('dotenv');

dotenv.config();
// Address and Account Use To Connect to RabbitMQ Server of SHINE Core.
const {
  AMQP_PORT_CORE,
  AMQP_HOST_CORE,
  AMQP_VIRTUAL_HOST_CORE,
  AMQP_USER_NAME_CORE,
  AMQP_PASSWORD_CORE,
  AMQP_EXCHANGE_CORE,
  AMQP_QUEUE_NAME_CORE,
  AMQP_ROUTING_KEY_CORE,
  AMQP_QUEUE_NAME_SHINE,
  AMQP_ROUTING_KEY_SHINE,
} = process.env;

module.exports = {
  amqp_port: AMQP_PORT_CORE,
  amqp_host: AMQP_HOST_CORE,
  amqp_virtual_host: AMQP_VIRTUAL_HOST_CORE,
  amqp_user_name: AMQP_USER_NAME_CORE,
  amqp_password: AMQP_PASSWORD_CORE,
  amqp_queue_name_core: AMQP_QUEUE_NAME_CORE,
  amqp_routing_key_core: AMQP_ROUTING_KEY_CORE,
  amqp_queue_name_shine: AMQP_QUEUE_NAME_SHINE,
  amqp_routing_key_shine: AMQP_ROUTING_KEY_SHINE,
  amqp_exchange: AMQP_EXCHANGE_CORE,
};
