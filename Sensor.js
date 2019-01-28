var ed25519 = require('ed25519');

class Sensor {

    constructor(devId) {
        this._publicKey = null;
        this._signature = null;
        this._counter = 0;
        this._data = null;
        this._packetReceived = [];
        this._devId = devId;

    }

    print() {
        console.log(this._devId, this._publicKey, this._signature);
    }

    verifyData() {
        if (!!this.data && !!this.signature && !!this.publicKey) {
            if (ed25519.Verify(this.data, this.signature, this.publicKey)) {
                console.log(`[${this.devId}] signature is valid`);
            } else {
                console.log(`[${this.devId}] signature is NOT valid`);
            }
        }
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
}

module.exports = Sensor;