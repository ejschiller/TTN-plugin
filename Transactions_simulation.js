const fs = require('fs');
const crypto = require('crypto');
const {promisify} = require('util');
const Buffer = require('buffer').Buffer;
var ed25519 = require('ed25519');
const readFile = promisify(fs.readFile)
const Sensor = require('./Sensor');
const Blockchain = require('./api/Blockchain');



const seeds = new Array(10000).fill(undefined).map(() => randomValueHex(64));

function generateSeeds() {

    seeds.forEach((i) => {
        const pubKey = Buffer.from(i, 'HEX');
        const keyPair = ed25519.MakeKeypair(pubKey);
        const data = Buffer.from("TEST");
        const signature = ed25519.Sign(data, keyPair);
        const valid = ed25519.Verify(data, signature, keyPair.publicKey);

        if (!valid) {
            console.log("NOT able to sign");
            process.exit(1);
        }
        fs.appendFileSync("seeds", i + '\n', (err) => {
            if (err) {
                return console.log(err);
            }
        });
    });
    console.log("The file was saved!");

}

async function readSeeds() {
    let seeds = await readFile('seeds');
    return seeds.toString().split('\n');
}

function randomValueHex(len) {
    return crypto
        .randomBytes(Math.ceil(len / 2))
        .toString('hex') // convert to hexadecimal format
        .slice(0, len); // return required number of characters
}


async function main() {
    const seeds = await readSeeds();
    const sensors = [];
    const bc = new Blockchain();

    //Generate seeds from the file
    seeds.slice(99,10000).forEach((seed) => {
            let s = new Sensor;
            s.devId = seed.substr(0, 6);
            s['seed'] = Buffer.from(seed, 'HEX');
            s['keyPair'] = ed25519.MakeKeypair(s.seed);
            s.publicKey = s.keyPair.publicKey;
            s['counter'] = 0;
            s['generateData'] = ()=> {
                s.data = Buffer.from(randomValueHex(80),'HEX')
            }
            s['signData'] = ()=> {
                s.signature = ed25519.Sign(s.data, s.keyPair)
            }
            s['sendData'] = async ()=>{
                bc.sendData(s);
            }
            s['createAccount'] = async ()=>{
                let created = await bc.isAccountCreated(s)
                if(!created) {
                    bc.createNewAccount(s);
                }
            }
            s['sendFunds'] = async ()=>{
                bc.sendFunds(s,10000)
            }
            sensors.push(s);
    });

    const timeBetweenTransactions = 5* 60 * 1000
    generateDataAndSign(sensors)

    //Do it once for initializing
    createNewAccount(sensors);
    //sendFundsToSensors(sensors);
    //sendDataToBc(sensors, timeBetweenTransactions)



}
async function createNewAccount(sensors){
    for(let i=0;i< sensors.length;i++){
        sensors[i].createAccount(sensors[i]);
        await sleep(2000);
    }
}
async function sendFundsToSensors(sensors){
    for(let i=0;i< sensors.length;i++){
        console.log("SEND FUNDS");
        sensors[i].sendFunds();
        await sleep(3000);
    }
    }


async function sendDataToBc(sensors, timeout, counter=0){
    const startTime = new Date();
    sensors.forEach(async (sensor)=>{
        if(new Date() - startTime <1000){
            sensor.counter= counter++;
            sensor.sendData(sensor);
        }

    })
    console.log(counter)
    // setInterval(async ()=>{
    //     await generateDataAndSign(sensors);
    //     sensors.forEach(async (sensor)=>{
    //         sensor.sendData();
    //
    //     })
    // },timeout)

}



function generateDataAndSign(sensors){
    sensors.forEach((s)=>{
        s.generateData();
        s.signData()
    })
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

//generateSeeds()
main();