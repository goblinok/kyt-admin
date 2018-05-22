var Web3 = require('web3');
var Tx = require('ethereumjs-tx');
var fs = require('fs');
var config = require('config');

// Main Ethereum Network : https://mainnet.infura.io/B9CiBAdzsQj91G9FKFJY
// Test Ethereum Network (Ropsten) : https://ropsten.infura.io/B9CiBAdzsQj91G9FKFJY
// Test Ethereum Network (Rinkeby) : https://rinkeby.infura.io/B9CiBAdzsQj91G9FKFJY
// Test Ethereum Network (Kovan) : https://kovan.infura.io/B9CiBAdzsQj91G9FKFJY
// Test Ethereum Network (INFURAnet) : https://infuranet.infura.io/B9CiBAdzsQj91G9FKFJY
// IPFS Gateway : https://ipfs.infura.io
// IPFS RPC : https://ipfs.infura.io:5001
// Private Ethereum Network : http://ec2-13-124-244-3.ap-northeast-2.compute.amazonaws.com:8545
//var host = "https://mainnet.infura.io/B9CiBAdzsQj91G9FKFJY";
//var host = "https://ropsten.infura.io/B9CiBAdzsQj91G9FKFJY";

var host = config.get('gethHost');
var host = "http://ec2-18-220-160-112.us-east-2.compute.amazonaws.com:8545";
var web3 = new Web3(new Web3.providers.HttpProvider(host));

console.log("* host : " + host);
web3.eth.defaultAccount = web3.eth.accounts[0];

//----------------------------
// 블록 갯수 조회
//----------------------------
exports.getBlockNumber = async function () {
  let blockNumber = await web3.eth.getBlockNumber();

  return {
    result : blockNumber
  };
};

//----------------------------
// 블록 조회
//----------------------------
exports.getBlock = async function (num) {
  let block = await web3.eth.getBlock(num);
  return {
    result : block
  };
};


//----------------------------
// 트랜잭션 조회
//----------------------------
exports.getTransaction = async function (txHash) {
  let log = await web3.eth.getTransaction(txHash);

  return {
    result : log
  };
};


//----------------------------
// 이더 잔액 조회
//----------------------------
exports.getBalance = async function (userNo, address) {
    let balance = await web3.eth.getBalance(address);

    return {
        userNo : userNo,
        account : address,
        result : web3.utils.fromWei(balance)
    };
};

//----------------------------
// 계정 언락
//----------------------------
exports.unlockAccount = function (from, passphase, callback) {
    web3.personal.unlockAccount(from, passphase, function (err, hash) {
        if (err) {
            console.log(err);
            return callback(err, '')
        } else {
            console.log("* unlock : " + from + ', ' + passphase + ', hash='+hash);
            return callback(null, hash);
        }
    });
};

//----------------------------
// 이더 이체하기 (RAW)
//----------------------------
exports.sendTransaction = function(from, to, value, callback) {
    const gasPrice = 40000000000;
    const gas = 30000;
    const final_value =(value * Math.pow(10, 18)) - (gasPrice * gas);

    console.log(final_value)
    web3.eth.sendTransaction({
      from: from,
      to: to,

      value: final_value,
      gasPrice: gasPrice,
      gas: gas
    }, function (err, hash) {
        if (err) {
          console.log("* sendTransaction txhash err: " + err );
          console.log(err);
          return callback (err, '');
        } else {
          console.log("* sendTransaction txhash : " + hash );
          return callback (null, hash);
        }
    });
};

//----------------------------
// 이더 이체하기 (Signed)
//----------------------------

exports.sendSignedTransaction = async function(from, to, value, dir, callback) {
  const gasPrice = 40000000000;
  const gas = 30000;

  var  final_value =(value * Math.pow(10, 18)) - (gasPrice * gas);

  const nonce = await web3.eth.getTransactionCount(from);

  const txData = {
    nonce: nonce,
    from: from,
    to: to,
    value: web3.utils.toHex(final_value),
    gasPrice: web3.utils.toHex(gasPrice),
    gas: web3.utils.toHex(gas)
  }

  console.log(txData);
  console.log("* final_value : " + final_value);

  var file = dir+'/'+from;
  var buff = await fs.readFileSync(file, "utf8");
  if (buff.length != 64)  {
    console.log("* privateKey 읽기에 실패했습니다. (" + dir + '/' + from + '),('+buff+')'  );
    return callback (false, buff);
  }
  console.log( "* privateKey : " + buff)

  const privateKey = new Buffer(buff,'hex');
  const transaction = new Tx(txData);
  transaction.sign(privateKey);
  const serializedTx = transaction.serialize().toString('hex');

  console.log( "* serializedTx : " + serializedTx)

  web3.eth.sendSignedTransaction('0x' + serializedTx, function (err, hash) {
    if (err) {
      console.log("* sendTransaction txhash err: " + err );
      console.log(err);
      return callback (err, '');
    } else {
      console.log("* sendTransaction txhash : " + hash );
      return callback (null, hash);
    }
  });
};

async function readPrivateKey(dir, from) {
  //---------------------------
  // [주의] BWX경우에 한해서만 예외적으로 파일에 0x가 없으므로 이후에는 해당로직은 삭제한다.
  if (from.substring(0,2) =='0x') {
    from = from.substring(2);
  }
  //---------------------------

  var file = dir+'/'+from;
  console.log(file);

  var exists = await fs.exists(file);
  if (!exists) return '';

  var buff = await fs.readFileSync(file, "utf8");
  return buff;

}