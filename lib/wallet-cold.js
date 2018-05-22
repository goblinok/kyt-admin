'use strict';

var express = require('express');
var router = express.Router();
const query = require('./Query');
const util = require('util');
const admin_account = "cec7773e626a729ee2533c946f29c0d6dfb71174"; // 관리자 주소

//-----------------------------
// TODO :  프로모션 대상 선정
//  icoNO: 1 (블루웨일)
//----------------------------
var icoNo = 1;
var symbol = 'BWX';
var balanceFinalList;

exports.handleWallet = function () {
  (async () => {
    try {

      // 1. ICO 읽어오기
      if (!icoNo)
      {
        // 1. ICO 읽어오기
        console.log('STEP1');
        let sql = "";
        sql += "SELECT * ";
        sql += "FROM TB_ICO ";
        sql += "WHERE siteOpen = 1 ";
        sql += "ORDER BY icoNo DESC LIMIT 1 ";
        const ico = await query.findOne(sql);
        if (!ico) {
          return next({
            'status': 400,
            'message': 'ICO 정보를 찾을 수 없습니다.'
          });
        }
        const ico = await query.findOne(sql);
        if (!ico) {
          console.error('ico 대상이 없습니다.');
          return;
        }
        const icoNo = ico.icoNo;
        const symbol = ico.symbol;
      }

      // 2. 유저 정보 가져오기
      console.log('STEP2');
      const userList = await query.find('SELECT * FROM TB_USER_ETH_ACCOUNT WHERE symbol = :symbol', {'symbol': symbol});
      //console.log('userList = ' + util.inspect());
      if (!userList) {
        console.error('유저를 찾을 수 없습니다.');
        return;
      }

      // 3. 유저의 geth지갑 잔액 확인후, DB에 잔액을 업데이트하고 'CACHE' 상태로 변경한다.
      console.log('STEP3');
      const retCheck = await checkUserBalance(userList);
      console.log(retCheck);

      // 메모리에서 유저 정보를 꺼내어, 관리자 계좌로 이체한다.
      //console.log('STEP4');
      //const retSend = await sendAdminTransaction(balanceFinalList);
      //console.log(retSend);

    } catch (e) {
      console.error(e);
    }

  })();

}

function checkUserBalance(userList) {
  let balanceResultList = [];
  for (let i = 0; i < userList.length; i++) {
    balanceResultList.push(blockchainGateway.getBalance(userList[i].userNo, userList[i].account));
  }

  return new Promise(function (resolve, reject) {
    (async () => {
      let totalBalance = 0;
      let userCount = 0;
      try {
        const resultList = await Promise.all(balanceResultList);
        balanceFinalList =  resultList;

        for (let i = 0; i < resultList.length; i++) {
          console.log(resultList[i]);

          // 2-1. TB_USER_ETH_ACCOUNT에 잔액을 업데이트 하면서 상태를 'CACHE'로 바꾼다.
          const retQuantity = updateQuantity(resultList[i].userNo, resultList[i].result);
          if(!retQuantity && retQuantity!=0) {
              console.error(resultList[i].userNo + ': 유저 잔액 업데이트에 실패하였습니다.');
              return retQuantity;
          }

          // 2-2. 히스토리를 기록한다.
          const retHis = insertHistory(icoNo, resultList[i].userNo, resultList[i].account, resultList[i].result);
          if(!retHis) {
            console.error(resultList[i].userNo + ': 히스토리 생성에 실패하였습니다.');
            return retHis;
          }

          totalBalance += parseFloat(resultList[i].result);
          userCount++;
        }
      } catch(e) {
        reject(e);
      }
      return resolve({totalBalance: totalBalance, userCount: userCount});
    })();
  });
}

function updateQuantity(userNo, quantity) {
  const ret = query.update('UPDATE TB_USER_ETH_ACCOUNT SET quantity = :quantity, userEthAccountLookup = \'CACHE\' WHERE userNo = :userNo;',
      {'userNo': userNo, 'quantity': quantity});
  return ret;
}

function sendAdminTransaction(balanceFinalList) {

  for (let i = 0; i < balanceFinalList.length; i++) {
    sendResultList.push(blockchainGateway.sendTransaction(balanceFinalList[i].account, admin_account, balanceFinalList[i].result));
  }

  return new Promise(function (resolve, reject) {
    (async () => {
      let totalBalance = 0;
      let userCount = 0;
      try {
        const resultList = await Promise.all(sendResultList);
        for (let i = 0; i < resultList.length; i++) {
          console.log(resultList[i]);

          // TB_USER_ETH_ACCOUNT에 txHash를 업데이트 한다.
          const retTxHash = updateHistory(resultList[i].userNo, resultList[i].result);
          if(!retTxHash && retTxHash!=0) {
            console.error(resultList[i].userNo + ': 유저 txHash 업데이트에 실패하였습니다.');
            return retTxHash;
          }

        }
      } catch(e) {
        reject(e);
      }
      return resolve({totalBalance: totalBalance, userCount: userCount});
    })();
  });
}

function insertHistory(icoNo, userNo, account, beforeQuantity) {
  let sql = '';
  sql += 'INSERT INTO TB_ADMIN_ETH_HISTORY ( icoNo, userNo, account, beforeQuantity, afterQuantity, txhash, status, createdDate ) ';
  sql += 'VALUES ( :icoNo, :userNo, :account, :beforeQuantity, null, null, \'READY\', NOW() )';

  let historyNo = query.insert(sql, {
    icoNo : icoNo,
    userNo: userNo,
    account: account,
    beforeQuantity: beforeQuantity
  });

  return historyNo;
}

function updateHistory(userNo, txhash) {
  const ret = query.update('UPDATE TB_ADMIN_ETH_HISTORY SET txhash = :txhash WHERE userNo = :userNo;',
      {'userNo': userNo, 'txhash': 'txhash'});
  return ret;
}
