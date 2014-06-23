var fs = require('fs'),
    _ = require('lodash'),
    mysql = require('mysql'),
    config = require('./config.json'),
    queries = fs.readFileSync('fixtures/init.sql').toString(),
    sql = mysql.createConnection(_.extend(config.mysql, {
        multipleStatements: true
    }));

sql.connect();
sql.query(queries, function (err) {
    if (err) {
        console.log(err.toString());
    }
    sql.end();
});