'use strict';
const express = require('express');
const auth = require('../../lib/auth');
const router = express.Router();
const query = require('../../lib/Query');
const privacy = require('../../lib/privacy-utils');
const eth = require('../../lib/eth');
const util = require('util');

var passwd = "";
const merkline_account = "0x0a22ad5fd8c5eae06122271db6830177e480fbec";
const isSign = true;  // signedTransaction 이용 유무

//----------------------------
// 리스트 화면
//----------------------------
router.get('/', async function (req, res, next) {
    if (auth.authAdminCheckAndRedirect(req, res)) {
      return;
    }

    try {

          let curr = 1;
          if (req.query.curr)
          {
            curr = parseInt(req.query.curr);
          }
          let icoNo ='';
          if (req.query.icoNo)
          {
            icoNo = req.query.icoNo;
          }
          let passwd ='';
          if (req.query.passwd)
          {
            passwd = req.query.passwd;
          }
          let symbol ='';
          if (req.query.symbol)
          {
            symbol = req.query.symbol;
          }
          let dir ='';
          if (req.query.dir)
          {
            dir = req.query.dir;
          }
          let totalBalance ='';
          if (req.query.totalBalance)
          {
            totalBalance = req.query.totalBalance;
          }

          // 1. ICO 읽어오기
          if (!icoNo) {
            let sql = "";
            sql += "SELECT * ";
            sql += "FROM TB_ICO ";
            sql += "WHERE siteOpen = 1 ";
            sql += "ORDER BY icoNo DESC LIMIT 1 ";
            const ico = await query.findOne(sql);
            if (!ico) {
              return next({
                'status': 403,
                'message': 'ICO정보가 없습니다..'
              });
            }
            icoNo = ico.icoNo;
            symbol = ico.symbol;
            totalBalance = ico.totalBalance;
          }
          // 2. 관리자 : 실시간 잔액조회를 한다.
          let admin_balance = await eth.getBalance(0, merkline_account);
          //console.log(admin_balance );
          if(!admin_balance) {
            return next({
              'status': 403,
              'message': '관리자 Geth 잔액조회에 실패하였습니다.'
            });
          }

          // 3. 전체 카운트
          const num = await query.findOne('SELECT COUNT(*) as n FROM TB_USER_ETH_ACCOUNT WHERE symbol=:symbol',{'symbol' : symbol });
          if (!num) {
            console.error('전체 페이징수를 찾을 수 없습니다.');
            return;
          }
          const page = parseInt(num.n/200)+1;

          // 4. 유저 정보 가져오기
          let sql = '';
          sql += 'SELECT TB_USER_ETH_ACCOUNT.userNo, account, userEthAccountLookup, quantity, DATE_FORMAT(createdDate, "%d/%m/%Y") as createdDate FROM TB_USER_ETH_ACCOUNT ' ;
          sql += 'JOIN (SELECT userNo ';
          sql += 'FROM   TB_USER_ETH_ACCOUNT ';
          sql += 'WHERE  symbol = :symbol ';
          sql += 'ORDER  BY userNo desc ';
          sql += 'LIMIT  :nMin, :nMax) AS t ON t.userNo = TB_USER_ETH_ACCOUNT.userNo; ' ;

          let nMin = Math.max(0, curr*200-200);
          let nMax = Math.min(num.n, (curr)*200);
          const userPreList = await query.find(sql, {'symbol': symbol, 'nMin' : nMin, 'nMax': nMax});
          //console.log('userPreList = ' + util.inspect());
          if (!userPreList) {
            console.error('유저를 찾을 수 없습니다.');
            return;
          }

          const userList = await getUserInfo(icoNo, userPreList);

          res.render('page/admin/users.ejs', {userList: userList, icoNo: icoNo, totalBalance : totalBalance,
                                                admin_account : merkline_account, admin_balance : admin_balance.result,
                                                symbol : symbol, passwd:passwd, page:page, curr: curr, total: num.n, dir:dir,
                                                userID:req.session.web.userId
    });

    } catch (e) {
        next({
            'status': 400,
            'message': e,
        });
    }
});

//----------------------------
// 이체하기 액션화면
//----------------------------
router.post('/wallets-transaction', function(req, res, next) {
  var userNo= req.body.userNo;

  let icoNo =1;
  if (req.body.icoNo)
  {
    icoNo = req.body.icoNo;
  }
  let passwd ='';
  if (req.body.passwd)
  {
    passwd = req.body.passwd;
  }
  let curr = 1;
  if (req.body.curr)
  {
    curr = parseInt(req.body.curr);
  }
  let symbol = '';
  if (req.body.symbol)
  {
    symbol = req.body.symbol;
  }
  let dir = '';
  if (req.body.dir)
  {

    dir = req.body.dir;
  }
  let totalBalance ='';
  if (req.body.totalBalance)
  {
    totalBalance = req.body.totalBalance;
  }

  /*
  if (!userNo || !passwd || !icoNo || !dir ) {
    return next({
      'status': 403,
      'message': '필수 항목이 없습니다.(userNo:'+userNo+', icoNo:'+icoNo+', passwd:'+passwd+', dir:'+dir+')'});
  }
  */

  (async () => {
    try {
      // 1. 유저 조회
      const user = await query.findOne('SELECT * FROM TB_USER_ETH_ACCOUNT WHERE userNo = :userNo and symbol = :symbol', {'userNo': userNo, 'symbol': symbol});
      //console.log('user = ' + util.inspect(user));
      if (!user) {
        console.error('유저를 찾을 수 없습니다.');
        return;
      }
      if (user.userEthAccountLookup == 'CACHE') {
        return next({
          'status': 403,
          'message': user.userNo + ': 관리자에게 이미 이체된 이용자입니다.'});
      }

      // 2. 실시간 잔액조회를 한다.
      //let balance = await blockchainGateway.getBalance(user.userNo, user.account);
      let balance = await eth.getBalance(user.userNo, user.account);
      console.log(balance);
      if(!balance) {
        return next({
          'status': 403,
          'message': balance.userNo + ': Geth 잔액조회에 실패하였습니다.'
        });
      }
      if (balance.result == 0 || balance.result == '') {
        return next({
          'status': 403,
          'message': balance.userNo + ': Geth 잔액이 없어 이체할 수 없습니다.'
        });
      }

      // 3. 히스토리를 기록한다. (READY)
      const retDel = await deleteHistory(user.userNo, icoNo);
      if(!retDel) {
        console.log('삭제할 데이터가 없습니다.(정상)');
      }
      const retHis = await insertHistory(icoNo, balance.userNo, balance.account, balance.result);
      if(!retHis) {

        return next({
          'status': 403,
          'message': balance.userNo + ': 히스토리 기록(READY)에 실패하였습니다.'
        });
      }

      // 4. 관리자 계좌로 이체한다.
      //const retLock = await blockchainGateway.unlockAccount(user.account, passwd);
      //if(retLock.result.errorMessage!='') {
      //  console.log('UNLOCK FAIL:' + retLock.result.errorMessage);
      if (isSign) {
        const retSend = await eth.sendSignedTransaction(user.account, merkline_account, balance.result, dir, function(err, rcpt) {
          if(err){
            console.log('SEND FAIL : ' + err);
            return next({
              'status': 403,
              'message': balance.userNo + ': 이체에 실패했습니다.(1) - sendTransaction 실패'
            });
          } else {
            console.log('SEND SUCCESS : ' + rcpt);
            if (!rcpt) {
              return next({
                'status': 403,
                'message': balance.userNo + ': 이체에 실패했습니다.(2) - txHash 없음'
              });
            }

            // 5. 히스토리상태를 업데이트한다. (SENT)
            const retUpd = updateHistory(balance.userNo, icoNo, rcpt, 'SENT');
            if (!retUpd) {
              return next({
                'status': 403,
                'message': balance.userNo + ': 히스토리 업데이트(SENT)에 실패하였습니다.'
              });
            }

            res.redirect('/admin/users?curr='+curr+'&passwd='+passwd+'&icoNo='+icoNo+'&totalBalance=' + totalBalance + '&symbol='+symbol+'&dir='+dir);
          }
        });
      }
      else {
        const retLock = await eth.unlockAccount(user.account, passwd, function(err, rcpt){
          if (err) {
            console.log('UNLOCK FAIL:' + err);
            return next({
              'status': 403,
              'message': balance.userNo + ': 언락에 실패했습니다.'
            });
          } else {
            console.log('UNLOCK SUCCESS:' + rcpt);

            //const retSend = await blockchainGateway.sendTransaction(user.account, merkline_account, balance.result);
            //console.log('retSend = ' + util.inspect(retSend.result));
            //if(retSend.result.errorMessage !='') {
            const retSend = eth.sendTransaction(user.account, merkline_account, balance.result, function(err, rcpt) {
              if(err){
                console.log('SEND FAIL : ' + err);
                return next({
                  'status': 403,
                  'message': balance.userNo + ': 이체에 실패했습니다.'
                });
              } else {

                console.log('SEND SUCCESS : ' + rcpt);

                // 5. 히스토리상태를 업데이트한다. (SENT)
                const retUpd =updateHistory(balance.userNo, icoNo, rcpt, 'SENT');
                if (!retUpd) {
                  return next({
                    'status': 403,
                    'message': balance.userNo + ': 히스토리 업데이트(SENT)에 실패하였습니다.'
                  });
                } else {

                  // 6. 이체가 성공하면 상태를 'CACHE'로 변경한다.
                  const retQty = updateQuantity(balance.userNo, balance.result, 'CACHE');
                  if(!retQty && retQty!=0) {
                    return next({
                      'status': 403,
                      'message': balance.userNo + ': 상태(CACHE) 변경에 실패했습니다.(1)'
                    });
                  }
                }
              }
            });
          }
        });
      }

    } catch (e) {
      next({
        'status': 400,
        'message': e,
      });
    }
  })();
});

async function getUserInfo(icoNo, userPreList) {
  let userList = [];
  for (let i = 0; i < userPreList.length; i++) {
    userPreList[i].email = await getEmail(userPreList[i].userNo)
    userPreList[i].realQuantity = await eth.getBalance(userPreList[i].userNo, userPreList[i].account);
    userList.push(userPreList[i]);
  }
  return new Promise(function (resolve, reject) {
    (async () => {
      try {
        const resultList = await Promise.all(userList);
        return resolve(resultList);
      } catch(e) {
        reject(e);
      }
    })();
  });
}

function updateQuantity(userNo, quantity, userEthAccountLookup) {
  const ret = query.update('UPDATE TB_USER_ETH_ACCOUNT SET quantity = :quantity, userEthAccountLookup = :userEthAccountLookup WHERE userNo = :userNo;',
      {'userNo': userNo, 'quantity': quantity, 'userEthAccountLookup': userEthAccountLookup});
  return ret;
}

function insertHistory(icoNo, userNo, account, quantity) {
  let sql = '';
  sql += 'INSERT INTO TB_ADMIN_ETH_HISTORY ( icoNo, userNo, account, quantity, transfedQuantity, txhash, status, createdDate ) ';
  sql += 'VALUES ( :icoNo, :userNo, :account, :quantity, 0, null, \'READY\', NOW() )';

  let historyNo = query.insert(sql, {
    icoNo : icoNo,
    userNo: userNo,
    account: account,
    quantity: quantity
  });

  return historyNo;
}

async function updateHistory(userNo, icoNo, txhash, status) {
  let sql= 'UPDATE TB_ADMIN_ETH_HISTORY SET status = :status, txhash = :txhash WHERE userNo = :userNo and icoNo = :icoNo ;'
  let ret = await query.update(sql, {'txhash': txhash, 'userNo': userNo, 'icoNo': icoNo, 'status': status});
  return ret;
}

function deleteHistory(userNo, icoNo) {
  let sql= 'DELETE FROM TB_ADMIN_ETH_HISTORY WHERE userNo = :userNo and icoNo = :icoNo ;'
  let ret = query.delete(sql, {'userNo': userNo, 'icoNo': icoNo});
  return ret;
}

async function getEmail(userNo) {
  let sql= 'SELECT email FROM TB_USER WHERE userNo = :userNo;';
  let ret = await query.findOne(sql, {'userNo': userNo});
  if(!ret) {
    return '';
  }
  else {
    return privacy.decode(ret.email);
  }
}


module.exports = router;
