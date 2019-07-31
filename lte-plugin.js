const PORT = 5000;
const HOST = '192.168.0.223';
const port = 5000;
const host = '192.168.2.213';
const tou8 = require('buffer-to-uint8array');
var ed25519 = require('ed25519');
const Buffer = require('buffer').Buffer;
const sha = require('js-sha3');
const bigInt = require("big-integer");

const dgram = require('dgram');
const server = dgram.createSocket('udp4');

const message2 = new Buffer('My KungFu is Good!');

const client = dgram.createSocket('udp4');

// const net = require('net');
// try {
// const server = net.createServer();
// server.listen(PORT, HOST, () => {
//     console.log('TCP Server is running on port ' + PORT +'.');
// });
//
// let sockets = [];
//
// server.on('connection', function(sock) {
//     console.log('CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort);
//     sockets.push(sock);
//
//     sock.on('data', function(data) {
//         console.log('DATA ' + sock.remoteAddress + ': ' + data);
//         // Write the data back to all the connected, the client will receive it as data from the server
//         sockets.forEach(function(sock, index, array) {
//             sock.write(sock.remoteAddress + ':' + sock.remotePort + " said " + data + '\n');
//         });
//     });
//
//     // Add a 'close' event handler to this instance of socket
//     sock.on('close', function(data) {
//         let index = sockets.findIndex(function(o) {
//             return o.remoteAddress === sock.remoteAddress && o.remotePort === sock.remotePort;
//         })
//         if (index !== -1) sockets.splice(index, 1);
//         console.log('CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort);
//     });
// });

// const client = new net.Socket();
//
//
//     client.connect(port, host, function () {
//         console.log('Connected');
//         client.write("Hello From Client " + client.address().address);
//     });
//
//     client.on('data', function (data) {
//         console.log('Received: ' + data);
//         // client.destroy(); // kill client after server's response
//     });
//
//     client.on('close', function () {
//         console.log('Connection closed');
//     });
// }
// catch (e ){
// 	console.log(e);
// }


let isFirstTime= true
server.on('listening', function() {
	var address = server.address();
	console.log('UDP Server listening on ' + address.address + ':' + address.port);
});

let IoTPort ='';
let IoTAddress = '';

let  publicKey = [];
let signature = [];
let walletPubKey = [];
let txFee = [];
let txCnt = [];
let header = [];
let data = [];
let counter =0
function toByteArray(hexString) {
    let result = []
    while (hexString.length >= 2) {
        result.push(parseInt(hexString.substring(0, 2), 16));
        hexString = hexString.substr(2, hexString.length)
    }
    return result;
}
server.on('message', function(message, remote) {
	//console.log(remote.address + ':' + remote.port +' - ' + message2);
	if(true){
		try {
            IoTAddress = remote.address;
            IoTPort = remote.port;
            console.log(IoTAddress,':',IoTPort);
            console.log(counter++,'--->',message.length)
			let test = bigInt(message.toString('hex'),16).toArray(9);
            console.log(message);
            //console.log(remote);
			//console.log('MESSAGE HEX', message.length, message);
			// let msg = JSON.parse(message.toString())
			// console.log(message.length)
			// console.log(message.toString());
			// if(msg.hasOwnProperty('pK')){
			// 	console.log("PubKey received");
			// 	publicKey = tou8(msg.pK);
			// }else if(msg.hasOwnProperty('signature')){
			// 	signature = tou8(msg.signature);
			// 	walletPubKey = tou8(msg.walletPubKey);
			// 	txCnt = tou8(msg.txCnt);
			// 	txFee = tou8(msg.txFee);
			// 	header = tou8(msg.header);
			// 	data = tou8(msg.data)
			// 	console.log("to verify....")
			//
			// 	let toVerify = Buffer.concat([
			// 		Buffer.from(walletPubKey),
			// 		Buffer.from(tou8(msg.publicKey)),
			// 		Buffer.from(txCnt),
			// 		Buffer.from(txFee),
			// 		Buffer.from(header),
			// 		Buffer.from(data)
			// 	]);
			// 	console.log("To verify", toVerify);
			// 	console.log("tx hash....")
			// 	let txHash = Buffer.from(sha.sha3_256(toVerify),'HEX');
			// 	console.log("hash:",txHash,"\nsignature:",Buffer.from(signature),"\npubKey",Buffer.from(publicKey) )
			// 	isValid = ed25519.Verify(txHash, Buffer.from(signature), Buffer.from(publicKey));
			// 	console.log("IS VALID", isValid)
			// }
			// if(message.toString().includes('pK')){
			// 	console.log("pK");
			// 	console.log(JSON.parse(message).pK)
			// }else if(message.toString().endsWith('data')){
			// 	console.log("data");
			// 	console.log(message.toString())
			// }else if(message.toString().endsWith('sig')){
			// 	console.log("signature");
			// }
			// try{
			// 	const asd = JSON.parse(message.toString());
			// 	console.log(asd.length,"----", message.length)
			// }catch(e){
			// 	console.log("errore", e)
			// }

            //console.log('MESSAGE STRING', message.length, message.toString());
            //console.log('MESSAGE ', message.length, message);

            console.log('_____________________________________________________')
            //sendData();
			// client.send(message2, 0, message2.length, remote.port, remote.address, function (err, bytes) {
			// 	console.log("SEND BUFFER")
			//
			// });
		}catch(e){
			console.error('error', e)
		}
	}
});

async function sendData(){

		for(let i=0;i<5;i++){
				client.send("UZH", 0, "UZH".length, IoTPort, IoTAddress, function (err, bytes) {
					console.log('UDP message sent ', i, "UZH", 0, "UZH".length, IoTPort, IoTAddress);
				});
				client.send(message2, 0, message2.length, '5000', IoTAddress, function (err, bytes) {
					console.log('UDP message sent ', i, "UZH", 0, "UZH".length, IoTPort, IoTAddress);
				});
			await sleep(2000);

		}
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

server.bind(PORT, HOST);