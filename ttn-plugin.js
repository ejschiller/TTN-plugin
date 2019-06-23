const ttn = require("ttn");
const tou8 = require('buffer-to-uint8array');
const Buffer = require('buffer').Buffer;
const winston = require('winston');
const HelperFunctions = require("./HelperFunctions");


const Sensor = require('./Sensor');
const Blockchain = require('./api/Blockchain.js');

//TTN configuration
const appID = process.env.appID ? process.env.appID : "prova_gosdk";
const accessKey = process.env.accessKey ? process.env.accessKey : "ttn-account-v2.eHSUlAdCQmjHUvBtRORdjV_NuhLfQH2xMjuNR_nrSNc";

//FLAGS
const PUBLICKEY = 80;
const SIGNATURE_1 = 81;     //Signature[0:32]
const SIGNATURE_2 = 82;     //Signature[32:64]



//Initialize the logger
let logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(info => {
            return `${info.timestamp} ${info.level}: ${info.message}`;
        })
    ),
    transports: [
        new winston.transports.File({filename: `log/ALL.log`})]
});


const sensors = new Map();


var data;

var pubK = [];
var sign = [];



let effTests = [];
let efficiencyTest = {
    publicKey: 0,
    sign1: 0,
    sign2: 0,
    dataPackets: 0,
    alreadyReceivedDataPackets: 0,
    downLink: 0,
};
effTests.push(efficiencyTest)
function getCurrentTestIndex(){
    return effTests.length-1
}


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
//Start listening for incoming packets
    .then(function (client) {
        client.on("uplink", async function (devID, payload) {

            const {payload_raw} = payload;
            if (!payload_raw) {
                return;
            }
            //Extract the counter or the flag to recognize what kind of data is received
            //const {payload_fields: {counter}} = payload;
            const counter = HelperFunctions.DecoderCounter(payload_raw)
            //Send the ACK as soon as possible to increase the change to transfer it on time
            sendAck(client, devID, counter);
            let sensor = sensors.get(devID);

            //sensor does not exist yet
            if (!sensor) {
                sensor = new Sensor(devID);
                sensors.set(devID, sensor);
            }

            const {metadata: {time, data_rate, airtime, gateways}} = payload;
            let numberGateways = 0;
            if (!!gateways) {
                numberGateways = gateways.length
            }
            //remove the counter from the buffer
            const len = payload_raw.length;
            const payloadTmp = payload_raw.slice(0, len - 2);
            const sensorTmp = {
                payloadTmp,
                counter,
                time,
                devID,
                data_rate,
                airtime,
                numberGateways,
            };

            //Possible Packets = PublicKey | Signature1 | Signature2
            if (payloadTmp.length === 32) {
                if (counter === PUBLICKEY) {
                    if(effTests[getCurrentTestIndex()].sign2>0) {
                        sensor.resetParameters()
                        let efficiencyTest = {
                            publicKey: 1,
                            sign1: 0,
                            sign2: 0,
                            dataPackets: 0,
                            alreadyReceivedDataPackets: 0,
                            downLink: 0,
                        };
                        effTests.push(efficiencyTest)
                    }else{
                        effTests[getCurrentTestIndex()].publicKey++;
                    }
                    sensor.log('info', `LENGTH OF TESTS --> ${effTests.length}`)
                    sensor.log('info', JSON.stringify(effTests))
                    savePublicKey(sensor, sensorTmp);
                }
                else if (counter === SIGNATURE_1) {
                    effTests[getCurrentTestIndex()].sign1++;
                    saveSignature(sensor, sensorTmp, SIGNATURE_1);
                }
                else if (counter === SIGNATURE_2) {
                    effTests[getCurrentTestIndex()].sign2++;
                    saveSignature(sensor, sensorTmp, SIGNATURE_2);
                }
            }
            //Every other packet
            else {
                //const {payload_fields: {counter}} = payload;
                const {packetReceived} = sensor;
                //packet already received, send only ACK
                if (!!packetReceived[counter]) {
                    effTests[getCurrentTestIndex()].alreadyReceivedDataPackets++;
                    sensor.log('info', `[${time}] ${devID} received existing data #${counter.toString()}, datarate: ${data_rate}, airtime: ${airtime}, gateways: ${numberGateways}`)
                } else {
                    effTests[getCurrentTestIndex()].dataPackets++;
                    sensor.packetReceived[counter] = true;
                    sensor.counter = counter + 1;
                    saveData(sensor, sensorTmp)
                }
            }
            effTests[getCurrentTestIndex()].downLink++;

        })
        // client.on("downlink", function (devID, payload) {
        //     console.log("Received downlnk from ", devID)
        //     console.log(payload)
        // })
    })
    .catch(function (error) {
        console.error("Error", error);
    });
function sendAck(client, devID, message) {
    try {
        const buf = Buffer.alloc(2);
        buf.writeInt8(message, 0);
        client.send(devID, buf, 1);
    }
    catch (e) {
        logger.log('error', e)
    }
}

function savePublicKey(sensor, sensorTmp) {
    let isPubKey = sensor.publicKey.length !== 0;
    sensor.publicKey = tou8(sensorTmp.payloadTmp);
    if (!isPubKey) {
        //sensor.instantiateWallet(bc)
    }
    sensor.log('info', `[${sensorTmp.time}] ${sensorTmp.devID} received publicKey [${sensor.publicKey.slice(0, 5).toString('hex')}], datarate: ${sensorTmp.data_rate}, airtime: ${sensorTmp.airtime}, gateways: ${sensorTmp.numberGateways}`);
}

function saveSignature(sensor, sensorTmp, counter) {
    if (counter === SIGNATURE_1) {
        sensor.signature = tou8(sensorTmp.payloadTmp);
        sensor.log('info', `[${sensorTmp.time}] ${sensorTmp.devID} received signature1 [${sensor.signature.slice(0, 5).toString('hex')}], datarate: ${sensorTmp.data_rate}, airtime: ${sensorTmp.airtime}, gateways: ${sensorTmp.numberGateways}`);

    } else if (counter === SIGNATURE_2 && !!sensor.signature && sensor.signature.length == 32) {
        sensor.signature = Buffer.concat([sensor.signature, sensorTmp.payloadTmp]);
        sensor.log('info', `[${sensorTmp.time}] ${sensorTmp.devID} received signature2 [${sensor.signature.slice(0, 5).toString('hex')}], datarate: ${sensorTmp.data_rate}, airtime: ${sensorTmp.airtime}, gateways: ${sensorTmp.numberGateways}`);
    } else {
        sensor.log('info', `[${sensorTmp.time}] ${sensorTmp.devID} INVALID SIGNATURE COUNTER `);
    }

}

function saveData(sensor, sensorTmp) {
    if (!sensor.data) {
        sensor.data = sensorTmp.payloadTmp;
    } else {
        sensor.data = Buffer.concat([sensor.data, sensorTmp.payloadTmp]);
    }
    sensor.log('info', `[${sensorTmp.time}] ${sensorTmp.devID} received packet #${sensorTmp.counter} with data: ${sensorTmp.payloadTmp.toString('hex')}, size: ${sensorTmp.payloadTmp.length}, datarate: ${sensorTmp.data_rate}, airtime: ${sensorTmp.airtime}, gateways: ${sensorTmp.numberGateways}`)
}


console.log("Listening to LoRa nodes from TTN...")


//let sensor = new Sensor();
//sensor.publicKey = tou8(Buffer.from('d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a','hex'));
//bc.createNewAccount(sensor);
//bc.sendFunds(sensor,10000);
