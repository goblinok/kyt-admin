var Web3 = require('web3');
var Tx = require('ethereumjs-tx');
var fs = require('fs');
var request = require('request');
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
var apigw = "https://or0pvv3cz3.execute-api.us-east-2.amazonaws.com/poc/blockchainGateway";


console.log("* host : " + host);
web3.eth.defaultAccount = web3.eth.accounts[0];

//----------------------------
// 블록 갯수 조회
//----------------------------
exports.getBlockNumber = function () {
  return new Promise(function(resolve, reject) {
    const url = apigw + '?resource=getBlockNumber';

    var payload = '';

    var headers = {
      'content-type': 'application/json',
      'X-OCTANK-PAYLOAD': '',
      'X-OCTANK-SIGNATURE': ''
    };

    var options = {
      url: url,
      headers: headers,
      body: payload
    };

    request.get(options,
        function(error, response, body) {
          if (error) {
            reject(error);
          } else {
            resolve({
                result : JSON.parse(body)
            });
          }
        });
  });
}
//----------------------------
// 블록 조회
//----------------------------
exports.getBlock = function (num) {
  return new Promise(function (resolve, reject) {
    const url = apigw + '?resource=getBlock&blockNo='+ num;

    var payload = '';

    var headers = {
      'content-type':'application/json',
      'X-OCTANK-PAYLOAD': '',
      'X-OCTANK-SIGNATURE': ''
    };

    var options = {
      url: url,
      headers: headers,
      body: payload
    };

    request.get(options,
        function(error, response, body) {
          if (error) {
            reject(error);
          } else {
            resolve({
                result : JSON.parse(body)
            });
          }
        });
  });
};


//----------------------------
// 트랜잭션 조회
//----------------------------
exports.getTransaction = function (txHash) {
  return new Promise(function (resolve, reject) {
    const url = apigw + '?resource=getTransaction&txhash='+ txHash;

    var payload = '';

    var headers = {
      'content-type':'application/json',
      'X-OCTANK-PAYLOAD': '',
      'X-OCTANK-SIGNATURE': ''
    };

    var options = {
      url: url,
      headers: headers,
      body: payload
    };

    request.get(options,
        function(error, response, body) {
          if (error) {
            reject(error);
          } else {
            resolve({
                result : JSON.parse(body)
            });
          }
        });
  });
};


//----------------------------
// 이더 잔액 조회
//----------------------------
exports.getBalance = function (userNo, address) {
    return new Promise(function (resolve, reject) {
      const url = apigw + '?resource=getBalance&account='+ address;

      var payload = '';

      var headers = {
        'content-type':'application/json',
        'X-OCTANK-PAYLOAD': '',
        'X-OCTANK-SIGNATURE': ''
      };

      var options = {
        url: url,
        headers: headers,
        body: payload
      };

      request.get(options,
        function(error, response, body) {
          if (error) {
            reject(error);
          } else {
            resolve({
              userNo : userNo,
              account : address,
              result : JSON.parse(body)
            });
            //web3.utils.fromWei( );
          }
        });
    });
};

//----------------------------
// 계정 언락
//----------------------------
exports.unlockAccount = function (from, passphase) {
    return new Promise(function (resolve, reject) {
      const url = apigw + '?resource=unlockAccount&account='+ from + '&passwd=' + passphase;

      var payload = '';

      var headers = {
        'content-type':'application/json',
        'X-OCTANK-PAYLOAD': '',
        'X-OCTANK-SIGNATURE': ''
      };

      var options = {
        url: url,
        headers: headers,
        body: payload
      };

      request.get(options,
          function(error, response, body) {
            if (error) {
              reject(error);
            } else {
              console.log("* unlock : " + from + ', ' + passphase + ', hash='+hash);

              resolve({
                result : body
              });
            }
          });
    });
};

//----------------------------
// 이더 이체하기 (RAW)
//----------------------------
exports.sendTransaction = function(from, to, value, callback) {
    const gasPrice = 40000000000;
    const gas = 30000;
    const final_value =(value * Math.pow(10, 18)) - (gasPrice * gas);

    return new Promise(function (resolve, reject) {
      const url = apigw + '?resource=sendTransaction&from='+ from +'&to=' + to + '&value='+ value +'&gas=' + gas + '&gasPrice=' + gasPrice;

      var payload = '';

      var headers = {
        'content-type':'application/json',
        'X-OCTANK-PAYLOAD': '',
        'X-OCTANK-SIGNATURE': ''
      };

      var options = {
        url: url,
        headers: headers,
        body: payload
      };

      request.get(options,
          function(error, response, body) {
            if (error) {
              console.log("* sendTransaction txhash err: " + err );
              reject(error);
            } else {
              console.log("* sendTransaction txhash : " + hash );
              resolve({
                result : body
              });
            }
          });
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

  var file = dir+'/'+from;
  console.log(file);

  var exists = await fs.exists(file);
  if (!exists) return '';

  var buff = await fs.readFileSync(file, "utf8");
  return buff;

}