'use strict';

const express = require('express');
const router = express.Router();
const eth = require('../../lib/eth');
const ethapi = require('../../lib/eth-api');
//const query = require('../../lib/Query');
const util = require('util');
const moment = require('moment');
const fs = require('fs');
const gremlin = require('../../lib/gremlin');

exports.checkBlock = function () {
    (async () => {
        try {
            // 1. 현재까지 가져온 블록번호 읽어오기
            let currNum = await readBlockNumber();
            console.log('* curr blockNum : ' + currNum);

            //  2. 최신 블록번호 읽어오기!
            let latestNum = await ethapi.getBlockNumber();
            currNum = Number(currNum)
            if(latestNum.result > currNum + 10000) {
              latestNum.result = currNum  + 10000;
            }

            if (!latestNum) {
                return next({
                    'status': 400,
                    'message': '최신 블록넘버를 읽어올 수 없습니다.'
                });
            }
            console.log('* latest blockNum : ' + latestNum.result);

            // 3. 블록 크롤링
            let hashList = await crawler(currNum, latestNum.result);
            if (hashList) {
                console.log(' * hash list : '+ hashList);
            }

        } catch (e) {
            console.error(e);
        }
    })();
};


function readBlockNumber() {
    return new Promise(function(resolve, reject) {
        const file = './batch.curr';
        fs.readFile(file, 'utf8', function(error, data) {
            if (error) {
                console.log("없음")
                reject(0);
            } else {
                console.log("있음" + data)
                resolve(data);
            }
        });
    });
}

function writeBlockNumber(latest) {
    return new Promise(function(resolve, reject) {
        const file = './batch.curr';
        fs.writeFile(file, latest, 'utf8', function(error) {
            if (error) {
                reject(0);
            } else {
                resolve(latest);
            }
        });
    });
}


async function crawler(curr, latest) {
    //let init = await gremlin.dropGraph();

    console.log("* curr : " + curr + ", " + " latest : " + latest);
    for (var i = Number(curr)+1  ; i <= Number(latest) ; i++) {
        let block = await ethapi.getBlock(i);
        //console.log(block.result);

        let ret = await writeBlockNumber(i);

        for(var j=0;j<block.result.transactions.length;j++)
        {

            let txHash = block.result.transactions[j];
            let log = await ethapi.getTransaction(txHash);
            if (log)
            {
              //console.log(block.result.timestamp);
              //console.log(log.result.from);
              //console.log(log.result.to);
              //console.log(log.result.value);
              console.log("* --- 블록번호 --- :" + i);
            }

            let id1 = await gremlin.addVertex(log.result.from);
            if (id1) {
              console.log(id1);
            }
            let id2 = await gremlin.addVertex(log.result.to);
            if (id2) {
              console.log(id2);
            }
            let ret = await gremlin.addEdge(id1, id2, log.result.value, block.result.timestamp);
            if (ret) {
              //console.log(ret);
            }
        }
    }
    let ret2 = await gremlin.countVertices();
    let ret3 = await gremlin.drawGraph();
    //let ret4 = await gremlin.finish();
}