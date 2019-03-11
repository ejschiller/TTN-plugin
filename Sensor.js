var ed25519 = require('ed25519');
let winston = require('winston');
const Blockchain = require('./api/Blockchain');

const bc = new Blockchain();
const MIN_AMOUNT = 1000;
const TIME_MINED_BLOCK = 3*60*1000



class Sensor {

    constructor(devId) {
        this._publicKey = null;
        this._signature = null;
        this._counter = 0;
        this._data = null;
        this._packetReceived = [];
        this._devId = devId;
        this._txCnt = 0;
        this._walletCreated = false;
        this._txHash = null;

        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(info => {
                    return `${info.timestamp} ${info.level}: ${info.message}`;
                })
            ),
            transports: [new winston.transports.Console(),
                new winston.transports.File({filename: `log/${devId}.log`})]
        });

    }


    log(info, message){
        this.logger.log(info,message);
    }

    async verifyData() {
        let isValid;
        if (!!this.data && !!this.signature && !!this.publicKey) {
            isValid = ed25519.Verify(this.data, this.signature, this.publicKey);
            if (isValid) {
                await bc.sendData(this);
                this.log('info', `${this.devId} signature is valid  publicKey: [${this.publicKey.toString('hex')}], signature: [${this.signature.toString('hex')}], data: ${this.data.toString('hex')}, size: ${this.data.length}`)

            } else {
                this.log('info', `${this.devId} signature is NOT valid  publicKey: [${this.publicKey.toString('hex')}], signature: [${this.signature.toString('hex')}], data: ${this.data.toString('hex')}, size: ${this.data.length}`)

            }
        }
        this.resetParameters();
        return isValid;

    }

    resetParameters() {
        console.log(`[${this.devId}] resetting parameters to default`);
        this._signature = null;
        this._counter = 0;
        this._data = null;
        this._packetReceived = [];
    }

    get devId() {
        return this._devId;
    }

    set devId(value) {
        this._devId = value;
    }

    get publicKey() {
        return this._publicKey;
    }

    set publicKey(value) {
        //this.resetParameters();
        this._publicKey = value;
    }

    get signature() {
        return this._signature;
    }

    set signature(value) {
        this._signature = value;
    }

    get data() {
        return this._data;
    }

    set data(value) {
        this._data = value;
    }

    get packetReceived() {
        return this._packetReceived;
    }

    set packetReceived(value) {
        this._packetReceived = value;
    }

    get counter() {
        return this._counter;
    }

    set counter(value) {
        this._counter = value;
    }

    get txCnt() {
        return this._txCnt;
    }

    set txCnt(value) {
        this._txCnt = value;
    }

    get walletCreated() {
        return this._walletCreated;
    }

    set walletCreated(value) {
        this._walletCreated = value;
    }

    get txHash() {
        return this._txHash;
    }

    set txHash(value) {
        this._txHash = value;
    }
    async instantiateWallet(){
        if(!this.walletCreated){
            //Check if account is present in the blockchain
           let createdInBC = await bc.isAccountCreated(this);

           //if not created, instantiate a new one
           if(!createdInBC){
               //await bc.createNewAccount(this);
               //await sleep(TIME_MINED_BLOCK)
               //await bc.sendFunds(this, MIN_AMOUNT)
           }
           else{
               //await bc.sendFunds(this, MIN_AMOUNT)
               this.walletCreated = true;
           }
        }
    }
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
module.exports = Sensor;