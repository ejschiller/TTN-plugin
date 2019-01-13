var ttn = require("ttn")
var ed = require('ed25519-supercop');
var ed25519 = require('ed25519');
var crypto = require('crypto');

const Buffer = require('buffer').Buffer;

//TTN configuration
var appID = process.env.appID;
var accessKey = process.env.accessKey;


var signature = new Int8Array(32);
var publicKey = new Int8Array(64);

//when the script starts, after the public key, the first payload SIGNED should be received
var first = true;
//var dataToVerify;
//var nrBytes = 8;
var counter = 0;
var totalPacketToReceive = 0;

//The counter of the packet to received
var packetToReceive = 0;

//Array of boolean containing at the index position whether the payload was received or not
var packetReceived = [];


var data;

var pubK = [];
var sign = [];


function verifyData(){
    if (ed25519.Verify(data, new Uint8Array(sign), new Uint8Array(pubK))) {
        console.log('Signature valid');
    } else {
        console.log('Signature NOT valid');
    }
}

function resetParameter(){
    sign = [];
    counter = 0;
    totalPacketToReceive = 0;
    packetToReceive = 0;
    packetReceived = [];
}

function sendAck(client, devID, message){
    const buf = Buffer.alloc(2);
    buf.writeUInt16BE(message, 0);
    client.send(devID, buf, 1);
}
ttn.data(appID, accessKey)

    //Start listening for incoming packet
    .then(function (client) {
        const buf = Buffer.alloc(2);
        client.on("uplink", function (devID, payload) {
            console.log("Received uplink from ", devID)
            //console.log(payload)
            if(payload['payload_raw']) {
                //First packet which contains the counter of how many packets are going to be received
                //The signature == 0 signifies the first packet as well
                //THIS IS THE SIGNED DATA
                if (payload['payload_raw'].length == 11 &&
                    payload['payload_fields']['counter'] != 0 &&
                    payload['payload_fields']['signature'] == 0) {
                    packetReceived = [];
                    packetToReceive = 0;
                    totalPacketToReceive = 0;
                    first = false;

                    //keep track of which packet have been received
                    for (var i = 0; i < payload['payload_fields']['counter']; i++) {
                        packetReceived[i] = false;
                    }
                    totalPacketToReceive = payload['payload_fields']['counter'];
                    console.log("FIRST packet received ", {"counter": payload['payload_fields']['counter']}, "length ", payload['payload_raw'].length)
                    sendAck(client, devID, payload['payload_fields']['counter']);
                    //SIGNED DATA
                    data = payload['payload_raw'];
                }

                //Last packet
                //TODThe signature ==1 signifies the LAST packet not containing part of the signature
                else if (payload['payload_raw'].length == 11
                    && payload['payload_fields']['counter'] == totalPacketToReceive
                    && payload['payload_fields']['signature'] == 1) {
                    first = true;
                    console.log("LAST packet received ", {"counter": payload['payload_fields']['counter']}, "length ", payload['payload_raw'].length)
                    sendAck(client, devID, payload['payload_fields']['counter']);
                    verifyData();
                    resetParameter();
                }
                //Packets containing the signature and data
                //We can now which kind of payload we are getting only from its length
                else if (payload['payload_raw'].length == 25 && !first) {
                    //check whether we have te correct packet
                    if (packetToReceive == payload['payload_fields']['counter']) {
                        packetReceived[packetToReceive++] = true;
                        console.log("RECEIVED RIGHT PACKET")

                        //save the part of the signature we received
                        for (i = 0; i < payload['payload_fields']['signature'].length; i++) {
                            sign[counter++] = (payload['payload_fields']['signature'][i]);
                        }
                        sendAck(client, devID, payload['payload_fields']['counter']);

                        console.log("PACKET + SIGNATURE received ", {"counter": payload['payload_fields']['counter']}, "length ", payload['payload_raw'].length)
                    } else {
                        console.log("WRONG PACKET RECEIVED");
                        console.log("EXPECTED PACKET NR: ", packetToReceive);

                        //check if we already had that packet, if yes then send the acknowledgement again
                        var tmpCounter = payload['payload_fields']['counter'];
                        if (packetReceived[tmpCounter] === true) {
                            sendAck(client, devID, payload['payload_fields']['counter']);
                            console.log("PACKET ALREADY EXISTING ", payload['payload_fields']['counter'])
                        }
                    }
                    // console.log(sign.join());
                }
                //The packet which contains the publicKey, sent only once at the beginning
                else if (payload['payload_raw'].length == 32) {
                    for (i = 0; i < payload['payload_fields']['publicKey'].length; i++) {
                        pubK[i] = (payload['payload_fields']['publicKey'][i]);
                    }
                    sendAck(client, devID, 9);

                    console.log("PUBKEY received ", {"counter": buf}, "length ", payload['payload_raw'].length);
                    // console.log(pubK.join());
                } else {
                    console.log("Unexpected packet received --> ", "length ", payload['payload_raw'].length);
                    console.log(payload)

                }
            }
        })

        // client.on("downlink", function (devID, payload) {
        //     console.log("Received downlnk from ", devID)
        //     console.log(payload)
        // })
    })
    .catch(function (error) {
        console.error("Error", error)
        process.exit(1)
    })



console.log("Listening...")
