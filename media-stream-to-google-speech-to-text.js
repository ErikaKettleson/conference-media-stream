const express = require('express');
const { VoiceResponse } = require('twilio').twiml;
const speech = require('@google-cloud/speech');
const WebSocket = require('ws');
const http = require('http');
const axios = require('axios');

const app = express();
app.use(express.urlencoded({ extended: true }));

// Set up Google Cloud credentials
const path = require('path');
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, 'mediastreams-429900-b262ac1bb0f5.json');;

// Initialize Speech-to-Text client
const client = new speech.SpeechClient();

// Configure audio stream parameters
const config = {
    encoding: 'MULAW',
    sampleRateHertz: 8000,
    languageCode: 'en-US',
    model: 'phone_call',
    useEnhanced: true,
    metadata: {
        interactionType: 'phone_call',
        microphoneDistance: 'phone',
    },
};

const request = {
    config,
    interimResults: true
};

// Express route to handle Twilio webhook
app.post('/voice', (req, res) => {
    const response = new VoiceResponse();
    const connect = response.connect();
    connect.stream({
        url: `wss://ekettleson.ngrok.app/audio`,
    });
    response.dial().conference('MediaStreamConference');
    res.type('text/xml');
    res.send(response.toString());
});

// Create HTTP server and WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('WebSocket connection established');

    let recognizeStream = null;
    let isStreamActive = false;

    const initializeStream = () => {
        if (recognizeStream) {
            recognizeStream.destroy();
        }
        isStreamActive = true;
        recognizeStream = client
            .streamingRecognize(request)
            .on('error', (error) => {
                console.error('recognizeStream error:', error);
                isStreamActive = false;
            })
            .on('data', (data) => {
                console.log("in the .on(data) section");
                const result = data.results[0];
                if (result && result.alternatives[0]) {
                    const transcript = result.alternatives[0].transcript;
                    console.log('Transcript:', transcript);

                    // Check for DTMF tones
                    // this does not actually work bc google speech to text api does not support dtmf tones
                    const dtmfMatch = transcript.match(/[0-9]/g);

                    if (dtmfMatch) {
                        dtmfMatch.forEach(dtmf => {
                            console.log(`DTMF detected: ${dtmf}`);

                            // Call your webhook here
                            axios.post('https://erikaswebhook.com', { dtmf })
                                .then(response => console.log('Webhook response:', response.data))
                                .catch(error => console.error('Error calling webhook:', error));
                        });
                    }
                }
            });
    };

    initializeStream();

    ws.on('message', (message) => {
        const msg = JSON.parse(message);
        if (msg.event === 'media') {
            // console.log('Received audio chunk, msg: ', msg);

            const chunk = Buffer.from(msg.media.payload, 'base64');
            if (recognizeStream && isStreamActive) {
                try {
                    recognizeStream.write(chunk);
                } catch (error) {
                    console.error('Error writing to recognizeStream:', error);
                    isStreamActive = false;
                    initializeStream();
                }
            } else if (!isStreamActive) {
                initializeStream();
            }
        } else if (msg.event === 'dtmf') {
            // msg console logged below
            // {
            // event: 'dtmf',
            // streamSid: 'MZxxxxxxx',
            // sequenceNumber: '131',
            // dtmf: { track: 'inbound', digit: '2' }
            // }
            console.log('DTMF detected:', msg.dtmf);
            console.log(msg)

            // Call your webhook here
            // i am just arbirationly calling a webhook here
            axios.post('https://erikaswebhook.com', { dtmf: msg.dtmf })
                .then(response => console.log('Webhook response:', response.data))
                .catch(error => console.error('Error calling webhook:', error));
        } else {
            console.log('Unhandled event type:', msg.event);
        }
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
        if (recognizeStream) {
            recognizeStream.destroy();
        }
        isStreamActive = false;
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});