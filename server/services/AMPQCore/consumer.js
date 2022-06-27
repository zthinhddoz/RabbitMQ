const amqplib = require('amqplib');
const config = require('./config');
const core_producer = require('./producer');
import chalk from 'chalk';
import logger from '../shared/logger';

// Rabbit Authentication
const opt = { credentials: require('amqplib').credentials.plain(config.amqp_user_name, config.amqp_password) };
let connection;

async function receiveMessageProc() {
    try {
        // Create connection
        connection = await amqplib.connect(`amqp://${config.amqp_host}:${config.amqp_port}${config.amqp_virtual_host}`, opt);
        console.log(chalk.hex('#009688')('🚀 RabbitMQ server: Connection Succeeded.'));
        // Need a channel (pipeline to rabbitMQ)
        const channel = await connection.createChannel();
        /**
         * 
         * durable basically means when rabbitMQ is restarted (service restarted). 
         * + False: not re-create the queue again
         * + True: It will re-check the queue, and re-create the queue.
         * Different from 'persistence'
         */
        channel.assertExchange(config.amqp_exchange, 'topic', {
            durable: true,
        });

        await channel.assertQueue(config.amqp_queue_name_shine, {
            durable: true,
        });
        /**
         * Exchange Type (default: 'direct')
         * Direct: using the routing id & queueName
         */
        // Consume the message in the queue
        channel.bindQueue(config.amqp_queue_name_shine, config.amqp_exchange, config.amqp_routing_key_shine);
        channel.consume(config.amqp_queue_name_shine, msg => {
            // Logging
            console.log(`[x] Message from key ${msg.fields.routingKey}`);
            core_producer.sendMessageProc(msg.content.toString());
        }, {noAck:true});
    } catch (err) {
        console.error(err);
    }
};

receiveMessageProc();

module.exports = { receiveMessageProc };