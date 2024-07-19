const express = require('express');
const { VoiceResponse } = require('twilio').twiml;
const WebSocket = require('ws');
const http = require('http');
const axios = require('axios');

const app = express();
app.use(express.urlencoded({ extended: true }));

// Express route to handle Twilio webhook
app.post('/voice', (req, res) => {
    const response = new VoiceResponse();
    const connect = response.connect();
    connect.stream({
        url: `wss://ekettleson.ngrok.app/audio`,
    });
    response.dial().conference('MediaStreamConference');

    // Save the participant's call SID
    console.log("req.body.CallSid: ", req.body.CallSid)
    participantCallSid = req.body.CallSid;

    res.type('text/xml');
    res.send(response.toString());
});

// Create HTTP server and WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('WebSocket connection established');

    ws.on('message', (message) => {
        const msg = JSON.parse(message);
        if (msg.event === 'dtmf') {
            // if DTMF detected this logs { track: 'inbound', digit: '1' }
            console.log('DTMF detected:', msg.dtmf);

            // you could end the media stream here if you get dtmf 

            // Calling an arbitrary webhook with the DTMF digit
            axios.post('https://mediastreamdtmf1.free.beeceptor.com', { dtmf: msg.dtmf })
                .then(response => console.log('Webhook response:', response.data))
                .catch(error => console.error('Error calling webhook:', error));
        } else {
            // console.log('Received event:', msg.event);
        }
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});