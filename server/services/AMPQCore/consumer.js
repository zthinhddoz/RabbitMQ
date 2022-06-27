const amqplib = require('amqplib');
const core_producer = require('./producer');
import chalk from 'chalk';

// Create a queue name - routing id
const queueNameShine = "data_from_shine";
const exchangeName = "shinepf.topic";
const routingKey = 'shinepf.local';
const opt = { credentials: amqplib.credentials.plain('admin', 'admin') };

let connection;
async function receiveMessageProc() {
    try {
        // Need a connection to rabbitMQ
        connection = await amqplib.connect(`amqp://10.0.26.200:5672/main`, opt);
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
        channel.assertExchange(exchangeName, 'topic', {
            durable: true,
        });

        await channel.assertQueue(queueNameShine, {
            durable: true,
        });
        /**
         * Exchange Type (default: 'direct')
         * Direct: using the routing id & queueName
         */
        // Consume the message in the queue
        channel.bindQueue(queueNameShine, exchangeName, routingKey);
        channel.consume(queueNameShine, msg => {
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