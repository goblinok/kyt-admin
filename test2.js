gremlin = require('gremlin');

//const client = gremlin.createClient(8182, "ethereumgraph.cluster-cpqnxyktfkns.us-east-1-beta.rds.amazonaws.com", { accept: "application/vnd.gremlin-v.0+json" });
const client = gremlin.createClient(8182, "ethereumgraph.cluster-cpqnxyktfkns.us-east-1-beta.rds.amazonaws.com", { accept: "application/json" });

client.execute('g.V().limit(20)', (err, results) => {
    if (err) {
        console.error(err)
    }
    else
    {
        console.log(results);
    }
    // Close the connection.  Call this method only when you are done with the client.
    client.closeConnection();
});

