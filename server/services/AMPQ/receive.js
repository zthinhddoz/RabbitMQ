import BPServices from '../BPApi/BPServices';
const amqp = require('amqplib');
const config = require('./config');

/*
  Integrating sso all information related to authority will be received from blueprint system.
  -> For get that information, we connect to the rabbitmq server when data has changed a message will send
  -> When revieved message will call the api to get the data change and update it to the database.
*/
const opt = { credentials: require('amqplib').credentials.plain(config.amqp_user_name, config.amqp_password) };

let connection;
// Connect RabbitMQ server
async function connectRabbitMQ() {
  try {
    connection = await amqp.connect(`amqp://${config.amqp_host}:${config.amqp_port}/${config.amqp_virtual_host}`, opt);

    const channel = await connection.createChannel();

    channel.assertExchange(config.amqp_exchange, 'topic', {
      durable: true,
    });

    await channel.assertQueue(`${config.amqp_queue_name}`, {
      durable: true,
    });

    console.log(' [*] Waiting for logs from Rabbit MQ');
    await channel.bindQueue(`${config.amqp_queue_name}`, config.amqp_exchange, config.amqp_routing_key);
    await channel.consume(`${config.amqp_queue_name}`, async (msg) => {
      console.log(' [x] Message from key %s: %s', msg.fields.routingKey, msg.content.toString());
      // Recieved message change -> call api synchronize data
      await BPServices.getDataSync();
      channel.ack(msg);
    });

    connection.on('error', (err) => {
      console.log(err);
      setTimeout(connectRabbitMQ, 5000);
    });

    connection.on('close', () => {
      console.error('connection to RabbitQM closed!');
      setTimeout(connectRabbitMQ, 5000);
    });
  } catch (err) {
    console.error(err);
    setTimeout(connectRabbitMQ, 5000);
  }
}

connectRabbitMQ();

module.exports = {};
