var config = require('./dbConfig');
const mysql = require('mysql');
let connection = mysql.createConnection(config);
connection.connect();

// Function to get a list of users with pagination, sorting, and filtering options
async function getUsers({ 
  sortBy = 'userId',  
  sortOrder = 'ASC', 
  filter = '', 
  page = 1, 
  pageSize = 10 
} = {}) {
  // Calculate the offset for pagination
  const offset = (page - 1) * pageSize;
  // Sanitize the filter to prevent SQL injection
  const sanitizedFilter = `%${filter.replace(/'/g, "\\'")}%`;

  // Construct the SQL query to fetch users
  let query = `
    SELECT 
      u.userId, u.email, u.name, u.phone, u.residence, u.profilePic, u.fullTimeSalaryCurrency,
      u.fullTimeSalary, u.partTimeSalaryCurrency, u.partTimeSalary, u.createdAt, u.lastLogin, 
      u.isGptEnabled, u.isActive, u.workAvailability,
      p.location,
      GROUP_CONCAT(s.skillName ORDER BY us.order ASC SEPARATOR ', ') AS skills
    FROM MercorUsers u
    LEFT JOIN MercorUserSkills us ON u.userId = us.userId
    LEFT JOIN Skills s ON us.skillId = s.skillId
    LEFT JOIN UserResume r ON u.userId = r.userId
    LEFT JOIN PersonalInformation p ON r.resumeId = p.resumeId
  `;
  
  const queryParams = [];
  
  // Add GROUP BY, HAVING, ORDER BY, and LIMIT clauses to the query
  query += `
    GROUP BY 
      u.userId, u.email, u.name, u.phone, u.residence, u.profilePic, 
      u.fullTimeSalaryCurrency, u.fullTimeSalary, u.partTimeSalaryCurrency, 
      u.partTimeSalary, u.createdAt, u.lastLogin, u.isGptEnabled, 
      u.isActive, u.workAvailability, p.location
    HAVING skills LIKE '${sanitizedFilter}'
    ORDER BY ${sortBy} ${sortOrder} 
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  try {
    // Execute the query and return the results
    const results = await queryDatabase(query, queryParams);
    return results;
  } catch (err) {
    console.error('Error performing query:', err);
    throw err;  
  }
}

// Function to get a single user by userId
async function getUser({ userId }) {
  
  // Construct the SQL query to fetch a single user
  const query = mysql.format(`
    SELECT 
      u.userId, MAX(u.email) as email, MAX(u.name) as name, MAX(u.phone) as phone, MAX(u.residence) as residence, MAX(u.profilePic) as profilePic, 
      MAX(u.createdAt) as createdAt, MAX(u.lastLogin) as lastLogin, MAX(u.isGptEnabled) as isGptEnabled, MAX(u.isActive) as isActive, MAX(u.isComplete) as isComplete,
      MAX(u.preferredRole) as preferredRole, MAX(u.fullTimeStatus) as fullTimeStatus, MAX(u.workAvailability) as workAvailability, MAX(u.fullTimeSalaryCurrency) as fullTimeSalaryCurrency, MAX(u.fullTimeSalary) as fullTimeSalary, MAX(u.partTimeSalaryCurrency) as partTimeSalaryCurrency,
      MAX(u.partTimeSalary) as partTimeSalary, MAX(u.summary) as summary, MAX(u.preVettedAt) as preVettedAt,
      GROUP_CONCAT(DISTINCT s.skillName ORDER BY us.order ASC SEPARATOR ', ') AS skills,
      MAX(r.resumeId) as resumeId, MAX(r.url) as resumeUrl, MAX(r.filename) as resumeFilename, MAX(r.createdAt) as resumeCreatedAt,
      MAX(r.updatedAt) as resumeUpdatedAt, MAX(r.source) as resumeSource, MAX(r.isInvitedToInterview) as isInvitedToInterview,
      MAX(p.name) as personalInfoName, MAX(p.location) as personalInfoLocation, MAX(p.email) as personalInfoEmail,
      MAX(p.phone) as personalInfoPhone,
      GROUP_CONCAT(DISTINCT CONCAT(we.company, ' : ', we.startDate, ' - ', we.endDate) ORDER BY we.startDate ASC SEPARATOR ', ') AS workExperienceDetails,
      GROUP_CONCAT(DISTINCT CONCAT(e.school, ' : ', e.startDate, ' - ', e.endDate) ORDER BY e.startDate ASC SEPARATOR ', ') AS educationDetails
    FROM MercorUsers u
    LEFT JOIN MercorUserSkills us ON u.userId = us.userId
    LEFT JOIN Skills s ON us.skillId = s.skillId
    LEFT JOIN UserResume r ON u.userId = r.userId
    LEFT JOIN PersonalInformation p ON r.resumeId = p.resumeId
    LEFT JOIN WorkExperience we ON r.resumeId = we.resumeId
    LEFT JOIN Education e ON r.resumeId = e.resumeId
    WHERE u.userId = ?
    GROUP BY u.userId
  `, [userId]);
  
  try {
    // Execute the query and return the results
    const results = await queryDatabase(query);
    return results;
  } catch (err) {
    console.error('Error performing query:', err);
    throw err;  
  }
}

// Function to execute a query on the database
function queryDatabase(query) {
  return new Promise((resolve, reject) => {
    console.debug('New Query started:', query);
      connection.query(query, (err, results) => {
          if (err) {
              return reject(err);
          }
          console.debug('Query Results:', results);
          resolve(results);
      });
  });
}
  
module.exports = {
  getUsers: getUsers,
  getUser: getUser
}