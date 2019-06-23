//Without own Gateway
// let test1 = [{"publicKey":2,"sign1":3,"sign2":1,"dataPackets":1,"alreadyReceivedDataPackets":0,"downLink":7},{"publicKey":1,"sign1":3,"sign2":2,"dataPackets":1,"alreadyReceivedDataPackets":2,"downLink":9},{"publicKey":3,"sign1":3,"sign2":2,"dataPackets":1,"alreadyReceivedDataPackets":2,"downLink":11},{"publicKey":3,"sign1":1,"sign2":2,"dataPackets":1,"alreadyReceivedDataPackets":2,"downLink":9},{"publicKey":2,"sign1":2,"sign2":1,"dataPackets":1,"alreadyReceivedDataPackets":2,"downLink":8},{"publicKey":1,"sign1":3,"sign2":2,"dataPackets":1,"alreadyReceivedDataPackets":2,"downLink":9},{"publicKey":2,"sign1":1,"sign2":3,"dataPackets":1,"alreadyReceivedDataPackets":0,"downLink":7},{"publicKey":3,"sign1":3,"sign2":1,"dataPackets":1,"alreadyReceivedDataPackets":0,"downLink":8},{"publicKey":1,"sign1":2,"sign2":2,"dataPackets":1,"alreadyReceivedDataPackets":1,"downLink":7},{"publicKey":2,"sign1":1,"sign2":3,"dataPackets":1,"alreadyReceivedDataPackets":1,"downLink":8}]
// let test2 = [{"publicKey":2,"sign1":1,"sign2":3,"dataPackets":2,"alreadyReceivedDataPackets":1,"downLink":9},{"publicKey":1,"sign1":2,"sign2":1,"dataPackets":2,"alreadyReceivedDataPackets":2,"downLink":8},{"publicKey":1,"sign1":2,"sign2":2,"dataPackets":2,"alreadyReceivedDataPackets":5,"downLink":12},{"publicKey":1,"sign1":1,"sign2":1,"dataPackets":2,"alreadyReceivedDataPackets":1,"downLink":6},{"publicKey":3,"sign1":1,"sign2":2,"dataPackets":2,"alreadyReceivedDataPackets":2,"downLink":10},{"publicKey":2,"sign1":3,"sign2":1,"dataPackets":2,"alreadyReceivedDataPackets":2,"downLink":10},{"publicKey":2,"sign1":2,"sign2":2,"dataPackets":2,"alreadyReceivedDataPackets":2,"downLink":10},{"publicKey":3,"sign1":2,"sign2":1,"dataPackets":2,"alreadyReceivedDataPackets":0,"downLink":8},{"publicKey":3,"sign1":3,"sign2":2,"dataPackets":2,"alreadyReceivedDataPackets":2,"downLink":12},{"publicKey":2,"sign1":3,"sign2":3,"dataPackets":2,"alreadyReceivedDataPackets":0,"downLink":10},{"publicKey":2,"sign1":3,"sign2":1,"dataPackets":2,"alreadyReceivedDataPackets":3,"downLink":11}]
// let test4 = [{"publicKey":1,"sign1":3,"sign2":1,"dataPackets":4,"alreadyReceivedDataPackets":7,"downLink":16},{"publicKey":1,"sign1":1,"sign2":2,"dataPackets":4,"alreadyReceivedDataPackets":2,"downLink":10},{"publicKey":1,"sign1":2,"sign2":2,"dataPackets":4,"alreadyReceivedDataPackets":2,"downLink":11},{"publicKey":2,"sign1":1,"sign2":1,"dataPackets":4,"alreadyReceivedDataPackets":1,"downLink":9},{"publicKey":1,"sign1":1,"sign2":2,"dataPackets":4,"alreadyReceivedDataPackets":3,"downLink":11},{"publicKey":2,"sign1":2,"sign2":2,"dataPackets":4,"alreadyReceivedDataPackets":3,"downLink":13},{"publicKey":2,"sign1":1,"sign2":2,"dataPackets":4,"alreadyReceivedDataPackets":3,"downLink":12},{"publicKey":1,"sign1":2,"sign2":2,"dataPackets":4,"alreadyReceivedDataPackets":3,"downLink":12},{"publicKey":1,"sign1":2,"sign2":2,"dataPackets":4,"alreadyReceivedDataPackets":2,"downLink":11},{"publicKey":2,"sign1":1,"sign2":1,"dataPackets":4,"alreadyReceivedDataPackets":3,"downLink":11},{"publicKey":2,"sign1":1,"sign2":1,"dataPackets":4,"alreadyReceivedDataPackets":3,"downLink":11}]
// let test8 = [{"publicKey":2,"sign1":1,"sign2":1,"dataPackets":8,"alreadyReceivedDataPackets":4,"downLink":16},{"publicKey":1,"sign1":1,"sign2":2,"dataPackets":8,"alreadyReceivedDataPackets":3,"downLink":15},{"publicKey":2,"sign1":2,"sign2":2,"dataPackets":8,"alreadyReceivedDataPackets":6,"downLink":20},{"publicKey":1,"sign1":2,"sign2":2,"dataPackets":8,"alreadyReceivedDataPackets":5,"downLink":18},{"publicKey":1,"sign1":1,"sign2":2,"dataPackets":8,"alreadyReceivedDataPackets":4,"downLink":16},{"publicKey":1,"sign1":2,"sign2":1,"dataPackets":8,"alreadyReceivedDataPackets":4,"downLink":16},{"publicKey":3,"sign1":2,"sign2":3,"dataPackets":8,"alreadyReceivedDataPackets":7,"downLink":23},{"publicKey":3,"sign1":3,"sign2":1,"dataPackets":8,"alreadyReceivedDataPackets":8,"downLink":23},{"publicKey":3,"sign1":4,"sign2":3,"dataPackets":8,"alreadyReceivedDataPackets":12,"downLink":30},{"publicKey":3,"sign1":2,"sign2":2,"dataPackets":8,"alreadyReceivedDataPackets":8,"downLink":23}]
//let test16 = [{"publicKey":2,"sign1":2,"sign2":3,"dataPackets":16,"alreadyReceivedDataPackets":22,"downLink":45},{"publicKey":1,"sign1":3,"sign2":3,"dataPackets":16,"alreadyReceivedDataPackets":17,"downLink":40},{"publicKey":1,"sign1":3,"sign2":1,"dataPackets":16,"alreadyReceivedDataPackets":14,"downLink":35},{"publicKey":2,"sign1":2,"sign2":2,"dataPackets":16,"alreadyReceivedDataPackets":21,"downLink":43},{"publicKey":2,"sign1":2,"sign2":3,"dataPackets":16,"alreadyReceivedDataPackets":20,"downLink":43},{"publicKey":3,"sign1":3,"sign2":1,"dataPackets":16,"alreadyReceivedDataPackets":24,"downLink":47},{"publicKey":6,"sign1":2,"sign2":2,"dataPackets":16,"alreadyReceivedDataPackets":16,"downLink":42},{"publicKey":2,"sign1":1,"sign2":5,"dataPackets":16,"alreadyReceivedDataPackets":25,"downLink":49},{"publicKey":1,"sign1":3,"sign2":2,"dataPackets":16,"alreadyReceivedDataPackets":16,"downLink":38},{"publicKey":1,"sign1":1,"sign2":2,"dataPackets":16,"alreadyReceivedDataPackets":5,"downLink":25},{"publicKey":1,"sign1":2,"sign2":2,"dataPackets":16,"alreadyReceivedDataPackets":6,"downLink":27}]

//With own Gateway
let test1 = [{"publicKey":1,"sign1":2,"sign2":1,"dataPackets":1,"alreadyReceivedDataPackets":1,"downLink":6},{"publicKey":1,"sign1":1,"sign2":2,"dataPackets":1,"alreadyReceivedDataPackets":2,"downLink":7},{"publicKey":1,"sign1":1,"sign2":2,"dataPackets":1,"alreadyReceivedDataPackets":1,"downLink":6},{"publicKey":1,"sign1":2,"sign2":1,"dataPackets":1,"alreadyReceivedDataPackets":0,"downLink":5},{"publicKey":2,"sign1":1,"sign2":1,"dataPackets":1,"alreadyReceivedDataPackets":0,"downLink":5},{"publicKey":2,"sign1":1,"sign2":1,"dataPackets":1,"alreadyReceivedDataPackets":1,"downLink":6},{"publicKey":1,"sign1":2,"sign2":2,"dataPackets":1,"alreadyReceivedDataPackets":1,"downLink":7},{"publicKey":2,"sign1":1,"sign2":1,"dataPackets":1,"alreadyReceivedDataPackets":1,"downLink":6},{"publicKey":1,"sign1":2,"sign2":2,"dataPackets":1,"alreadyReceivedDataPackets":0,"downLink":6},{"publicKey":2,"sign1":2,"sign2":1,"dataPackets":1,"alreadyReceivedDataPackets":1,"downLink":7},{"publicKey":1,"sign1":2,"sign2":2,"dataPackets":1,"alreadyReceivedDataPackets":0,"downLink":6}]
let test2 = [{"publicKey":3,"sign1":1,"sign2":2,"dataPackets":2,"alreadyReceivedDataPackets":1,"downLink":9},{"publicKey":3,"sign1":2,"sign2":2,"dataPackets":2,"alreadyReceivedDataPackets":0,"downLink":9},{"publicKey":2,"sign1":2,"sign2":2,"dataPackets":2,"alreadyReceivedDataPackets":2,"downLink":10},{"publicKey":1,"sign1":2,"sign2":2,"dataPackets":2,"alreadyReceivedDataPackets":1,"downLink":8},{"publicKey":1,"sign1":1,"sign2":1,"dataPackets":2,"alreadyReceivedDataPackets":0,"downLink":5},{"publicKey":1,"sign1":2,"sign2":2,"dataPackets":2,"alreadyReceivedDataPackets":1,"downLink":8},{"publicKey":1,"sign1":1,"sign2":2,"dataPackets":2,"alreadyReceivedDataPackets":0,"downLink":6},{"publicKey":1,"sign1":2,"sign2":1,"dataPackets":2,"alreadyReceivedDataPackets":1,"downLink":7},{"publicKey":2,"sign1":2,"sign2":1,"dataPackets":2,"alreadyReceivedDataPackets":1,"downLink":8},{"publicKey":1,"sign1":1,"sign2":1,"dataPackets":2,"alreadyReceivedDataPackets":1,"downLink":6}]
let test4 = [{"publicKey":2,"sign1":3,"sign2":1,"dataPackets":4,"alreadyReceivedDataPackets":2,"downLink":12},{"publicKey":2,"sign1":1,"sign2":2,"dataPackets":4,"alreadyReceivedDataPackets":3,"downLink":12},{"publicKey":1,"sign1":2,"sign2":1,"dataPackets":4,"alreadyReceivedDataPackets":2,"downLink":10},{"publicKey":1,"sign1":2,"sign2":1,"dataPackets":4,"alreadyReceivedDataPackets":1,"downLink":9},{"publicKey":1,"sign1":2,"sign2":1,"dataPackets":4,"alreadyReceivedDataPackets":1,"downLink":9},{"publicKey":1,"sign1":1,"sign2":1,"dataPackets":4,"alreadyReceivedDataPackets":1,"downLink":8},{"publicKey":2,"sign1":2,"sign2":3,"dataPackets":4,"alreadyReceivedDataPackets":2,"downLink":13},{"publicKey":1,"sign1":1,"sign2":4,"dataPackets":4,"alreadyReceivedDataPackets":2,"downLink":12},{"publicKey":1,"sign1":2,"sign2":2,"dataPackets":4,"alreadyReceivedDataPackets":1,"downLink":10},{"publicKey":1,"sign1":1,"sign2":1,"dataPackets":4,"alreadyReceivedDataPackets":3,"downLink":10}]
let test8 = [{"publicKey":2,"sign1":1,"sign2":1,"dataPackets":8,"alreadyReceivedDataPackets":4,"downLink":16},{"publicKey":2,"sign1":2,"sign2":1,"dataPackets":8,"alreadyReceivedDataPackets":6,"downLink":19},{"publicKey":4,"sign1":1,"sign2":2,"dataPackets":8,"alreadyReceivedDataPackets":6,"downLink":21},{"publicKey":1,"sign1":2,"sign2":2,"dataPackets":8,"alreadyReceivedDataPackets":8,"downLink":21},{"publicKey":2,"sign1":2,"sign2":2,"dataPackets":8,"alreadyReceivedDataPackets":4,"downLink":18},{"publicKey":2,"sign1":1,"sign2":2,"dataPackets":8,"alreadyReceivedDataPackets":8,"downLink":21},{"publicKey":2,"sign1":2,"sign2":2,"dataPackets":8,"alreadyReceivedDataPackets":8,"downLink":22},{"publicKey":1,"sign1":1,"sign2":2,"dataPackets":8,"alreadyReceivedDataPackets":6,"downLink":18},{"publicKey":1,"sign1":2,"sign2":2,"dataPackets":8,"alreadyReceivedDataPackets":3,"downLink":16},{"publicKey":1,"sign1":2,"sign2":1,"dataPackets":8,"alreadyReceivedDataPackets":5,"downLink":17}]
let test16 = [{"publicKey":2,"sign1":2,"sign2":3,"dataPackets":16,"alreadyReceivedDataPackets":10,"downLink":33},{"publicKey":2,"sign1":1,"sign2":1,"dataPackets":16,"alreadyReceivedDataPackets":15,"downLink":35},{"publicKey":2,"sign1":2,"sign2":2,"dataPackets":16,"alreadyReceivedDataPackets":7,"downLink":29},{"publicKey":1,"sign1":1,"sign2":1,"dataPackets":16,"alreadyReceivedDataPackets":6,"downLink":25},{"publicKey":1,"sign1":1,"sign2":1,"dataPackets":16,"alreadyReceivedDataPackets":9,"downLink":28},{"publicKey":1,"sign1":1,"sign2":1,"dataPackets":16,"alreadyReceivedDataPackets":5,"downLink":24},{"publicKey":2,"sign1":1,"sign2":1,"dataPackets":16,"alreadyReceivedDataPackets":2,"downLink":22},{"publicKey":2,"sign1":1,"sign2":1,"dataPackets":16,"alreadyReceivedDataPackets":4,"downLink":24},{"publicKey":1,"sign1":1,"sign2":2,"dataPackets":16,"alreadyReceivedDataPackets":9,"downLink":29},{"publicKey":1,"sign1":2,"sign2":1,"dataPackets":16,"alreadyReceivedDataPackets":9,"downLink":29}]

test1 = test1.slice(0,10)
test2 = test2.slice(0,10)
test4 = test4.slice(0,10)
test8 = test8.slice(0,10)
test16 = test16.slice(0,10)

console.log(test1.length);
console.log(test2.length);
console.log(test4.length);
console.log(test8.length);
console.log(test16.length);

function getAverageTest(tests){
	let averageTest = {
		publicKey:0,
		sign1:0,
		sign2:0,
		dataPackets:0,
		alreadyReceivedDataPackets:0,
		downLink:0
	}

	for(let t of tests){
		for(key of Object.keys(averageTest)){
			averageTest[key]+=t[key]
		}
	}

	for(key of Object.keys(averageTest)){
		averageTest[key] = averageTest[key]/tests.length
	}
	averageTest['signature']=averageTest.sign1+averageTest.sign2
	delete averageTest.sign1;
	delete averageTest.sign2;
	delete averageTest.publicKey;

	console.log(averageTest)
}




getAverageTest(test1)
getAverageTest(test2)
getAverageTest(test4)
getAverageTest(test8)
getAverageTest(test16)