const PORT = 5001;
const HOST = '192.168.0.241';
const port = 5001;
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
	console.log("length", message.length)
	if(false){
		try {
            IoTAddress = remote.address;
            IoTPort = remote.port;
            console.log(IoTAddress,':',IoTPort);
            console.log(counter++,'--->',message.length);

            //const zeroPositions = message.splice(1,nrOfZeros);
			let msg = toByteArray(message.toString('hex'));

			const msgLength = msg.length
			const nrOfZeros = (msg[0] - 1);
			console.log("ZEROS -> ", nrOfZeros);
			const zerosPosition = msg.slice(1, nrOfZeros + 1);


            console.log("Zero length", zerosPosition.length, "---> Zero Positions ", zerosPosition);
            const toSignAndSignature =  msg.slice(1+ nrOfZeros, msg.length-64);
            console.log("toSignAndSignature len", toSignAndSignature.length);
            const pubKey = msg.slice(msgLength -64-1,msgLength -32-1);
            console.log("pubKey len", pubKey.length)
            const walletPubKey = msg.slice(msgLength -32 -1,msgLength-1);
            console.log("wallePubKey len", walletPubKey.length);
			//let test = bigInt(message.toString('hex'),16).toArray(9);

			let overflow = 0;
			let tmpIndex = 0;
			let previousByte = zerosPosition[0];
			for(let i =0; i< zerosPosition.length;i++){
				let tmpByte = zerosPosition[i];
				if(previousByte>tmpByte){
					overflow++;
				}
				previousByte = tmpByte;
				toSignAndSignature[tmpByte+(255*overflow)] = 0;
			}

			const signature = toSignAndSignature.slice(toSignAndSignature.length-96-1, toSignAndSignature.length-32-1);
			console.log("signature len ",signature.length);
			const data = toSignAndSignature.slice(0,toSignAndSignature.length-96-1);
			console.log("data len ",data.length);
			let hardCodedWPK = [103, 39, 245, 29, 180, 20, 70, 224, 64, 38, 31, 91, 8, 141, 50, 148, 74, 224, 178, 225, 169, 244, 123, 236, 151, 62, 207, 117, 150, 236, 214, 154];
			let hardCodedPK = [162, 176, 158, 253, 164, 70, 217, 220, 79, 212, 142, 7, 19, 48, 87, 180, 171, 215, 55, 169, 24, 3, 239, 55, 116, 105, 90, 128, 200, 107, 254, 22];
			const bPubKey = Buffer.from(hardCodedPK);
			const bSignature = Buffer.from(signature);
			const test = Buffer.from(data);
			let WPKtoHash = data.slice(0,32);
			let PKtoHash = data.slice(32,64);
			let toPrint = "";

			//console.log("DATA",data);

			const bData = Buffer.from(data,'HEX');

				console.log("tx hash....")
					let txHash = Buffer.from(sha.sha3_256(bData),'HEX');
					isValid = ed25519.Verify(txHash, Buffer.from(signature), Buffer.from(pubKey));
					console.log("isvalid", isValid)


			for(let a of data){
				toPrint+=a+" ";
			}
			console.log(toPrint)
			//console.log(toByteArray(message.toString('he{}x')));
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