const BLOCKCHAIN_CLIENT_IP = 'http://localhost:8010'
const WALLET = 'WalletA.txt'
const fs = require('fs')
const Buffer = require('buffer').Buffer;
const {promisify} = require('util');
const readFile = promisify(fs.readFile)
const fetch = require('node-fetch');
var ed25519 = require('ed25519');
const tou8 = require('buffer-to-uint8array');


class Blockchain {

    constructor() {
        this._rootWallet = null;
        this.getPrivKey = async () => {
            const data = await readFile(WALLET);
            return this.getPrivKeyFromFile(data)

        }
        this.txCnt = 0;
    }

    sendData(sensor, toWallet) {
        const body = {
                DevId: sensor.devId,
                PublicKey: [...sensor.publicKey],
                Data: [...sensor.data],
                Signature: [...sensor.signature],
                TxCnt: sensor.txCnt,
                TxHash: [...sensor.txHash],
                TxFee: sensor.txFee,
                To: toWallet,
            }
        ;
        // console.log(body)
        fetch(`${BLOCKCHAIN_CLIENT_IP}/sendTxIoT`, {
            method: 'post',
            body: JSON.stringify(body),
            headers: {'Content-Type': 'application/json'},
        }).then(()=>{

        })
            .catch(() => { })//console.log('error ->',sensor.counter)})
        //.then(res => res.json())
    }

    async isAccountCreated(sensor) {
        let pubKeyHex = sensor.publicKey.toString('hex')
        fetch(`${BLOCKCHAIN_CLIENT_IP}/account/${pubKeyHex}`, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
        })
        .then(res => res.json())
            .then((data) => {
                if(!!data.content&&!!data.content[0]&&data.content[0].detail){
                    const {address} = data.content[0].detail;
                    return address.slice(0,20) ===pubKeyHex.slice(0,20)

                }
            });
        return false;
    }


    getPrivKeyFromFile(data) {
        const keys = data.toString().split('\n');
        const privKeyTmp = keys[1] + keys[2];
        return this.toByteArray(privKeyTmp);
    }

    toByteArray(hexString) {
        let result = []
        while (hexString.length >= 2) {
            result.push(parseInt(hexString.substring(0, 2), 16));
            hexString = hexString.substr(2, hexString.length)
        }
        return result;
    }

    getPubKeyFromPrivKey(privKey) {
        if (privKey.length == 64) {
            return privKey.slice(32)
        }
    }

    async createNewAccount(sensor) {
        const privKey = await this.getPrivKey();
        const pubKey = this.getPubKeyFromPrivKey(privKey);
        let txHash;
        const body = {
                DevId: sensor.devId,
                PublicKey: [...sensor.publicKey],
                Issuer: [...pubKey],
                Fee: 200,
                txCnt: sensor.txCnt,
            }
        ;
        //First create an Account TX
        await fetch(`${BLOCKCHAIN_CLIENT_IP}/createAccTxIoT`, {
            method: 'post',
            body: JSON.stringify(body),
            headers: {'Content-Type': 'application/json'},
        }).then((resp) => resp.json())
            .then((data) => {
                txHash = Buffer.from(data.content[0].detail.toString(), 'HEX');
            }).catch((err)=>{console.log("ERR", err)})
        let sign;
        if (!txHash) {
            return
        }
        sign = ed25519.Sign(txHash, tou8(privKey));

        this.sendAccTx(txHash,sign)
    }

    async sendAccTx(txHash, sign){

        const uri = `${BLOCKCHAIN_CLIENT_IP}/sendAccTx/${txHash.toString('hex')}/${sign.toString('hex')}`;
        //Then Send Acc Tx to the blockchain
        if (!sign) {
            return
        }
        await fetch(uri, {
            method: 'post',
            body: '',
            headers: {'Content-Type': 'application/json'},
        })
    }

    get rootWallet() {
        return this._rootWallet;
    }

    set rootWallet(value) {
        this._rootWallet = value;
    }

    async sendFunds(sensor, amount) {
        const privKey = await this.getPrivKey();
        const pubKey = Buffer.from(this.getPubKeyFromPrivKey(privKey), 'HEX');
        let txHash;
        const body = {
                DevId: sensor.devId,
                ToPubKey: [...sensor.publicKey],
                FromPubKey: [...pubKey],
                txCnt: this.txCnt,
                Fee: 200,
                Amount: amount,
            }
        ;
        //First create an Account TX
        await fetch(`${BLOCKCHAIN_CLIENT_IP}/createFundsTxIoT`, {
            method: 'post',
            body: JSON.stringify(body),
            headers: {'Content-Type': 'application/json'},
        }).then((resp) => resp.json())
            .then((data) => {
                txHash = Buffer.from(data.content[0].detail.toString(), 'HEX');
            })
        let sign;
        if (!!txHash) {
            sign = ed25519.Sign(txHash, tou8(privKey));
            this.sendFundsTx(txHash, sign);
        }
    }

    async sendFundsTx(txHash, sign){
        const uri = `${BLOCKCHAIN_CLIENT_IP}/sendFundsTx/${txHash.toString('hex')}/${sign.toString('hex')}`;
        //Then Send Funds Tx to the blockchain
        if (!!sign) {
            await fetch(uri, {
                method: 'post',
                body: '',
                headers: {'Content-Type': 'application/json'},
            })
            //this.txCnt++;
        }
    }
}

module.exports = Blockchain;