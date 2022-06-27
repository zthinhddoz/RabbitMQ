const amqplib = require('amqplib');
const config = require('./config');
import ExtractionServices from '../extraction/ExtractionServices';
import chalk from 'chalk';
import logger from '../shared/logger';

// Rabbit Authentication
const opt = { credentials: require('amqplib').credentials.plain(config.amqp_user_name, config.amqp_password) };
let connection;

function convertTime (time) {
    const minute = (time / 1000) / 60;
    const second = (time / 1000) % 60;
    return `${minute.toString().split('.')[0]} min - ${second.toFixed(3)} sec`;
}

// create a msg
async function sendMessageProc (docData) {
    try {
        // Need a connection to rabbitMQ
        connection = await amqplib.connect(`amqp://${config.amqp_host}:${config.amqp_port}${config.amqp_virtual_host}`, opt);
        // Need a channel (pipeline to rabbitMQ)
        const channel = await connection.createChannel();
        /**
         * 
         * durable basically means when rabbitMQ is restarted (service restarted). 
         * + False: not re-create the queue again
         * + True: It will re-check the queue, and re-create the queue. 
         * Different from 'persistence'
         */
        await channel.assertExchange(config.amqp_exchange, 'topic', {durable: true});
        // Send message to exchange (publish to the exchange)
        console.log('------ Extracting documents --------');
        console.log('!!! EXTRACTION DONE !!!');
        console.log('------ Sending reuslt to SHINE PF --------');
        let dataRes = {};
        try {
            const data = JSON.parse(docData);
            console.log('data: ', data);
            const startExtTime = Date.now();
            dataRes = await ExtractionServices.extractDocument(data, false, true);
            const endExtTime = Date.now() - startExtTime;
            console.log(`End of extraction for document: ${dataRes.doc_id} - time: ${convertTime(endExtTime)}`);
            console.log('dataRes: ', dataRes);
        } catch (err) {
            console.log('err: ', err);
        }
        channel.publish(config.amqp_exchange, config.amqp_routing_key_core, Buffer.from(JSON.stringify(dataRes)));
    } catch (err) {
        console.log(err);
    }
};


module.exports = { sendMessageProc }