const ttn = require("ttn");


const PORT = 5000;
const HOST = '192.168.0.215';

const dgram = require('dgram');
const server = dgram.createSocket('udp4');

const message2 = new Buffer('My KungFu is Good!');

const client = dgram.createSocket('udp4');

let isFirstTime= true
server.on('listening', function() {
	var address = server.address();
	console.log('UDP Server listening on ' + address.address + ':' + address.port);
});

let IoTPort ='';
let IoTAddress = ''

server.on('message', function(message, remote) {
	console.log(remote.address + ':' + remote.port +' - ' + message2);
	if(true){
		try {
			client.send(message2, 0, message2.length, remote.port, remote.address, function (err, bytes) {

				IoTAddress = remote.address;
				IoTPort = remote.port;
				console.log(IoTAddress,':',IoTPort);
				console.log(remote)
				sendData();
			});
			console.log('asd')
		}catch(e){
			console.error('error')
		}
	}
});

async function sendData(){

		for(let i=0;i<100;i++){
				client.send(message2, 0, message2.length, IoTPort, IoTAddress, function (err, bytes) {
					console.log('UDP message sent ', i);
				});
			await sleep(2000);

		}
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

server.bind(PORT, HOST);