const amqplib = require('amqplib');
import ExtractionServices from '../extraction/ExtractionServices';

// Create a queue name - routing id
const exchangeName = "shinepf.topic";
const routingKey = "shinepf.core"
const opt = { credentials: amqplib.credentials.plain('admin', 'admin') };
const sleep = (time) => {
    return new Promise(resolve => setTimeout(resolve, time));
}
// create a msg
async function sendMessageProc (docData) {
    // Need a connection to rabbitMQ
    const connection = await amqplib.connect(`amqp://10.0.26.200:5672/main`, opt);
    // Need a channel (pipeline to rabbitMQ)
    const channel = await connection.createChannel();
    /**
     * 
     * durable basically means when rabbitMQ is restarted (service restarted). 
     * + False: not re-create the queue again
     * + True: It will re-check the queue, and re-create the queue. 
     * Different from 'persistence'
     */
    await channel.assertExchange(exchangeName, 'topic', {durable: true});
    // Send message to exchange (publish to the exchange)
    console.log('------ Extracting documents --------');
    console.log('!!! EXTRACTION DONE !!!');
    console.log('Sending reuslt to SHINE PF');
    console.log('DOC INFO: ', docData);
    let dataRes = {};
    try {
        const data = JSON.parse(docData);
        console.log('data: ', data);
        dataRes = await ExtractionServices.extractDocument(data, false, true);
        console.log('dataRes: ', dataRes);
    } catch (err) {
        console.log('err: ', err);
    }
    channel.publish(exchangeName, routingKey, Buffer.from(JSON.stringify(dataRes)));
    /**
     * Exchange Type (default: 'direct')
     * Direct: using the routing id & queueName
     */
};


module.exports = { sendMessageProc }