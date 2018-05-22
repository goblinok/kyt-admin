"use strict";
const util = require('util')
var config = require('config');
const Gremlin = require('gremlin');

var host = config.get('gremlinHost');
console.log("* host : " + host);

const client = Gremlin.createClient(
    8182,
    host,
    {
        "session": false,
        "ssl": false,
        "accept" : "application/vnd.gremlin-v2.0+json"
        //"user": "/dbs/graphdb/colls/graphcoll",
        //"password": "PRIMARYKEY"
    }
);

exports.dropGraph = function () {
    return new Promise(function(resolve, reject) {
        client.execute('g.V().drop()', { }, (error, results) => {
            console.log('* Running Drop :');
            if (error) {
                reject(error);
            } else {
                console.log("Result: %s\n", JSON.stringify(results));
                resolve(null);
            }
        });
    });
}

exports.addVertex = function (account) {
    return new Promise(function(resolve, reject) {
        client.execute("g.V().has('account', '"+ account +"')", { }, function (error, results) {
            console.log('* Find Vertex :' + account);
            if (error) {
                reject(error);
            } else {
                if (results.length == 0 ) {
                    console.log("아직 없음 ==>" + util.inspect(results));
                    client.execute("g.addV('eoa').property('account', '"+ account +"')", { }, function (error, results) {
                    console.log('* Running Add Vertex :' + account);
                    if (error) {
                        reject(null);
                    } else {
                        resolve(results[0]['@value'].id);
                        //resolve(results[0].id);
                    }
                    });
                } else {
                    console.log("이미 있음 ==>" + util.inspect(results[0]));
                    resolve(results[0]['@value'].id);
                    //resolve(results[0].id)
                }
            }
        });
    });
}

exports.addEdge = function (id1, id2, value, timestamp) {
    return new Promise(function(resolve, reject) {
        client.execute("g.V('"+ id1 +"').addE('transfer').to(g.V('"+ id2 +"')).property('value','" + value + "' ).property('timestamp','" + timestamp + "' )", {}, function (error, results) {
            console.log('* Running Add Edge : ' + id1 + ',' + id2);
            if (error) {
                reject(null);
            } else {
                resolve(results);
            }
        });
    });
}


exports.countVertices = function () {
    return new Promise(function(resolve, reject) {
        client.execute("g.V().count()", { }, (err, results) => {
            console.log('* Running Count : ');
            if (err) {
                reject(err);
            } else {
                console.log(results);
                resolve(null);
            }
        });
    });
}

exports.drawGraph = function () {
    return new Promise(function(resolve, reject) {
        client.execute("g.E()", { }, (err, results) => {
            console.log('* Running Draw : ');
            if (err) {
                reject(err);
            } else {
                console.log(results);
                resolve(null);
            }
        });
    });
}

exports.finish = function () {
    return new Promise(function(resolve, reject) {
        client.execute("", { }, (err, results) => {
            console.log("Finished");
            console.log('Press any key to exit');

            if (err) {
                reject(err);
            } else {
                process.stdin.setRawMode(true);
                process.stdin.resume();
                process.stdin.on('data', process.exit.bind(process, 0));
                resolve(null);
            }

        });
    });
}
