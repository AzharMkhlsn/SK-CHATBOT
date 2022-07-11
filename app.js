const { Client, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
//const socketIO = require('socket.io');
var qrcode = require('qrcode-terminal');
//var qrcodn = require('qrcode');
const http = require('http');
//const fs = require('fs');
const { phoneNumberFormatter } = require('./helpers/formatter');
const axios = require('axios');
const mime = require('mime-types');

const app = express();
const server = http.createServer(app);
//const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));


const client = new Client({
  restartOnAuthFail: true,
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // <- this one doesn't works in Windows
      '--disable-gpu',
    ]
  }
});

client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    qrcode.generate(qr);
    console.log('');
    console.log('QR RECEIVED', qr);
});


client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', msg => {
  if (msg.body == '!ping') {
    msg.reply('pong');
  } 
  else if (msg.body == 'Tes') {
    msg.reply('Tos \nTerimakasih!');
  }
});

client.initialize();

server.listen(80, function() {
    console.log('App running on *: ' + 80);
  });
  const checkRegisteredNumber = async function(number) {
    const isRegistered = await client.isRegisteredUser(number);
    return isRegistered;
  }
  
  // Send message
  app.post('/send-message', [
    body('number').notEmpty(),
    body('message').notEmpty(),
  ], async (req, res) => {
    const errors = validationResult(req).formatWith(({
      msg
    }) => {
      return msg;
    });
  
    if (!errors.isEmpty()) {
      return res.status(422).json({
        status: false,
        message: errors.mapped()
      });
    }
  
    const number = phoneNumberFormatter(req.body.number);
    const message = req.body.message;
  
    const isRegisteredNumber = await checkRegisteredNumber(number);
  
    if (!isRegisteredNumber) {
      return res.status(422).json({
        status: false,
        message: 'The number is not registered'
      });
    }
  
    client.sendMessage(number, message).then(response => {
      res.status(200).json({
        status: true,
        response: response
      });
    }).catch(err => {
      res.status(500).json({
        status: false,
        response: err
      });
    });
  });
  
  // Send media
  app.post('/send-media',  [
    body('number').notEmpty(),
    body('caption').notEmpty(),
    body('file').notEmpty()
    ], async (req, res) => {
      const errors = validationResult(req).formatWith(({
        msg
      }) => {
        return msg;
      });
    
      if (!errors.isEmpty()) {
        return res.status(422).json({
          status: false,
          message: errors.mapped()
        });
      }
  
    const number = phoneNumberFormatter(req.body.number);
    const caption = req.body.caption;
    const fileUrl = req.body.file;
  
    // const media = MessageMedia.fromFilePath('./image-example.png');
    // const file = req.files.file;
    // const media = new MessageMedia(file.mimetype, file.data.toString('base64'), file.name);
    let mimetype;
    const attachment = await axios.get(fileUrl, {
      responseType: 'arraybuffer'
    }).then(response => {
      mimetype = response.headers['content-type'];
      return response.data.toString('base64');
    });
  
    const media = new MessageMedia(mimetype, attachment, caption);
  
    client.sendMessage(number, media, {
      caption: caption
    }).then(response => {
      res.status(200).json({
        status: true,
        response: response
      });
    }).catch(err => {
      res.status(500).json({
        status: false,
        response: err
      });
    });
  });