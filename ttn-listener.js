var ttn = require("ttn");
var tou8 = require('buffer-to-uint8array');
var Sensor = require('./Sensor');
const Buffer = require('buffer').Buffer;

//TTN configuration
var appID = process.env.appID ? process.env.appID : "prova_gosdk";
var accessKey = process.env.accessKey ? process.env.accessKey : "ttn-account-v2.eHSUlAdCQmjHUvBtRORdjV_NuhLfQH2xMjuNR_nrSNc";

var sensors = new Map();


function sendAck(client, devID, message) {
    const buf = Buffer.alloc(2);
    buf.writeInt8(message, 0);
    client.send(devID, buf, 1);
}

ttn.data(appID, accessKey)
//Start listening for incoming packet
    .then(function (client) {
        client.on("uplink", function (devID, payload) {

            const {payload_raw} = payload;
            if (!payload_raw) {
                return;
            }

            var sensor = sensors.get(devID);

            //sensor does not exist yet
            if (!sensor) {
                sensor = new Sensor(devID);
                sensors.set(devID, sensor);
            }


            if (payload_raw.length === 32) {
                sensor.publicKey = tou8(payload_raw);
                console.log(`[${devID}]`, 'received publicKey', sensor.publicKey.slice(0, 5));
                sendAck(client, devID, 9)
            }
            else if (payload_raw.length === 64) {
                sensor.signature = tou8(payload_raw);
                console.log(`[${devID}]`, 'received signature', sensor.signature.slice(0, 5));
                sendAck(client, devID, 8);
                sensor.verifyData();
                sensor.resetParameters();

            } else {
                const {payload_fields: {counter}} = payload;
                const {packetReceived} = sensor;

                if (!!packetReceived[counter]) {
                    //packet already received, send only ACK
                    console.log(`[${devID}] data already received ${counter}`);
                    sendAck(client, devID, counter);
                } else {
                    sensor.packetReceived[counter] = true;
                    sensor.counter = sensor.counter++;
                    var len = payload_raw.length;

                    //remove the counter from the buffer
                    payloadTmp = payload_raw.slice(0, len - 2);
                    if (!sensor.data) {
                        sensor.data = payloadTmp;
                        console.log(`[${devID}]`, 'received first data of size ', sensor.data.length);
                    } else {
                        sensor.data = Buffer.concat([sensor.data, payloadTmp]);
                        console.log(`[${devID}]`, `received data #${counter} of size`, sensor.data.length);
                    }
                    sendAck(client, devID, counter);
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


console.log("Listening to LoRa nodes from TTN...")