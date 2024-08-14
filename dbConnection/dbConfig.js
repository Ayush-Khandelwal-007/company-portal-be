require('dotenv').config();

const config = {
    host     : process.env.DB_HOST,
    user     : process.env.DB_USER,
    password : process.env.DB_PASSWORD,
    database : process.env.DB_DATABASE,
    port     : parseInt(process.env.DB_PORT)
}

module.exports = config;