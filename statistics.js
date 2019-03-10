const {promisify} = require('util');
const fs = require('fs');
const readFile = promisify(fs.readFile);



const folders = ['Sleep_logs_400','Sleep_logs_800','Sleep_logs_1200','Sleep_logs_1600',
                'Sleep_logs_400_Size','Sleep_logs_800_Size','Sleep_logs_1200_Size','Sleep_logs_1600_Size',
                'Sleep_logs_Stress'];


async function getStatistics() {
    for (let i = 0; i < folders.length; i++) {
        const name = folders[i].substring(6,15);
        const searchTerm = 'blockchainparam.go:69:'
        let file = await readFile(`Simulations/${folders[i]}/LoggerMiner.log`,'utf8');
        let filteredFile=[];
        let fileToArray = file.toString().split('\n')
        fileToArray.forEach((line)=>{
            if(line.includes(searchTerm)&&!line.includes('NumberIoTTransactions 0;')){
                filteredFile.push(line)
            }
        });
        let blocks = [];
        filteredFile.forEach((line)=>{
            let block = line.substring(56,).split(';')
            const blockTime = parseFloat(block[0].split(' ')[1]);
            const transactions = parseFloat(block[1].split(' ')[1]);
           blocks.push({blockTime,transactions})
        })
        let totalTime = 0;
        let totalTransactions = 0;
        blocks.forEach((block)=>{
            totalTime+= block.blockTime;
            totalTransactions += block.transactions
        })

        const testRuns = 4;
        const txPerSecond = ((totalTransactions/testRuns)/(totalTime/testRuns)).toFixed(2);
        const averageTimeElapsed = (totalTime/testRuns).toFixed(2);
        const averageTotalTransactions = (totalTransactions/testRuns).toFixed(2);
        const averageBlockLength = (blocks.length/testRuns).toFixed(2);
        const averageTimePerBlock = (totalTime/blocks.length).toFixed(2);
        const averageNumerTxPerBlock = (averageTotalTransactions/averageBlockLength).toFixed(2);


        console.log(`${name}\t-> Tx/s_: ${txPerSecond}\t Average time elapsed: ${averageTimeElapsed}\t Total Nr of IoT Transactions: ${averageTotalTransactions}\t Avg Tx/Block: ${averageNumerTxPerBlock}\t Avg number of blocks: ${averageBlockLength}\t Average time per block: ${averageTimePerBlock}`)


    }
}

getStatistics()