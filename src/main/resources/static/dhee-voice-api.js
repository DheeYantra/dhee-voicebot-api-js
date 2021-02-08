function DheeVoiceApi(apiKey, apiSecret) {

    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.listen = true;
    this.defaultCalleeName = "Guest";
    this.setupComplete = false;

    this.onError = function (error) {
        console.log("Error.")
    }
    this.onConnect = function () {
        console.log("Connected.");
    }
    this.onDisconnect = function () {
        console.log("Disconnected.");
    }
    this.onUtteranceCompleted = function() {
        console.log("UC");
    }

    this.setEventHandler = function (event, handler) {
        switch (event) {
            case "connected": this.onConnect = handler; break;
            case "disconnected": this.onDisconnect = handler; break;
            case "error": this.onError = handler; break;
            case "utteranceCompleted" : this.onUtteranceCompleted = handler;
        }
    }

    this.stopListening = function () {
        this.listen = false;
    }

    this.startListening = function () {
        this.listen = true;
    }


    this.startCall = function (language, calleeName) {

        var lang = language;
        var DheeVoiceBotApi = this;

        function initWebsocket() {

            if (DheeVoiceBotApi.setupComplete) {
                return;
            }

            var socket;
            var microphoneStreamSource;
            var audioPromise;
            var audioContext;

            audioPromise = navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true
                },
                video: false
            });

            function newWebsocket(callId) {
                if (DheeVoiceBotApi.lastWebSocket) {
                    var lastWebSocket = DheeVoiceBotApi.lastWebSocket;
                    if (lastWebSocket.readyState === lastWebSocket.CONNECTING || lastWebSocket.readyState === lastWebSocket.OPEN) {
                        return;
                    }
                }

                var websocketPromise = new Promise(function (resolve, reject) {

                    var callConnectionUrl = "wss://runtime.dhee.ai/talk/";

                    socket = new WebSocket(callConnectionUrl + callId);
                    socket.binaryType = "arraybuffer";
                    socket.addEventListener('open', resolve);
                    socket.addEventListener('error', reject);
                    socket.onmessage = function (event) {
                        console.debug("WebSocket message received:", event);
                    };
                    return socket;
                });

                Promise.all([audioPromise, websocketPromise]).then(function (values) {

                    var micStream = values[0];
                    var socket = values[1].target;

                    DheeVoiceBotApi.onConnect();

                    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });

                    var websocketProcessorScriptNode = audioContext.createScriptProcessor(8192, 1, 1);

                    const MAX_INT = Math.pow(2, 16 - 1) - 1;
                    websocketProcessorScriptNode.addEventListener('audioprocess', function (e) {

                        if (!DheeVoiceBotApi.listen) {
                            return;
                        }
                        var floatSamples = e.inputBuffer.getChannelData(0);

                        socket.send(Int16Array.from(floatSamples.map(function (n) {
                            return n * MAX_INT;
                        })));
                    });
                    DheeVoiceBotApi.websocketProcessorScriptNode = websocketProcessorScriptNode;


                    socket.addEventListener('close', function (e) {
                        console.log("websocket closed");
                        cleanUp();
                        DheeVoiceBotApi.onDisconnect();
                    });
                    socket.addEventListener('error', function (e) {
                        console.log('Error from websocket', e);
                        DheeVoiceBotApi.onError(e);
                    });
                    socket.addEventListener('message', onTranscription);

                    function sendInitParams() {
                        var config = {
                            callKey: callId
                        }
                        socket.send(JSON.stringify(config));
                    }

                    function startByteStream(e) {
                        microphoneStreamSource = audioContext.createMediaStreamSource(micStream);
                        microphoneStreamSource.connect(websocketProcessorScriptNode);
                        websocketProcessorScriptNode.connect(audioContext.destination);
                    }

                    var completeAudioBuffer;
                    var bufferCompleted = false;
                    var audioId;
                    var endAudioId;
                    var completedAudioBuffers = [];
                    function onTranscription(message) {

                        if (typeof message.data === "string") {

                            if (message.data.startsWith('startAudioStream')) {
                                audioId = message.data.replace("startAudioStream:", "");
                                console.log("initialising audio stream " + audioId);
                                completeAudioBuffer = new Uint8Array();
                                completedAudioBuffers[audioId] = completeAudioBuffer;
                            } else if (message.data.startsWith('endAudioStream')) {
                                endAudioId = message.data.replace("endAudioStream:", "");
                                if (endAudioId != audioId) {
                                    console.log("audio Id got replaced in between !");
                                }
                                console.log("Completed audio stream " + endAudioId + ". Playing it.");
                                var playableAudioId = endAudioId;
                                setTimeout(function () {
                                    var playableBuffer = copyArrayBuffer(completedAudioBuffers[playableAudioId].buffer);
                                    delete completedAudioBuffers[playableAudioId];
                                    playCompleteAudio(playableBuffer);
                                    setTimeout(function() {
                                        console.log("utterenace completed.");
                                        DheeVoiceBotApi.onUtteranceCompleted();
                                    }, 5000)
                                    
                                }, 100)

                            } else {
                                console.log("Got Text: " + message.data);
                            }
                            return;
                        }
                        var arrayBuffer;
                        if (message.data instanceof ArrayBuffer) {
                            arrayBuffer = message.data;
                            appendBuffer(new Uint8Array(arrayBuffer));
                        } else {

                            var arrayBufferPromise = message.data.arrayBuffer();

                            arrayBufferPromise.then(function (arrayBuffer) {
                                appendBuffer(new Uint8Array(arrayBuffer));
                            });
                        }
                    }

                    function copyArrayBuffer(src) {
                        var dst = new ArrayBuffer(src.byteLength);
                        new Uint8Array(dst).set(new Uint8Array(src));
                        return dst;
                    }

                    function appendBuffer(buffer2) {

                        var buffer1 = completeAudioBuffer;
                        if (buffer1.byteLength === 0) {
                            buffer1 = new Uint8Array();
                        }
                        var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
                        tmp.set(new Uint8Array(buffer1), 0);
                        tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
                        completeAudioBuffer = tmp;
                        completedAudioBuffers[audioId] = tmp;
                    };

                    function playCompleteAudio(arrayBuffer) {
                        try {
                            console.log('decoding into audio buffer bytes of length ' + arrayBuffer.byteLength);
                            audioContext.decodeAudioData(arrayBuffer, function (soundBuffer) {
                                playBuffer(soundBuffer, audioContext);
                            }, function (x) {
                                console.log("decoding failed", x)
                            });
                        } catch (error) {
                            console.log("error while decoding audio :" + error);
                        }

                    }

                    var lastAudioBufferSource;
                    var lastStartTime;

                    function playBuffer(buf, context) {
                        var startTime = audioContext.currentTime;
                        if (audioContext.state === 'running' && lastAudioBufferSource) {
                            startTime = lastStartTime + lastAudioBufferSource.buffer.duration + 1;

                        }
                        var source = context.createBufferSource();
                        source.buffer = buf;
                        source.connect(context.destination);

                        if (startTime < audioContext.currentTime) {
                            startTime = audioContext.currentTime + 0.1;
                        }
                        lastStartTime = startTime;
                        lastAudioBufferSource = source;
                        console.log("adjusted start time = " + startTime);

                        source.start(startTime);

                    }

                    sendInitParams();
                    startByteStream();

                }).catch(console.log.bind(console));
            }

            function closeWebsocket() {
                try {
                    if (socket && socket.readyState === socket.OPEN) {
                        socket.close();
                    }
                } catch (error) {
                    console.error(error);
                }
            }

            function cleanUp() {
                try {
                    console.log("cleaning up connections");
                    if (DheeVoiceBotApi.websocketProcessorScriptNode) {
                        DheeVoiceBotApi.websocketProcessorScriptNode.disconnect();
                    }
                    if (microphoneStreamSource) {
                        microphoneStreamSource.disconnect();
                    }
                    if (audioContext) {
                        audioContext.close();
                    }

                } catch (error) {
                    console.error(error);
                }
            }

            function toggleWebsocket(e) {
                var context = e.target;
                if (context.state === 'running') {
                    newWebsocket();
                } else if (context.state === 'suspended') {
                    setTimeout(function () {
                        closeWebsocket();
                    }, 1500);
                }
            }

            DheeVoiceBotApi.newWebsocket = newWebsocket;
            DheeVoiceBotApi.closeWebsocket = closeWebsocket;
            DheeVoiceBotApi.setupComplete = true;
        }

        initWebsocket();

        var callCreationUrl = 'https://runtime.dhee.ai/web/get-voice-channel';

        function initiateVoiceCall() {
            var userName = DheeVoiceBotApi.defaultCalleeName;
            if (calleeName) {
                userName = calleeName;
            }
            var config = {
                apiKey: DheeVoiceBotApi.apiKey,
                apiSecret: DheeVoiceBotApi.apiSecret,
                customerName: userName,
                contactNumber: '0000000000',
                language: lang,
                initMode: "INBOUND",
                voiceGender: "FEMALE",
                callParams: {}
            }
            var callId = false;

            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
                if (this.readyState != 4) return;

                if (this.status == 200) {
                    var res = JSON.parse(this.responseText);
                    if (res.success === true) {
                        callId = res.result;
                        console.log("Got callId :" + callId);
                        DheeVoiceBotApi.newWebsocket(callId);
                    } else {
                        DheeVoiceBotApi.onError(res.result);
                    }
                } else {
                    DheeVoiceBotApi.onError("Cannot reach Dhee cloud. Response code " + this.status);
                }
            };

            xhr.open("POST", callCreationUrl, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(config));
        }
        initiateVoiceCall();
    }

    this.disconnect = function() {
        this.closeWebsocket();
    }

    return this;
}