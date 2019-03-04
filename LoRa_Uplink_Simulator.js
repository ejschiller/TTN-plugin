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

    for (let i = 0; i < 10; i++) {
        let tmp = []
        for (let n = 0; n < 40; n++) {
            tmp.push(getRandomArbitrary(0, 200))
        }
        s.dataArray.push(Buffer.from(tmp))
    }
})

const seconds = 15*1000;
for (let s of ttn_sensors) {
    const sensor = sensors.get(s);
    sensor['send'] = async () => {
        let random = getRandomArbitrary(5000, 60000)
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
        "headers": {
            "accept": "application/json",
            "accept-language": "it,de;q=0.9,en;q=0.8,sr;q=0.7",
            "authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI1YmQ0MzZjNjc0MDMwMjAwNDg3MjM5OTUiLCJpc3MiOiJ0dG4tYWNjb3VudC12MiIsImlhdCI6MTU1MTczMzEzNiwidHlwZSI6InVzZXIiLCJjbGllbnQiOiJ0dG4tY29uc29sZSIsInNjb3BlIjpbImFwcHMiLCJnYXRld2F5cyIsInByb2ZpbGUiLCJjbGllbnRzIl0sImludGVyY2hhbmdlYWJsZSI6dHJ1ZSwidXNlcm5hbWUiOiJpbGVjaXBpIiwiZW1haWwiOiJpbGUuY2VwaWxvdkB1emguY2giLCJjcmVhdGVkIjoiMjAxOC0xMC0yN1QwOTo1ODozMC4yNDZaIiwidmFsaWQiOnRydWUsIl9pZCI6IjViZDQzNmM2NzQwMzAyMDA0ODcyMzk5NSIsImV4cCI6MTU1MTczNjc5Nn0.ozUe1Ngamphx2oob5U7REoCXzwgSNl_ewBla_d8b69apeGR58nFvyLn5YH8XpEotaukc5WL3m3Cs3XdwDAWMVFMvVq8wKrf_-wXyPzl7FZJvf43MKv1pcd7W0Dv5-EO2XWbzLsqZYqFJHFM0PMel47ZfiUALMbmaih2R5ZaXle21DGPTwF0CWa2jLC6fedjXiQAwxg_rmk395jGtg2r74tHVvwwbU_VSOowrv5NSwXr6G5SIuduRzLN8oKEz9fpZX9V28jA-ocplGSIinEuJNJYdHnc6qrwPSxc2SY9AG9aU7ksOq4bxQwDYImpssLDGM-bFrnP_9yWB_A7PPT2_9RVUzpdXy7YUE7_omE1pTkx6r_8uoB2Rf_Y4bZ14eFxbTT6kewUKYKvXW9Wz5XA91Kgez2bpw5zLivnKqLEdP0uRmQBZ0tqnegDvy5vKV2P3GxCU_IzgmNk6QPZoQczrAzJyc_rZrdrXzkIIb50uZmaSlA8xLuFMAl65tpMYIWnjjs-7jM-GrbBf0HgWUbn2NhF-47zoazocty-7zNvf4lrO1GuumIGsi7l2Ae7QEqpHnuOZdTfEgU4UFZKe0YxSInKMsSV1tzKv-ar5xB4DKZzrClduDU0RaBsg_gpBsLAXtJpYkKat5yGq50kmJaU2HzUSsmnpjRnZygdIZSiFlSQ",
            "content-type": "application/json",
            "x-version": "v2.6.11"
        },
        "referrer": "https://console.thethingsnetwork.org/applications/prova_gosdk/devices/arduinomega3_sf7",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": "{\"fport\":1,\"payload\":\"" + payload.toUpperCase() + "\"}",
        "method": "POST",
        "mode": "cors"
    });

}





