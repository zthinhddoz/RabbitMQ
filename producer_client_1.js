const amqplib = require('amqplib');

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
    const connection = await amqplib.connect(`amqp://localhost:5672/test`, opt);
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
    await sleep(10000);
    console.log('!!! EXTRACTION DONE !!!');
    console.log('Sending reuslt to SHINE PF');
    channel.publish(exchangeName, routingKey, Buffer.from(docData));
    /**
     * Exchange Type (default: 'direct')
     * Direct: using the routing id & queueName
     */
};


module.exports = { sendMessageProc }