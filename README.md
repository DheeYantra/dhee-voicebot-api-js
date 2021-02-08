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
**Events supported are connected, disconnected, utteranceCompleted and error**.

In case the call is happening on loud speakers (Public Address System cases), you might want to stop listening when the user doesn't intent to speak. This is for better call experience by avoiding echo from spoken speech. The below two functions are helpful here: 

```javascript
            dheeVoiceClient.stopListening();
            dheeVoiceClient.startListening();

```

After the call, the bot disconnects the call. Of course at any point of conversation, the user can disconnect the call. To facilitate this, use this function -
```javascript
            dheeVoiceClient.disconnect()
```


Issue reports, fix/extention PRs are welcome!
