# conference-media-stream

Given a caller(s) in MediaStreamConference (here its hardcoded), add a ghost leg to the conference that when dialed has an inbound webhook pointing to /voice in this application to start the media stream. 

Run node media-stream-detect-dtmf.js if you want to just start a media stream and detect dtmf. 
run node media-stream-google-speech-to-text.js if you want to start a media stream, send that audio to google speech to text api and get a trnascription back. 

Make a TwiML bin and use this TwiML. I'm hardcoding MediaStreamConference here but that could be dynamic.

<img width="630" alt="Screenshot 2024-07-19 at 3 40 01 PM" src="https://github.com/user-attachments/assets/f11c557c-d3d0-4d1c-a10b-48869095f992">

 Set the inbound webhook for some twilio number to this. That way you can call this number for testing puposes to have real people enter this conference. 

<img width="334" alt="Screenshot 2024-07-19 at 2 26 10 PM" src="https://github.com/user-attachments/assets/39cf2652-bc75-4a3a-a6c6-479436e1ccc1">

Run this server locally. I'm using ngrok. Provision a new Twilio number to be our ghost number. Take the url and have that be the inbound voice webhook for that number (our ghost number).

<img width="369" alt="Screenshot 2024-07-19 at 2 24 50 PM" src="https://github.com/user-attachments/assets/1eb4974e-b406-4744-87b4-bf96b03cbff2">

We'll add this participant to the conference via the Conference Participant API. I've been doing this in the terminal like:


curl -X POST "https://api.twilio.com/2010-04-01/Accounts/ACxxxxx/Conferences/MediaStreamConference/Participants.json" \
--data-urlencode "From={Any twilio number i have on my account}" \
--data-urlencode "To={My Ghost number}" \
--data-urlencode "EarlyMedia=true" \
-u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN"


Once you've called in and added our ghost participant via API, you'll see the media stream start and any dtmf entered will be console logged. Update the webhook to get that posted to your own endpoint. If youre testing a lot, update the TwiML bin with endConferenceOnExit="true" so the conference ends every time you test. 
