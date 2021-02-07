# dhee-voicebot-api-js

The javascript API for initiating voice calls with agents deployed in Dhee.AI cloud.

Download the JS file dhee-voice-api.js from the **downloads** folder and include it in your server's scripts.

Add the script then to the HTML page where you would want your users to have voice conversations.


Initialize the voice client as below:

```javascript

var dheeVoiceClient = new DheeVoiceApi("your-api-key", "your-api-secret");

```

A call is started using the function startCall, as in the example below : 

```javascript

dheeApi.startCall('HINDI');

```

Supported languages are : ENGLISH, HINDI, BANGLA, TAMIL, TELUGU, KANNADA, MARATHI, GUJARATI, MALAYALAM
