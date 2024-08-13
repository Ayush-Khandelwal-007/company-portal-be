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

    // Query to count the total number of users
    const countQuery = `
    SELECT COUNT(DISTINCT u.userId) AS totalUsers
    FROM MercorUsers u
    LEFT JOIN MercorUserSkills us ON u.userId = us.userId
    LEFT JOIN Skills s ON us.skillId = s.skillId
    WHERE s.skillName LIKE '${sanitizedFilter}'
  `;

  // Construct the SQL query to fetch users
  let query = `
    SELECT 
      u.userId, u.email, u.name, u.phone, u.residence, u.profilePic, u.fullTimeSalaryCurrency,
      u.fullTimeSalary, u.partTimeSalaryCurrency, u.partTimeSalary, u.createdAt, u.lastLogin, 
      u.isGptEnabled, u.isActive, u.workAvailability,
      p.location,
      GROUP_CONCAT(s.skillName ORDER BY us.order ASC SEPARATOR ', ') AS skills,
      (SELECT SUM(we.endDate - we.startDate) 
       FROM WorkExperience we 
       JOIN UserResume ur ON we.resumeId = ur.resumeId
       WHERE ur.userId = u.userId) AS totalExperience
    FROM MercorUsers u
    LEFT JOIN MercorUserSkills us ON u.userId = us.userId
    LEFT JOIN Skills s ON us.skillId = s.skillId
    LEFT JOIN UserResume r ON u.userId = r.userId
    LEFT JOIN PersonalInformation p ON r.resumeId = p.resumeId
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
    const countResult = await queryDatabase(countQuery);
    const totalUsers = countResult[0].totalUsers;
    const totalPages = Math.ceil(totalUsers / pageSize);

    const results = await queryDatabase(query);
    return { results, totalPages };
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

// Function to compare two users based on their user IDs
async function compareUsers(userIds) {
  // SQL query to fetch user details and calculate total experience and skills
  const query = mysql.format(`
      SELECT 
          u.userId, u.name, u.email, u.phone, 
          u.fullTimeSalary, u.fullTimeSalaryCurrency,
          u.partTimeSalary, u.partTimeSalaryCurrency,
          (SELECT SUM(we.endDate - we.startDate) 
           FROM WorkExperience we 
           JOIN UserResume ur ON we.resumeId = ur.resumeId
           WHERE ur.userId = u.userId) AS totalExperience,
          (SELECT GROUP_CONCAT(s.skillName ORDER BY s.skillName ASC) 
           FROM MercorUserSkills us 
           JOIN Skills s ON us.skillId = s.skillId 
           WHERE us.userId = u.userId) AS skills
      FROM MercorUsers u
      WHERE u.userId IN (?, ?)
  `, userIds);

  try {
      // Execute the query and process the results
      const results = await queryDatabase(query);
      if (results.length === 2) {
          // Construct a differences object to highlight differences between the two users
          const differences = {
              name:  { user1: results[0].name, user2: results[1].name },
              email:  { user1: results[0].email, user2: results[1].email },
              phone:  { user1: results[0].phone, user2: results[1].phone },
              fullTimeSalary:  { user1: results[0].fullTimeSalary, user2: results[1].fullTimeSalary },
              fullTimeSalaryCurrency:  { user1: results[0].fullTimeSalaryCurrency, user2: results[1].fullTimeSalaryCurrency },
              partTimeSalary:  { user1: results[0].partTimeSalary, user2: results[1].partTimeSalary },
              partTimeSalaryCurrency:  { user1: results[0].partTimeSalaryCurrency, user2: results[1].partTimeSalaryCurrency },
              totalExperience:  { user1: results[0].totalExperience, user2: results[1].totalExperience },
              skills:  { user1: results[0].skills, user2: results[1].skills } 
          };
          return differences;
      } else {
          // Throw an error if one or both users are not found
          throw new Error('One or both users not found');
      }
  } catch (err) {
      // Log and rethrow the error if the query fails
      console.error('Error performing comparison query:', err);
      throw err;
  }
}

// Function to fetch multiple users by their user IDs
async function getUsersByIds(userIds) {
  // SQL query to fetch user details, skills, and total experience
  const query = mysql.format(`
      SELECT 
          u.userId, u.email, u.name, u.phone, u.residence, u.profilePic, u.fullTimeSalaryCurrency,
          u.fullTimeSalary, u.partTimeSalaryCurrency, u.partTimeSalary, u.createdAt, u.lastLogin, 
          u.isGptEnabled, u.isActive, u.workAvailability,
          p.location,
          GROUP_CONCAT(s.skillName ORDER BY us.order ASC SEPARATOR ', ') AS skills,
          (SELECT SUM(we.endDate - we.startDate) 
           FROM WorkExperience we 
           JOIN UserResume ur ON we.resumeId = ur.resumeId
           WHERE ur.userId = u.userId) AS totalExperience
      FROM MercorUsers u
      LEFT JOIN MercorUserSkills us ON u.userId = us.userId
      LEFT JOIN Skills s ON us.skillId = s.skillId
      LEFT JOIN UserResume r ON u.userId = r.userId
      LEFT JOIN PersonalInformation p ON r.resumeId = p.resumeId
      WHERE u.userId IN (?)
      GROUP BY 
          u.userId, u.email, u.name, u.phone, u.residence, u.profilePic, 
          u.fullTimeSalaryCurrency, u.fullTimeSalary, u.partTimeSalaryCurrency, 
          u.partTimeSalary, u.createdAt, u.lastLogin, u.isGptEnabled, 
          u.isActive, u.workAvailability, p.location
  `, [userIds]);

  try {
      // Execute the query and return the results
      const results = await queryDatabase(query);
      return results;
  } catch (err) {
      // Log and rethrow the error if the query fails
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
  getUsers,
  getUser,
  compareUsers,
  getUsersByIds
}