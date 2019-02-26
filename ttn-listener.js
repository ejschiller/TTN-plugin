const ttn = require("ttn");
const tou8 = require('buffer-to-uint8array');
const Sensor = require('./Sensor');
const Buffer = require('buffer').Buffer;
let winston = require('winston');
const fetch = require('node-fetch');
const base64 = require('base-64');
const BLOCKCHAIN_CLIENT_IP ='http://192.168.0.161:8010'

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

//TTN configuration
const appID = process.env.appID ? process.env.appID : "prova_gosdk";
const accessKey = process.env.accessKey ? process.env.accessKey : "ttn-account-v2.eHSUlAdCQmjHUvBtRORdjV_NuhLfQH2xMjuNR_nrSNc";

const sensors = new Map();


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

function sendDataToBC(sensor) {
    body = {
        DevId: sensor.devId,
        PublicKey: [...sensor.publicKey],
        Data: [...sensor.data],
        Signature: [...sensor.signature],
    }
    console.log(body)
    fetch(`${BLOCKCHAIN_CLIENT_IP}/verify`, {
        method: 'post',
        body: JSON.stringify(body),
        headers: {'Content-Type': 'application/json'},
    })
    //.then(res => res.json())
        .then(() => {
            process.exit(1)

        });
}

ttn.data(appID, accessKey)
//Start listening for incoming packet
    .then(function (client) {

        client.on("uplink", function (devID, payload) {

            const {payload_raw} = payload;
            if (!payload_raw) {
                return;
            }
            logger.log('info', JSON.stringify(payload))
            let sensor = sensors.get(devID);
            const {metadata: {time, data_rate, airtime, gateways}} = payload;
            let numberGateways = 0;
            if (!!gateways) {
                numberGateways = gateways.length
            }
            //sensor does not exist yet
            if (!sensor) {
                sensor = new Sensor(devID);
                sensors.set(devID, sensor);
            }

            //Public Key
            if (payload_raw.length === 32) {
                sensor.publicKey = tou8(payload_raw);
                //console.log(`[${devID}]`, 'received publicKey', sensor.publicKey.slice(0, 5));
                sendAck(client, devID, 9)
                sensor.log('info', `[${time}] ${devID} received publicKey [${sensor.publicKey.slice(0, 5).toString()}], datarate: ${data_rate}, airtime: ${airtime}, gateways: ${numberGateways}`)
            }
            //Signature
            else if (payload_raw.length === 64) {
                sensor.signature = tou8(payload_raw);
                // console.log(`[${devID}]`, 'received signature', sensor.signature.slice(0, 5));
                sendAck(client, devID, 8);
                sensor.log('info', `[${time}] ${devID} received signature [${sensor.signature.slice(0, 5).toString()}], datarate: ${data_rate}, airtime: ${airtime}, gateways: ${numberGateways}`)

                sensor.verifyData();

            }
            //Every other packet
            else {
                const {payload_fields: {counter}} = payload;
                const {packetReceived} = sensor;

                if (!!packetReceived[counter]) {
                    //packet already received, send only ACK
                    // console.log(`[${devID}] data already received ${counter}`);
                    sendAck(client, devID, counter);
                    sensor.log('info', `[${time}] ${devID} received existing data #${counter.toString()}, datarate: ${data_rate}, airtime: ${airtime}, gateways: ${numberGateways}`)

                } else {
                    sensor.packetReceived[counter] = true;
                    sensor.counter = sensor.counter++;
                    const len = payload_raw.length;

                    //remove the counter from the buffer
                    payloadTmp = payload_raw.slice(0, len - 2);
                    if (!sensor.data) {
                        sensor.data = payloadTmp;
                        // console.log(`[${devID}]`, 'received first data of size ', sensor.data.length);

                    } else {
                        sensor.data = Buffer.concat([sensor.data, payloadTmp]);
                        // console.log(`[${devID}]`, `received data #${counter} of size`, sensor.data.length);

                    }
                    sendAck(client, devID, counter);
                    sensor.log('info', `[${time}] ${devID} received packet #${counter} with data: ${payloadTmp.toString('hex')}, size: ${payloadTmp.length}, datarate: ${data_rate}, airtime: ${airtime}, gateways: ${numberGateways}`)

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


const pK = new Buffer('E309D2CC8073C26A3EF0B73F38B83A36762BE6E524E18388733B01702B4F60B6', 'HEX')
const dataNode = new Buffer('0079007C007400DD0096003B008F00E500D100E8006C00C30038006F00420033000F00F4002F00D2' +
    '005500BF0035003900FD00D900B800FD00CD009E001700FB00A4000C0077009E006800DB00AD00CC' +


    '00EF001800590072003E0006004000310072009D0084009F00D3007B00A100BC00B4007A0031000B' +


    '00AA0098003D00E20000008A00E700BB008100A4007800E4006B00D00019000400DA0087007F00E6' +


    '00D0002400A100B7006A001500BE00F90016008000FB004F008A006C009C00DF0007006F006D0024' +


    '00F1004200B9008B00670007002400C200840077003F00DF00A8006400D2007A00AA000A003500E9' +


    '0043000700D70077003300E1006200DE000F003F0010009B0058001F0008002500BA004D003800F7' +


    '0052004A00FF006100C600E20025002E00FC0055001100870032005C0004009C008700E60049002C' +


    '001100D3001C002000BC00820020002700BB00860048007F000500E00086007900D200D500E9000A' +


    '008B00F900CF00EB00A500DA009200C2006A007F00AA00A3009100A20020001300CA00CE00A300A8', 'HEX')

const s = new Buffer('6CDB7CF0C9784E02709C7EA92137F8E32C87E8FF820DC9637EDBDB4435B55BF80618A6C6F4023497F17082B774710E3D1D3B6F0AB26458EAB61189A383BCBA06', 'HEX')
//console.log(pK)
const sen = new Sensor('prova');

sen.publicKey = pK;
sen.data = dataNode;
sen.signature = s;

setTimeout(() => {
    console.log("send data to BC")
    sendDataToBC(sen, pK, dataNode, s)
}, 1000)
