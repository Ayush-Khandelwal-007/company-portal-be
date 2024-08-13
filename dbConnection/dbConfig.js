const config = {
    host     : process.env.DB_HOST || '35.224.61.48',
    user     : process.env.DB_USER || 'trial_user',
    password : process.env.DB_PASSWORD || 'trial_user_12345#',
    database : process.env.DB_DATABASE || 'MERCOR_TRIAL_SCHEMA',
    port     : process.env.DB_PORT || 3306
}

module.exports = config;