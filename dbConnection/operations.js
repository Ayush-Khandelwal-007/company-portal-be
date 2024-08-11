var  config = require('./dbConfig');
const  mysql = require('mysql');
let  connection =  mysql.createConnection(config);
connection.connect();

async function getUsers({ 
  sortBy = 'userId',  // Default sorting column
  sortOrder = 'ASC', 
  filter = '', 
  page = 1, 
  pageSize = 10 
} = {}) {
  const offset = (page - 1) * pageSize;

  // Base query, joining with MercorUserSkills and Skills to fetch user skills
  let query = `
    SELECT 
      u.userId, u.email, u.name, u.phone, u.residence, u.profilePic, 
      u.createdAt, u.lastLogin, u.isGptEnabled, u.isActive, 
      GROUP_CONCAT(s.skillName ORDER BY us.order ASC SEPARATOR ', ') AS skills
    FROM MercorUsers u
    LEFT JOIN MercorUserSkills us ON u.userId = us.userId
    LEFT JOIN Skills s ON us.skillId = s.skillId
  `;
  
  const queryParams = [];

  // Filter condition handling
  if (filter) {
    const sanitizedFilter = `%${filter.replace(/'/g, "\\'")}%`;
    query += ` WHERE (u.name LIKE '${sanitizedFilter}' OR u.email LIKE '${sanitizedFilter}')`;
  }
  
  // Add grouping, sorting, and pagination
  query += `
    GROUP BY u.userId
    ORDER BY ${sortBy} ${sortOrder} 
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  // Query the database
  try {
    const results = await queryDatabase(query, queryParams);
    return results;
  } catch (err) {
    console.error('Error performing query:', err);
    throw err;  // Rethrow error for further handling if needed
  }
}
  
async function getUser({ userId }) {
  // Use a parameterized query to safely include the userId
  const query = mysql.format(`
    SELECT 
      u.userId, u.email, u.name, u.phone, u.residence, u.profilePic, 
      u.createdAt, u.lastLogin, u.isGptEnabled, u.isActive, u.isComplete,
      u.preferredRole, u.fullTimeStatus, u.workAvailability, u.fullTimeSalary,
      u.partTimeSalary, u.summary, u.preVettedAt,
      GROUP_CONCAT(DISTINCT s.skillName ORDER BY us.order ASC SEPARATOR ', ') AS skills,
      r.resumeId, r.url AS resumeUrl, r.filename AS resumeFilename, r.createdAt AS resumeCreatedAt,
      r.updatedAt AS resumeUpdatedAt, r.source AS resumeSource, r.isInvitedToInterview,
      p.name AS personalInfoName, p.location AS personalInfoLocation, p.email AS personalInfoEmail,
      p.phone AS personalInfoPhone,
      GROUP_CONCAT(DISTINCT we.company ORDER BY we.startDate ASC SEPARATOR ', ') AS workExperienceCompanies,
      GROUP_CONCAT(DISTINCT e.school ORDER BY e.startDate ASC SEPARATOR ', ') AS educationSchools
    FROM MercorUsers u
    LEFT JOIN MercorUserSkills us ON u.userId = us.userId
    LEFT JOIN Skills s ON us.skillId = s.skillId
    LEFT JOIN UserResume r ON u.userId = r.userId
    LEFT JOIN PersonalInformation p ON r.resumeId = p.resumeId
    LEFT JOIN WorkExperience we ON r.resumeId = we.resumeId
    LEFT JOIN Education e ON r.resumeId = e.resumeId
    WHERE u.userId = ?
    GROUP BY u.userId, r.resumeId, p.personalInformationId
  `, [userId]);

  // Query the database
  try {
    const results = await queryDatabase(query);
    return results;
  } catch (err) {
    console.error('Error performing query:', err);
    throw err;  // Rethrow the error to handle it upstream if needed
  }
}
  
  // Promisify the query method
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
    getUsers:  getUsers,
    getUser:  getUser
  }