const config = require('./config');
const amqplib = require('amqplib');
import logger from '../shared/logger';
import ExtractionServices from '../extraction/ExtractionServices';

export default class ProducerService {
  constructor() {
    this.opt = { credentials: require('amqplib').credentials.plain(config.amqp_user_name, config.amqp_password) }; // Authorization
    this.connection = null;
    this.queueMethods = {
      protocol: 'core_method_protocol',
      mail: 'core_method_mail',
      drive: 'core_method_drive',
    };
    this.routingKeys = {
      protocol: 'core.method.protocol',
      mail: 'core.method.mail',
      drive: 'core.method.drive',
    };
  }

  getConnection() {
    return this.connection;
  }

  createConnection = async () => {
    try {
      if (!this.connection) {
        this.connection = await amqplib.connect(
          `amqp://${config.amqp_host}:${config.amqp_port}${config.amqp_virtual_host}`,
          this.opt,
        );
      }
    } catch (err) {
      logger.error('[ProducerService] Create queue list connection error: ', err);
    }
  };

  setData(msg) {
    this.msg = msg;
  }

  setConnection = async (type, name = '') => {
    if (type === 'UPLOAD_VIEWDOC') {
      this.exchange = config.amqp_exchange || '';
      this.routing_key = config.amqp_routing_key_shine || '';
    }
    if (type === 'METHOD_UPLOAD' && name) {
      this.exchange = 'shinepf.method.exchange';
      this.routing_key = this.routingKeys[name] || '';
    }
    this.type = type;
  };

  convertTime(time) {
    const minute = time / 1000 / 60;
    const second = (time / 1000) % 60;
    return `${minute.toString().split('.')[0]} min - ${second.toFixed(3)} sec`;
  }

  // Send message function
  sendMessage = async extrResult => {
    try {
      logger.info(`SEND MESSAGE INTO QUEUE - METHOD TYPE: ${this.type}`);
      logger.info(`Data Info - Number of files extracted: ${extrResult.length}`);
      if (!this.connection) throw Error('Established connection failed!!!');
      const channel = await this.connection.createChannel();
      if (!channel) throw Error('Channel not found!!!');
      await channel.assertExchange(this.exchange, 'topic', { durable: true });
      // Send message to exchange (publish to the exchange)
      await channel.publish(this.exchange, this.routing_key, Buffer.from(JSON.stringify(extrResult)));
      if (this.connection) {
        setTimeout(() => {
          this.connection.close();
        }, 3000);
      }
      this.connection.on('close', () => {
        console.error('connection to RabbitQM closed!');
      });
    } catch (err) {
      logger.error(err);
      throw err;
    }
  };

  procExtraction = async listDocData => {
    let dataRes = [];
    try {
      logger.info(`Number of extracting documents: ${listDocData.length}`);
      for (let i = 0; i < listDocData.length; i++) {
        const startExtTime = Date.now();
        const extractResult = await ExtractionServices.extractDocument(listDocData[i], false, true);
        const endExtTime = Date.now() - startExtTime;
        logger.info(`End of extraction for document: ${extractResult.doc_id} - time: ${this.convertTime(endExtTime)}`);
        dataRes.push(extractResult);
      }
      return dataRes;
    } catch (err) {
      logger.err('Error when processing Extraction');
      throw err;
    }
  };
}
