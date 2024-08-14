const mysql = require('mysql');
const config = require('./dbConfig');
const connection = mysql.createConnection(config);
connection.connect();

const queryDatabase = (query) => {
    return new Promise((resolve, reject) => {
        connection.query(query, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};

module.exports = {
    queryDatabase
};