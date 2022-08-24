const config = require('./config');
const amqplib = require('amqplib');
import logger from '../shared/logger';
import DocDataServices from '../docData/DocDataServices.js';
import ProducerService from './ProducerService';

export default class ConsumerService {
  constructor() {
    this.opt = { credentials: require('amqplib').credentials.plain(config.amqp_user_name, config.amqp_password) }; // Authorization
    this.connection = null;
    this.queueMethods = {
      protocol: 'shine_method_protocol',
      mail: 'shine_method_mail',
      drive: 'shine_method_drive',
    };
    this.routingKeys = {
      protocol: 'shine.method.protocol',
      mail: 'shine.method.mail',
      drive: 'shine.method.drive',
    };
  }

  getConnection() {
    return this.connection;
  }

  createConnection = async () => {
    if (!this.connection) {
      try {
        this.connection = await amqplib.connect(
          `amqp://${config.amqp_host}:${config.amqp_port}${config.amqp_virtual_host}`,
          this.opt,
        );
      } catch (err) {
        logger.error('[Consumer Service] Create queue list connection error: ', err);
      }
    }
  };

  setConnection = async (type, name = '') => {
    if (type === 'UPLOAD_VIEWDOC') {
      this.exchange = config.amqp_exchange || '';
      this.routing_key = config.amqp_routing_key_shine || '';
      this.queue_name = config.amqp_queue_name_shine || '';
    }
    if (type === 'METHOD_UPLOAD' && name) {
      this.exchange = 'shinepf.method.exchange';
      this.routing_key = this.routingKeys[name] || '';
      this.queue_name = this.queueMethods[name] || '';
    }
    this.type = type;
    this.name = name;
  };

  // Send message function
  receiveMessageProc = async () => {
    try {
      if (!this.connection) throw new Error('Established connection failed!!!');
      const channel = await this.connection.createChannel();
      if (!channel) throw new Error('Channel not found');
      channel.assertExchange(this.exchange, 'topic', { durable: true });

      const queueInfo = await channel.assertQueue(this.queue_name, { durable: true });
      if (queueInfo) {
        logger.info(`[X] Receiving messages from queue: ${queueInfo.queue}`);
        // Consume the messages in the queue
        await channel.bindQueue(this.queue_name, this.exchange, this.routing_key);
        await channel.consume(
          this.queue_name,
          async msg => {
            // Logging
            console.log(`[x] Message from key ${msg.fields.routingKey}`);
            console.log(`[x] type: ${this.type} - name: ${this.name}`);
            const producer = new ProducerService();
            producer.setConnection(this.type, this.name);
            try {
              const listDocData = JSON.parse(msg.content.toString());
              console.log('Number of documents: ', listDocData.length);
              if (listDocData.length > 0) {
                const result = await producer.procExtraction(listDocData);
                if (!producer.getConnection()) await producer.createConnection();
                producer.sendMessage(result);
              }
            } catch (err) {
              logger.error(`err: ${err}`);
            }
          },
          { noAck: true },
        );
      }
    } catch (err) {
      logger.error(err);
    }
  };

  initQueueList = async () => {
    try {
      await this.createConnection();
      await this.receiveMessageProc();
    } catch (err) {
      logger.error(err);
    }
  };
}
