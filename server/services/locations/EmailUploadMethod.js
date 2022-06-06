/* eslint-disable no-unused-expressions */
/* eslint-disable no-plusplus */
/* eslint-disable prettier/prettier */
/* eslint-disable no-nested-ternary */
import fs from 'fs';
import { Base64Decode } from 'base64-stream';
import Imap from 'imap';
import AppConstants from '../utils/constants';
import logger from '../shared/logger';

export default async function getEmailAttachment(data) {
  const fileFolder = 'file';
  const { emailAddress, emailPassword, mailBox, dataAllMethod } = data;
  const imap = new Imap({
    user: emailAddress,
    password: emailPassword,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: {
      rejectUnauthorized: false,
    },
    authTimeout: 3000,
  });

  let isHavingEmail = false;
  let isHavingError = false;

  const toUpper = thing => {
    return thing && thing.toUpperCase ? thing.toUpperCase() : thing;
  }

  const findAttachmentParts = (struct, attachments) => {
    attachments = attachments || [];
    for (let i = 0, len = struct.length; i < len; i++) {
      if (Array.isArray(struct[i])) {
        findAttachmentParts(struct[i], attachments);
      } else if (
        struct[i].disposition 
        && ['INLINE', 'ATTACHMENT'].indexOf(toUpper(struct[i].disposition.type)) > -1) {
          attachments.push(struct[i]);
      }  
    }
    return attachments;
  }

  function getFileAttachment(attachment, urlFolder, decodedFileName){
    const fileName = decodedFileName;
    const { encoding } = attachment;

    return (msgAttachment, seqno) => {
      const prefix = `#${seqno}`;
      console.log('ON ATTACHMENT');
      msgAttachment.on('body', (stream, info) => {
        console.log(`${prefix} Streaming this attachment to file`, fileName, info);
        // Create a write stream so that we can stream the attachment to file;
        const folderPath = `${fileFolder}/${urlFolder}/Input`;
        if (!fs.existsSync(folderPath)){
          fs.mkdirSync(folderPath, {recursive: true});
        }
        const filePath = `${folderPath}/${fileName}`
        const writeStream = fs.createWriteStream(filePath);
        writeStream.on('finish', () => {
          console.log(`${prefix} Done writing to file %s`, fileName);
        });
        if (toUpper(encoding) === 'BASE64') {
          stream.pipe(new Base64Decode()).pipe(writeStream);
        } else {
          stream.pipe(writeStream);
        }
      });
      msgAttachment.once('error', error => {
        console.log('error message', error);
        isHavingError = true;
        imap.end();
        throw error;
      });
      msgAttachment.once('end', () => {
        console.log(`${prefix} Done writing to file %s`, fileName);
      });
    };
  }

  const processedMail = [];
  const fileNames = [];
  imap.once('ready', () => {
    // Can change where to read mail such as SI_DEV_TEST_BOX, INBOX,...
    imap.openBox(mailBox, false, (err, box) => {
      if (err) throw err;
      imap.search(['UNSEEN'], (err, results) => {
        if (!results || results.length == 0) {
          console.log("No unseen email avaiable!");
          imap.end();
          return;
        }
        results.forEach((mailContent, index) => {
          const fetcher = imap.fetch([mailContent], {
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
            struct: true,
          })

          let urlFolder = '';
          let fileName = '';

          fetcher.on('message', (msg, seqno) => {
            console.log('Message #%d', seqno);
            const prefix = `#${seqno}`;
            msg.on('body', (stream, info) => {
              let buffer = '';
              stream.on('data', chunk => {
                buffer += chunk.toString('utf8');
              });
              stream.on('end', () => {
                const headerData = Imap.parseHeader(buffer);
                console.log('headerData', headerData);
                dataAllMethod.forEach(method => {
                  if (
                    // headerData.subject[0] === method.eml_tit_val &&
                    headerData.from[0].includes(method.eml_addr)
                  ){
                    // processedMail attributes.
                    processedMail.push(mailContent);
                    urlFolder = method.locationId.fol_loc_url;
                    console.log('URL Folder', urlFolder);
                  }
                });
              });
            });
            msg.once('attributes', (attrs) => {
              if (processedMail.includes(mailContent) && urlFolder !== '') {
                const attachments = findAttachmentParts(attrs.struct);
                console.log(`${prefix} Has attachments: %d`, attachments.length);
                
                for (let i = 0, len = attachments.length; i < len; i++) {
                  const attachment = attachments[i];
                  fileName = decodeURI(
                    attachment.params.name.includes('=?UTF-8?Q?')
                      ? attachment.params.name
                        .replace('=?UTF-8?Q?', '')
                        .replace('?=', '')
                        .replace(/\=/g, '%')
                      : attachment.params.name.includes('=?UTF-8?B?')
                        ? attachment.params.name
                          .replace('=?UTF-8?B?', '')
                          .replace('?=', '')
                          .replace(/\=/g, '%')
                        : attachment.params.name,
                  );
                  if (AppConstants.INCLUDE_FILE_TYPES.includes(`.${(fileName.split('.').pop()).toLowerCase()}`)) {
                    const fetchAttachment = imap.fetch(attrs.uid, {
                      bodies: [attachment.partID],
                      struct: true,
                    });
                    logger.info(`${prefix} Fetching attachment %s ${fileName}`);
                    fetchAttachment.on(
                      'message',
                      getFileAttachment(attachment, urlFolder, fileName),
                    );
                    // processedMail attributes more content.
                    fileNames.push(fileName);
                  }
                  console.log('RESULT EMAIL', processedMail);
                }
              }
            });
            msg.once('end', () => {
              console.log(`${prefix} Finished email !!!`);
            });
            msg.once('error', (error) => {
              console.log('error message', error);
              isHavingError = true;
              imap.end();
              throw error;
            });
          });
          fetcher.once('error', (error) => {
            console.log(`Fetch error: ${error}`);
            isHavingError = true;
            imap.end();
            throw error;
          });
          fetcher.once('end', () => {
            if (index === results.length - 1) {
              console.log('processed mail', processedMail);
              if (processedMail.length > 0) {
                isHavingEmail = true;
                imap.setFlags(processedMail, ['\\Seen'], (errFetch) => {
                  if (!errFetch) {
                    console.log('marked as read');
                  } else {
                    console.log(JSON.stringify(errFetch, null, 2));
                    throw errFetch;
                  }
                });
              }
              imap.end();
            }
            console.log('FETCH ended');
          });
        });
      });
    });
  });

  imap.once('error', error => {
    console.log(error);
    isHavingError = true;
    imap.end();
    throw error;
  });
  
  return new Promise((resolve, reject) => {
    imap.connect();
    imap.once('end', () => {
      imap.destroy();
      if (!isHavingError && isHavingEmail) {
        resolve(fileNames);
      } else {
        resolve([]);
      }
      console.log('Connection ended');
    });
  });
}