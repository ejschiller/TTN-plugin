const ttn = require("ttn");
const tou8 = require('buffer-to-uint8array');
const Buffer = require('buffer').Buffer;
const winston = require('winston');
const fetch = require('node-fetch');
const base64 = require('base-64');
var ed25519 = require('ed25519');
const sha = require('js-sha3');

//Root wallet NEEDED!
const WALLET = 'WalletA.txt'

const Sensor = require('./Sensor');
const Blockchain = require('./api/Blockchain');

//TTN configuration
const appID = process.env.appID ? process.env.appID : "prova_gosdk";
const accessKey = process.env.accessKey ? process.env.accessKey : "ttn-account-v2.eHSUlAdCQmjHUvBtRORdjV_NuhLfQH2xMjuNR_nrSNc";

//FLAGS
const PUBLICKEY = 80;
const SIGNATURE_1 = 81;     //Signature[0:32]
const SIGNATURE_2 = 82;     //Signature[32:64]

const bc = new Blockchain();
bc.rootWallet = bc.getPrivKey();

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
            const counter = DecoderCounter(payload_raw)
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
            payloadTmp = payload_raw.slice(0, len - 2);
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
                if (counter === PUBLICKEY && sensor.publicKey === 0) {
                    savePublicKey(sensor, sensorTmp);
                    if (!sensor.walletCreated) {
                        console.log("NO account, creating one new...")
                        bc.createNewAccount(sensor);
                    }
                }
                else if (counter === SIGNATURE_1 && sensor.signature.length === 0) {
                    saveSignature(sensor, sensorTmp, SIGNATURE_1);
                }
                else if (counter === SIGNATURE_2 && sensor.signature.length === 32) {
                    saveSignature(sensor, sensorTmp, SIGNATURE_2);
                    const rootPubKey = bc.getPubKeyFromPrivKey(bc.rootWallet);
                    if (sensor.verifyData(rootPubKey, bc)) {
                        console.log("SENDING DATA TO BC")
                        bc.sendData(sensor);
                    }
                }
                else {
                    console.log("PAYLOAD FORMAT UNKNOWN")
                }
            }
            //Every other packet
            else {
                //const {payload_fields: {counter}} = payload;
                const {packetReceived} = sensor;
                //packet already received, send only ACK
                if (!!packetReceived[counter]) {
                    sensor.log('info', `[${time}] ${devID} received existing data #${counter.toString()}, datarate: ${data_rate}, airtime: ${airtime}, gateways: ${numberGateways}`)
                } else {
                    sensor.packetReceived[counter] = true;
                    sensor.counter = counter + 1;
                    saveData(sensor, sensorTmp)
                }
            }
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
    let isPubKey = sensor.publicKey === null;
    sensor.publicKey = tou8(sensorTmp.payloadTmp);
    if (!isPubKey) {
        sensor.instantiateWallet(bc)
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

const sen = new Sensor('prova');


//bc.createNewAccount(sen)
//bc.sendFunds(sen,500)


//10 packets of 40 each
//160 seconds delay between packets
async function test() {
    for (let i = 1; i < 10; i++) {

        console.log("send data to BC " + sen.txCnt)
        bc.sendData(sen)
        sen.txCnt = sen.txCnt + 1;
        number = Buffer.from([Math.random() * 10000, Math.random() * 10000, Math.random() * 10000, Math.random() * 10000, Math.random() * 10000]);
        keypair = ed25519.MakeKeypair(pK)
        signature = ed25519.Sign(number, keypair)

        sen.publicKey = keypair.publicKey;
        sen.data = number
        sen.signature = signature;
        await sleep(10000)


    }
}

//test();
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

//Function to extract the current counter from the payload
function DecoderCounter(bytes) {
    var len = bytes.length
    return bytes[len - 2] << 8 | bytes[len - 1]
}

async function testWallet() {
    keypair = ed25519.MakeKeypair(pKTmp);
    let bc = new Blockchain();
    const data = await readFile(WALLET)
    const privK = bc.getPrivKeyFromFile(data)
    const pubK = Buffer.from(bc.getPubKeyFromPrivKey(privK));
    const txCntB = Buffer.from(getInt32Bytes(txCnt));
    const txFeeB = Buffer.from(getInt64Bytes(txFee));
    let toSign = Buffer.concat([Buffer.from(sha.sha3_256(pubK), 'HEX'), Buffer.from(sha.sha3_256(keypair.publicKey), 'HEX'), txCntB, txFeeB])
    let header = new Buffer.alloc(1);
    header.writeInt8(0, 0);
    toSign = Buffer.concat([toSign, header, dataNodeTmp]);
    let hash = sha.sha3_256(toSign);
    hash = Buffer.from(hash, 'HEX');
    //console.log([...toSign])
    sTmp = ed25519.Sign(hash, keypair)
    let valid = ed25519.Verify(hash, sTmp, keypair.publicKey)
    console.log(valid)
    senTmp.publicKey = keypair.publicKey;
    senTmp.data = dataNodeTmp;
    senTmp.txCnt = txCnt;
    senTmp.txHash = hash;
    senTmp.signature = sTmp;
    senTmp.txFee = txFee;
    //bc.createNewAccount(senTmp);
    //bc.sendFunds(senTmp,987654321);
    bc.sendData(senTmp, pubK)
}

function getInt32Bytes(x) {
    var bytes = [];
    var i = 4;
    do {
        bytes[--i] = x & (255);
        x = x >> 8;
    } while (i)
    return bytes;
}

function getInt64Bytes(x) {
    var bytes = [];
    var i = 8;
    do {
        bytes[--i] = x & (255);
        x = x >> 8;
    } while (i)
    return bytes;
}

//testWallet()
sleep(1000)