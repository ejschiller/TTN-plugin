var ed25519 = require('ed25519');
let winston = require('winston');
const Buffer = require('buffer').Buffer;
const sha = require('js-sha3');


const MIN_AMOUNT = 1000;
const TIME_MINED_BLOCK = 3 * 60 * 1000


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
        this._txFee = 1;
        this._rootWallet = null;

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

    get txFee() {
        return this._txFee;
    }

    set txFee(value) {
        this._txFee = value;
    }

    get rootWallet() {
        return this._rootWallet;
    }

    set rootWallet(value) {
        this._rootWallet = value;
    }

    log(info, message) {
        this.logger.log(info, message);
    }
    //Verify the transaction to avoid overfloodin the network wit invalid transactions
    async verifyData(rootPubKey, blockchain) {
        let isValid = false;
        if (!!this.data && !!this.signature && !!this.publicKey) {
            let header = new Buffer.alloc(1);
            header.writeInt8(0, 0);

            //The order is very important, they have to be concatenated
            //and thus signed in the same order as in the arduino and in the blockchain
            let txToSign = Buffer.concat([
                Buffer.from(sha.sha3_256(rootPubKey), 'HEX'),
                Buffer.from(sha.sha3_256(this.publicKey), 'HEX'),
                Buffer.from(getInt32Bytes(this.txCnt)),
                Buffer.from(getInt64Bytes(this.txFee)),
                header,
                this.data]);
            this.txHash = Buffer.from(sha.sha3_256(txToSign), 'HEX');

            isValid = ed25519.Verify(this.txHash, this.signature, this.publicKey);
            if (isValid) {
                await blockchain.sendData(this);
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

    async instantiateWallet(blockchain) {
        if (!this.walletCreated) {
            //Check if account is present in the blockchain
            let createdInBC = await blockchain.isAccountCreated(this);

            //if not created, instantiate a new one
            if (!createdInBC) {
                await bc.createNewAccount(this);
                await sleep(TIME_MINED_BLOCK)
                await bc.sendFunds(this, MIN_AMOUNT)
            }
            else {
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