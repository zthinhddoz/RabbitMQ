const amqplib = require('amqplib');
import ExtractionServices from '../extraction/ExtractionServices';

// Create a queue name - routing id
const exchangeName = "shinepf.topic";
const routingKey = "shinepf.core"
const opt = { credentials: amqplib.credentials.plain('admin', 'admin') };
let connection;

function convertTime (time) {
    const minute = (time / 1000) / 60;
    const second = (time / 1000) % 60;
    return `${minute.toString().split('.')[0]} min - ${second.toFixed(3)} sec`;
}

// create a msg
async function sendMessageProc (docData) {
    // Need a connection to rabbitMQ
    connection = await amqplib.connect(`amqp://10.0.26.200:5672/main`, opt);
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
    channel.publish(exchangeName, routingKey, Buffer.from(JSON.stringify(dataRes)));
};


module.exports = { sendMessageProc }