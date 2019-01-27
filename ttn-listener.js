var ttn = require("ttn")
var ed = require('ed25519-supercop');
var crypto = require('crypto');
var tou8 = require('buffer-to-uint8array');
var Sensor = require('./Sensor');
const Buffer = require('buffer').Buffer;

//TTN configuration
var appID = process.env.appID ? process.env.appID : "prova_gosdk";
var accessKey = process.env.accessKey ? process.env.accessKey : "ttn-account-v2.eHSUlAdCQmjHUvBtRORdjV_NuhLfQH2xMjuNR_nrSNc";

var sensors = new Map();

var duplicates = 0;


// var signature = new Int8Array(32);
// var publicKey = new Int8Array(64);

function sendAck(client, devID, message){
    const buf = Buffer.alloc(2);
    // buf.writeUInt16BE(message, 0);
    buf.writeInt8(message,0);
    client.send(devID, buf, 1);
}
ttn.data(appID, accessKey)
    //Start listening for incoming packet
    .then(function (client) {
        client.on("uplink", function (devID, payload) {
            var sensor = sensors.get(devID);

            //sensor does not exist yet
            if(!sensor){
                console.log("new Sensor")
               sensor = new Sensor(devID);
               sensors.set(devID,sensor);
            }

            if(!payload['payload_raw']){return};
            var payloadTmp = payload['payload_raw'];
            if(payloadTmp.length === 32){
                sensor.publicKey = tou8(payloadTmp);
                console.log(`[${devID}]`, 'received publicKey',sensor.publicKey.slice(0,5));
                sendAck(client, devID, 9)
            }
            else if(payloadTmp.length === 64){
                sensor.signature = tou8(payloadTmp);
                console.log(`[${devID}]`, 'received signature',sensor.signature.slice(0,5));
                sendAck(client, devID, 8);
                sensor.verifyData();
                sensor.resetParameters()
                console.log(duplicates);
                exit();

            }else{
                const counter = parseInt(payload['payload_fields']['counter']);
                var packetReceived = sensor.packetReceived;
                if(!!packetReceived[counter]){
                    //packet already received, send only ACK
                    console.log(`[${devID}] data already received ${counter}`);
                    sendAck(client, devID, counter);
                    duplicates++;
                }else {
                    sensor.packetReceived[counter] = true;
                    sensor.counter = sensor.counter++;
                    var len = payloadTmp.length;

                    //remove the counter from the buffer
                    payloadTmp = payloadTmp.slice(0,len-2);
                    if (!sensor.data) {
                        sensor.data = payloadTmp;
                        console.log(`[${devID}]`, 'received first data of size ', sensor.data.length);
                    } else {
                        sensor.data = Buffer.concat([sensor.data, payloadTmp])
                        console.log(`[${devID}]`, `received data #${counter} of size`, sensor.data.length);
                    }
                    sendAck(client, devID, counter)
                }
            }


            //console.log("Received uplink from ", devID)
            //console.log(payload)
            // if(payload['payload_raw']) {
            //     //First packet which contains the counter of how many packets are going to be received
            //     //The signature == 0 signifies the first packet as well
            //     //THIS IS THE SIGNED DATA
            //     // if (payload['payload_raw'].length == 11 &&
            //     //     payload['payload_fields']['counter'] != 0 &&
            //     //     payload['payload_fields']['signature'] == 0) {
            //     //     packetReceived = [];
            //     //     packetToReceive = 0;
            //     //     totalPacketToReceive = 0;
            //     //     first = false;
            //     //
            //     //     //keep track of which packet have been received
            //     //     for (var i = 0; i < payload['payload_fields']['counter']; i++) {
            //     //         packetReceived[i] = false;
            //     //     }
            //     //     totalPacketToReceive = payload['payload_fields']['counter'];
            //     //     console.log("FIRST packet received ", {"counter": payload['payload_fields']['counter']}, "length ", payload['payload_raw'].length)
            //     //     sendAck(client, devID, payload['payload_fields']['counter']);
            //     //     //SIGNED DATA
            //     //     data = payload['payload_raw'];
            //     // }
            //
            //     //Last packet
            //     //TODThe signature ==1 signifies the LAST packet not containing part of the signature
            //     // else if (payload['payload_raw'].length == 11
            //     //     && payload['payload_fields']['counter'] == totalPacketToReceive
            //     //     && payload['payload_fields']['signature'] == 1) {
            //     //     first = true;
            //     //     console.log("LAST packet received ", {"counter": payload['payload_fields']['counter']}, "length ", payload['payload_raw'].length)
            //     //     sendAck(client, devID, payload['payload_fields']['counter']);
            //     //     verifyData();
            //     //     resetParameter();
            //     // }
            //     //Packets containing the signature and data
            //     //We can now which kind of payload we are getting only from its length
            //     // else if (payload['payload_raw'].length == 25 && !first) {
            //     //     //check whether we have te correct packet
            //     //     if (packetToReceive == payload['payload_fields']['counter']) {
            //     //         packetReceived[packetToReceive++] = true;
            //     //         console.log("RECEIVED RIGHT PACKET")
            //     //
            //     //         //save the part of the signature we received
            //     //         for (i = 0; i < payload['payload_fields']['signature'].length; i++) {
            //     //             sign[counter++] = (payload['payload_fields']['signature'][i]);
            //     //         }
            //     //         sendAck(client, devID, payload['payload_fields']['counter']);
            //     //
            //     //         console.log("PACKET + SIGNATURE received ", {"counter": payload['payload_fields']['counter']}, "length ", payload['payload_raw'].length)
            //     //     } else {
            //     //         console.log("WRONG PACKET RECEIVED");
            //     //         console.log("EXPECTED PACKET NR: ", packetToReceive);
            //     //
            //     //         //check if we already had that packet, if yes then send the acknowledgement again
            //     //         var tmpCounter = payload['payload_fields']['counter'];
            //     //         if (packetReceived[tmpCounter] === true) {
            //     //             sendAck(client, devID, payload['payload_fields']['counter']);
            //     //             console.log("PACKET ALREADY EXISTING ", payload['payload_fields']['counter'])
            //     //         }
            //     //     }
            //     //     // console.log(sign.join());
            //     // }
            //     //The packet which contains the publicKey, sent only once at the beginning
            //     if (payload['payload_raw'].length == 32) {
            //         console.log(payload['payload_raw'])
            //         console.log(tou8(payload['payload_raw']))
            //         for (i = 0; i < payload['payload_fields']['publicKey'].length; i++) {
            //             pubK[i] = (payload['payload_fields']['publicKey'][i]);
            //         }
            //         console.log(pubK)
            //         sendAck(client, devID, 9);
            //
            //         console.log("PUBKEY received ", {"counter": buf}, "length ", payload['payload_raw'].length);
            //         // console.log(pubK.join());
            //     } else if (payload['payload_raw'].length == 2){
            //         console.log(tou8(payload['payload_raw']))
            //         console.log(payload['payload_fields'])
            //         if(!data){
            //            console.log("data is null, setting it");
            //            data = payload['payload_raw'];
            //            console.log(data);
            //         }else{
            //             console.log("data is not null --> concat")
            //             data = Buffer.concat([data,payload['payload_raw']])
            //             console.log(data);
            //         }
            //     }else if(payload['payload_raw'].length == 64){
            //         console.log(tou8(payload['payload_raw']))
            //         console.log("SIGNATURE")
            //         for (i = 0; i < payload['payload_fields']['publicKey'].length; i++) {
            //             sign[i] = (payload['payload_fields']['publicKey'][i]);
            //         }
            //         console.log(sign.length, sign)
            //         verifyData()
            //     }
            //
            //
            //
            //
            //
            //     else {
            //         console.log("Unexpected packet received --> ", "length ", payload['payload_raw'].length);
            //         console.log(payload)
            //
            //     }
            // }
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