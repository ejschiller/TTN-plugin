const ttn = require("ttn");
const tou8 = require('buffer-to-uint8array');
const Buffer = require('buffer').Buffer;
const winston = require('winston');
const fetch = require('node-fetch');
const base64 = require('base-64');
var ed25519 = require('ed25519');


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

        client.on("uplink", function (devID, payload) {

            const {payload_raw} = payload;
            if (!payload_raw) {
                return;
            }
            logger.log('info', JSON.stringify(payload))
            let sensor = sensors.get(devID);

            //sensor does not exist yet
            if (!sensor) {
                sensor = new Sensor(devID);
                sensors.set(devID, sensor);
            }
            //Extract the counter or the flag to recognize what kind of data is received
            //const {payload_fields: {counter}} = payload;
            const counter = DecoderCounter(payload_raw)

            sendAck(client, devID, counter);

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
                if (counter === PUBLICKEY) {
                    savePublicKey(sensor, sensorTmp);
                    if (!sensor.walletCreated) {
                        //bc.createNewAccount(sensor);
                    }
                }
                else if (counter === SIGNATURE_1) {
                    saveSignature(sensor, sensorTmp, SIGNATURE_1);
                }
                else if (counter === SIGNATURE_2) {
                    saveSignature(sensor, sensorTmp, SIGNATURE_2);
                    if (sensor.verifyData()) {
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
        console.error("Error", error)
        process.exit(1)
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
        //sensor.instantiateWallet()
    }
    sensor.log('info', `[${sensorTmp.time}] ${sensorTmp.devID} received publicKey [${sensor.publicKey.slice(0, 5).toString('hex')}],
     datarate: ${sensorTmp.data_rate}, airtime: ${sensorTmp.airtime}, gateways: ${sensorTmp.numberGateways}`);
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


const pK = new Buffer.from('E309D2CC8073C26A3EF0B73F38B83A36762BE6E524E18388733B01702B4F60B6', 'HEX')
const dataNode = new Buffer.from('0079007C007400DD0096003B008F00E500D100E8006C00C30038006F00420033000F00F4002F00D2' +
    '005500BF0035003900FD00D900B800FD00CD009E001700FB00A4000C0077009E006800DB00AD00CC' +


    '00EF001800590072003E0006004000310072009D0084009F00D3007B00A100BC00B4007A0031000B' +


    '00AA0098003D00E20000008A00E700BB008100A4007800E4006B00D00019000400DA0087007F00E6' +


    '00D0002400A100B7006A001500BE00F90016008000FB004F008A006C009C00DF0007006F006D0024' +


    '00F1004200B9008B00670007002400C200840077003F00DF00A8006400D2007A00AA000A003500E9' +


    '0043000700D70077003300E1006200DE000F003F0010009B0058001F0008002500BA004D003800F7' +


    '0052004A00FF006100C600E20025002E00FC0055001100870032005C0004009C008700E60049002C' +


    '001100D3001C002000BC00820020002700BB00860048007F000500E00086007900D200D500E9000A' +


    '008B00F900CF00EB00A500DA009200C2006A007F00AA00A3009100A20020001300CA00CE00A300A8', 'HEX')

const s = new Buffer.from('6CDB7CF0C9784E02709C7EA92137F8E32C87E8FF820DC9637EDBDB4435B55BF80618A6C6F4023497F17082B774710E3D1D3B6F0AB26458EAB61189A383BCBA06', 'HEX')
const sen = new Sensor('prova');

//TEST
let number = Buffer.from([Math.random() * 10000, Math.random() * 10000]);
let keypair = ed25519.MakeKeypair(pK)
let signature = ed25519.Sign(number, keypair)
console.log(ed25519.Verify(number, signature, keypair.publicKey))
sen.publicKey = keypair.publicKey;
sen.data = number
sen.signature = signature;
sen.txCnt = 2

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

function DecoderCounter(bytes) {
    var len = bytes.length
    return bytes[len - 2] << 8 | bytes[len - 1]
}

sleep(1000)