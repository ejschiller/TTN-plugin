const WALLET = 'Wallet.txt'
const SEED = 'Seed.txt';
const fs = require('fs')
const Buffer = require('buffer').Buffer;
const {promisify} = require('util');
const readFile = promisify(fs.readFile);
var ed25519 = require('ed25519');



async function main(){
    const seed = await readFile(SEED);
    const keyPair = ed25519.MakeKeypair(Buffer.from(seed.toString().substring(0, 64),'hex'));
    const pubKeyHex = keyPair.publicKey.toString('hex');
    const privKeyHex = keyPair.privateKey.toString('hex');

    //Now write to file
    fs.appendFileSync(WALLET, pubKeyHex+'\n');
    fs.appendFileSync(WALLET, privKeyHex.substring(0,64)+'\n');
    fs.appendFileSync(WALLET, privKeyHex.substring(64,128));
}

main()