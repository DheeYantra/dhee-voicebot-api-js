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

dheeVoiceClient.startCall('HINDI');

```

**Supported languages are : ENGLISH, HINDI, BANGLA, TAMIL, TELUGU, KANNADA, MARATHI, GUJARATI, MALAYALAM**

Event handlers can be set as below :
```javascript
            dheeVoiceClient.setEventHandler('connected', function () {
                statusDiv.innerHTML = "Connected";

            });

```
**Events supported are connected, disconnected and error**.

In case you the call is happening on speaker phones (Public Address System cases), you might want to stop listening when the user doen't intent to speak, for better experience (by avoiding echo). Two functions helpful here are: 

```javascript
            dheeVoiceClient.stopListening();
            dheeVoiceClient.startListening();

```

Issue reports, fix/extention PRs are welcome!
