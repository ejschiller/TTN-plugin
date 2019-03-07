const tou8 = require('buffer-to-uint8array');
const Buffer = require('buffer').Buffer;
const winston = require('winston');
const fetch = require('node-fetch');
const base64 = require('base-64');
var ed25519 = require('ed25519');
const Sensor = require('./Sensor');

//FLAGS
const PUB_KEY = 80;
const SIGN_1 = 81;
const SIGN_2 = 82;


const ttn_sensors = ['arduinomega3_sf7', 'arduinomega_2', 'my-new-devices',
    'raw', 'thethingsnode_sf7', 'thethingsuno_2']

const seeds = [
    'E309D2CC8073C26A3EF0B73F38B83A36762BE6E524E18388733B01702B4F60B6',
    'A309D2CC8073C26A3EF0B73F38B83A36762BE6E524E18388733B01702B4F60B6',
    'B309D2CC8073C26A3EF0B73F38B83A36762BE6E524E18388733B01702B4F60B6',
    'C309D2CC8073C26A3EF0B73F38B83A36762BE6E524E18388733B01702B4F60B6',
    'D309D2CC8073C26A3EF0B73F38B83A36762BE6E524E18388733B01702B4F60B6',
    'F309D2CC8073C26A3EF0B73F38B83A36762BE6E524E18388733B01702B4F60B6'
]

const sensors = new Map();

let seedCounter = 0;
for (let name of ttn_sensors) {
    sensors.set(name, new Sensor(name));
}
sensors.forEach((s) => {
    s.publicKey = Buffer.from(seeds[seedCounter], 'HEX')
    seedCounter++;
    s['keypair'] = ed25519.MakeKeypair(s.publicKey)
    s['counterData'] = 0
    s['dataArray'] = []

    for (let i = 0; i < 4; i++) {
        let tmp = []
        for (let n = 0; n < 40; n++) {
            tmp.push(getRandomArbitrary(0, 200))
        }
        s.dataArray.push(Buffer.from(tmp))
    }
})

const seconds = 20*1000;
for (let s of ttn_sensors) {
    const sensor = sensors.get(s);
    sensor['send'] = async () => {
        let random = getRandomArbitrary(10000, 100000)
        await sleep(random);
        let buff = [0, PUB_KEY]
        let pubKey = Buffer.concat([sensor.keypair.publicKey, Buffer.from(buff)]);
        sendUplink2(s, pubKey.toString('HEX'))

        console.log("send publicKey", s,)
        for (let d of sensor.dataArray) {
            await sleep(seconds)
            let dataTmp = Buffer.concat([d, Buffer.from([0, sensor.counterData])])
            console.log("send ->", `[${sensor.counterData}] \t -> ${s}`)
            sensor.counterData++
            sendUplink2(s, dataTmp.toString('HEX'))
            if (!sensor.data) {
                sensor.data = d;
            } else {
                sensor.data = Buffer.concat([sensor.data, d]);
            }
        }
        await sleep(2000);
        let tmpSign = ed25519.Sign(sensor.data, sensor.keypair)

        let tmpSign1 = Buffer.concat([tmpSign.slice(0,32),Buffer.from([0, SIGN_1])]);
        let tmpSign2 = Buffer.concat([tmpSign.slice(32,64),Buffer.from([0, SIGN_2])]);
        await sleep(seconds)
        sendUplink2(s, tmpSign1.toString('HEX'));
        await sleep(seconds)
        sendUplink2(s, tmpSign2.toString('HEX'));
    }
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


for (let s of ttn_sensors) {
    sensors.get(s).send()
}


/**
 * Returns a random number between min (inclusive) and max (exclusive)
 */
function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}



function sendUplink2(devId, payload) {

    fetch("https://console.thethingsnetwork.org/api/applications/prova_gosdk/devices/" + devId + "/uplink", {
        "credentials": "include",
        "headers":{"accept":"application/json","accept-language":"it,de;q=0.9,en;q=0.8,sr;q=0.7","authorization":"Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI1YmQ0MzZjNjc0MDMwMjAwNDg3MjM5OTUiLCJpc3MiOiJ0dG4tYWNjb3VudC12MiIsImlhdCI6MTU1MTc5MDcxNSwidHlwZSI6InVzZXIiLCJjbGllbnQiOiJ0dG4tY29uc29sZSIsInNjb3BlIjpbImFwcHMiLCJnYXRld2F5cyIsInByb2ZpbGUiLCJjbGllbnRzIl0sImludGVyY2hhbmdlYWJsZSI6dHJ1ZSwidXNlcm5hbWUiOiJpbGVjaXBpIiwiZW1haWwiOiJpbGUuY2VwaWxvdkB1emguY2giLCJjcmVhdGVkIjoiMjAxOC0xMC0yN1QwOTo1ODozMC4yNDZaIiwidmFsaWQiOnRydWUsIl9pZCI6IjViZDQzNmM2NzQwMzAyMDA0ODcyMzk5NSIsImV4cCI6MTU1MTc5NDM3NX0.YIrc27C48vFD3NgI4BAq5UL07yPT7XPZyoCU8ATn0S3p1I9uiFHrTuRWCbGbzEqJ-W0r_6_42d4Py77UCG0PVwUpMDCPz02-v-dX0uKDJQ8_LqAocv2VRIuefK6u5RrWT2odpvXxALNigDvCKIik4LNZuz7lFnC8bp44RI0gVFvwj28WVfaEpk573VmPRsn8kzq7jbDxrgVVu5VOUXtxhhQElFpBUcLahDlkpKt4EKaZ34j6bzEHOcdJ2z6rNFB-qJoakOwH1tmgg5dCixARf1eDnVLbcmjw5icMBX2TXadTKQupFRL6pZ-f66PXo7nMQFpb91V_HDTjIpmQpGUTgaExa4u1_OVBLcTCbMU0dxg7OdFJMcskjZs2QZsi7UeGJ4G_l-rB80UHfq-GfZ8CLPqvIwKfkMXz8ySYMMPay9-HU9kCbIcH6OAOUmSC91sp04SddQmooOz6Ov7oW-AEMa7bTdVAT7dUuqf8gM50EOZ0cBShIwS8RNWMnX3yTkvrg1Jitvn6DKloJz_KEKavZDAIXS1WTA7oC8Jjo9XsLjPX_h7Kz_JOg90OcwPz170D9SQPSwQYWF6fT18gg9vS99KZABRzW-1GrqNjhXuocKBlEfkMnbaZga5AxdiUkUmhh5-JOeo0VjpnVrH93U8hvWbPYjEezWiGkeGyaykXEK4","content-type":"application/json","x-version":"v2.6.11"},"referrer": "https://console.thethingsnetwork.org/applications/prova_gosdk/devices/arduinomega3_sf7",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": "{\"fport\":1,\"payload\":\"" + payload.toUpperCase() + "\"}",
        "method": "POST",
        "mode": "cors"
    });

}


