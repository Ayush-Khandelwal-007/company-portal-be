const mysql = require('mysql');
const dbUtil = require('./dbUtil');

const validSortColumns = ['userId', 'email', 'name']; // Add more valid columns as needed
const validSortOrders = ['ASC', 'DESC'];

// Function to get a list of users with pagination, sorting, and filtering options
const getUsers = async ({ 
  sortBy = 'userId',  
  sortOrder = 'ASC', 
  filters = [], // Changed to an array of strings
  page = 1, 
  pageSize = 10 
} = {}) => {
  // Calculate the offset for pagination
  const offset = (page - 1) * pageSize;
  // Sanitize each filter string to prevent SQL injection and join them for SQL LIKE clause
  const sanitizedFilters = filters.map(f => `%${f.replace(/'/g, "\\'")}%`);

  if (!validSortColumns.includes(sortBy) || !validSortOrders.includes(sortOrder)) {
    throw new Error('Invalid sort parameter');
  }

  // Adjusted count query to ensure all filters are matched
  let whereClause = '';
  if (sanitizedFilters.length > 0) {
    whereClause = 'WHERE ' + sanitizedFilters.map(f => `EXISTS (
      SELECT 1 FROM MercorUserSkills us2
      JOIN Skills s2 ON us2.skillId = s2.skillId
      WHERE us2.userId = u.userId AND s2.skillName LIKE '${f}'
    )`).join(' AND ');
  }

  const countQuery = `
    SELECT COUNT(DISTINCT u.userId) AS totalUsers
    FROM MercorUsers u
    JOIN MercorUserSkills us ON u.userId = us.userId
    JOIN Skills s ON us.skillId = s.skillId
    ${whereClause}
  `;

  // Adjusted main query to ensure all filters are matched
  let query = `
    SELECT 
      u.userId, u.email, u.name, u.phone, u.residence, u.profilePic, u.fullTimeSalaryCurrency,
      u.fullTimeSalary, u.partTimeSalaryCurrency, u.partTimeSalary, u.createdAt, u.lastLogin, 
      u.isGptEnabled, u.isActive, u.workAvailability, u.summary,
      u.preferredRole, u.fullTime, u.partTime,
      p.location,
      GROUP_CONCAT(DISTINCT s.skillName ORDER BY us.order ASC SEPARATOR ', ') AS skills,
      (SELECT SUM(we.endDate - we.startDate) 
       FROM WorkExperience we 
       JOIN UserResume ur ON we.resumeId = ur.resumeId
       WHERE ur.userId = u.userId) AS totalExperience
    FROM MercorUsers u
    JOIN MercorUserSkills us ON u.userId = us.userId
    JOIN Skills s ON us.skillId = s.skillId
    JOIN UserResume r ON u.userId = r.userId
    JOIN PersonalInformation p ON r.resumeId = p.resumeId
    ${whereClause}
    GROUP BY 
      u.userId, u.email, u.name, u.phone, u.residence, u.profilePic, 
      u.fullTimeSalaryCurrency, u.fullTimeSalary, u.partTimeSalaryCurrency, 
      u.partTimeSalary, u.createdAt, u.lastLogin, u.isGptEnabled, 
      u.isActive, u.workAvailability, p.location
    ORDER BY ${sortBy} ${sortOrder} 
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  try {
    const countResult = await dbUtil.queryDatabase(countQuery);
    const totalUsers = countResult[0].totalUsers;
    const totalPages = Math.ceil(totalUsers / pageSize);

    const results = await dbUtil.queryDatabase(query);
    return { results, totalPages };
  } catch (err) {
    console.error('Error performing query:', err);
    throw err;  
  }
}

// Function to get a single user by userId
const getUser = async ({ userId }) => {
  const query = mysql.format(`
      SELECT 
        u.userId, u.email, u.name, u.phone, u.residence, u.profilePic, u.fullTime, u.partTime,
        u.createdAt, u.lastLogin, u.isGptEnabled, u.isActive, u.isComplete,
        u.preferredRole, u.fullTimeStatus, u.workAvailability, u.fullTimeSalaryCurrency, 
        u.fullTimeSalary, u.partTimeSalaryCurrency, u.partTimeSalary, u.summary, u.preVettedAt,
        GROUP_CONCAT(DISTINCT s.skillName ORDER BY us.order ASC SEPARATOR ', ') AS skills,
        r.resumeId, r.url AS resumeUrl, r.filename AS resumeFilename, r.createdAt AS resumeCreatedAt,
        r.updatedAt AS resumeUpdatedAt, r.source AS resumeSource,
        p.name AS personalInfoName, p.location AS personalInfoLocation, p.email AS personalInfoEmail,
        p.phone AS personalInfoPhone,
        GROUP_CONCAT(DISTINCT CONCAT(e.school, ' : ', e.startDate, ' - ', e.endDate,' : ', e.degree) ORDER BY e.startDate ASC SEPARATOR '= ') AS educationDetails,
        we.company, we.startDate, we.endDate, we.description, we.locationCity, we.locationCountry, we.role
      FROM MercorUsers u
      LEFT JOIN MercorUserSkills us ON u.userId = us.userId
      LEFT JOIN Skills s ON us.skillId = s.skillId
      LEFT JOIN UserResume r ON u.userId = r.userId
      LEFT JOIN PersonalInformation p ON r.resumeId = p.resumeId
      LEFT JOIN WorkExperience we ON r.resumeId = we.resumeId
      LEFT JOIN Education e ON r.resumeId = e.resumeId
      WHERE u.userId = ?
      GROUP BY u.userId, u.email, u.name, u.phone, u.residence, u.profilePic, 
                u.createdAt, u.lastLogin, u.isGptEnabled, u.isActive, u.isComplete,
                u.preferredRole, u.fullTimeStatus, u.workAvailability, u.fullTimeSalaryCurrency, 
                u.fullTimeSalary, u.partTimeSalaryCurrency, u.partTimeSalary, u.summary, u.preVettedAt,
                r.resumeId, r.url, r.filename, r.createdAt, r.updatedAt, r.source,
                p.name, p.location, p.email, p.phone,
                we.workExperienceId
  `, [userId]);

  try {
      const results = await dbUtil.queryDatabase(query);
      const user = results[0];
      const workExperiences = results.map(we => ({
          company: we.company,
          startDate: we.startDate,
          endDate: we.endDate,
          description: we.description,
          locationCity: we.locationCity,
          locationCountry: we.locationCountry,
          role: we.role
      }));
      return { ...user, workExperiences };
  } catch (err) {
      console.error('Error performing query:', err);
      throw err;
  }
};

// Function to compare two users based on their user IDs
const compareUsers = async (userIds) => {
  // SQL query to fetch user details and calculate total experience and skills
  const query = mysql.format(`
      SELECT 
          u.userId, u.name, u.email, u.phone, u.profilePic,
          u.fullTimeSalary, u.fullTimeSalaryCurrency,
          u.partTimeSalary, u.partTimeSalaryCurrency,
          (SELECT SUM(we.endDate - we.startDate) 
           FROM WorkExperience we 
           JOIN UserResume ur ON we.resumeId = ur.resumeId
           WHERE ur.userId = u.userId) AS totalExperience,
          (SELECT GROUP_CONCAT(DISTINCT s.skillName ORDER BY s.skillName ASC) 
           FROM MercorUserSkills us 
           JOIN Skills s ON us.skillId = s.skillId 
           WHERE us.userId = u.userId) AS skills
      FROM MercorUsers u
      WHERE u.userId IN (?, ?)
  `, userIds);

  try {
      // Execute the query and process the results
      const results = await dbUtil.queryDatabase(query);
      if (results.length === 2) {
          // Construct a differences object to highlight differences between the two users
          const differences = {
              userId:  { user1: results[0].userId, user2: results[1].userId },
              name:  { user1: results[0].name, user2: results[1].name },
              email:  { user1: results[0].email, user2: results[1].email },
              profilePic:  { user1: results[0].profilePic, user2: results[1].profilePic },
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
const getUsersByIds = async (userIds) => {
  // SQL query to fetch user details, skills, and total experience
  const query = mysql.format(`
      SELECT 
          u.userId, u.email, u.name, u.phone, u.residence, u.profilePic, u.fullTimeSalaryCurrency,
          u.fullTimeSalary, u.partTimeSalaryCurrency, u.partTimeSalary, u.createdAt, u.lastLogin, 
          u.isGptEnabled, u.isActive, u.workAvailability, u.summary,
          p.location,
          GROUP_CONCAT(DISTINCT s.skillName ORDER BY us.order ASC SEPARATOR ', ') AS skills,
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
      const results = await dbUtil.queryDatabase(query);
      return results;
  } catch (err) {
      // Log and rethrow the error if the query fails
      console.error('Error performing query:', err);
      throw err;
  }
}
  
module.exports = {
  getUsers,
  getUser,
  compareUsers,
  getUsersByIds
}