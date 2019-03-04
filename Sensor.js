var ed25519 = require('ed25519');
let winston = require('winston');



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

    print() {
        console.log(this._devId, this._publicKey, this._signature);
    }

    log(info, message){
        this.logger.log(info,message);
    }

    verifyData() {
        let isValid;
        if (!!this.data && !!this.signature && !!this.publicKey) {
            isValid = ed25519.Verify(this.data, this.signature, this.publicKey);
            if (isValid) {
                this.log('info', `${this.devId} signature is valid  publicKey: [${this.publicKey.toString('hex')}], signature: [${this.signature.toString('hex')}], data: ${this.data.toString('hex')}, size: ${this.data.length}`)

            } else {
                // console.log(`[${this.devId}] signature is NOT valid`);
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
        this.resetParameters();
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
}

module.exports = Sensor;