var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var app = express();
var router = express.Router();
var Db = require('./dbConnection/operations');

// Middleware to parse URL-encoded bodies and JSON bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// Middleware to enable CORS
app.use(cors());
// Use the router for all routes
app.use('/', router);

// Middleware for logging each request
router.use((request, response, next) => {
  console.log('Received request for:', request.url);
  next();
});

// Route to get multiple users with optional filters, sorting, and pagination
router.route('/users').get((request, response) => {
  const { pageSize, page, filter, sortBy, sortOrder } = request.query;
  // Fetch users with specified query parameters
  Db.getUsers({
    sortBy,
    sortOrder,
    filter,
    page,
    pageSize,
  }).then((data) => {
    // Send the fetched user data as JSON
    response.json({ Users: data });
  }).catch((error) => {
    // Log and send error if fetching users fails
    console.error('Error fetching users:', error);
    response.status(500).json({ error: 'Internal server error' });
  });
});

// Route to get a single user by user ID
router.route('/user/:id').get((request, response) => {
  const userId = request.params.id;
  // Fetch user by ID
  Db.getUser({
    userId: userId
  }).then((data) => {
    if (data.length > 0) {
      // Send the fetched user data if found
      response.json(data);
    } else {
      // Send error if no user is found
      response.status(404).json({ error: 'User not found' });
    }
  }).catch((error) => {
    // Log and send error if fetching user fails
    console.error('Error fetching user:', error);
    response.status(500).json({ error: 'Internal server error' });
  });
});

// Route to compare two users by their IDs
router.route('/compare-users').post((request, response) => {
  const { userIds } = request.body;
  if (userIds.length !== 2) {
      // Validate that exactly two userIds are provided
      return response.status(400).json({ error: 'Exactly two userIds are required for comparison.' });
  }

  // Compare two users by their IDs
  Db.compareUsers(userIds).then((data) => {
      // Send the comparison result
      response.json({ comparison: data });
  }).catch((error) => {
      // Log and send error if comparison fails
      console.error('Error comparing users:', error);
      response.status(500).json({ error: 'Internal server error' });
  });
});

// Route to fetch multiple users by their IDs
router.route('/users-by-ids').post((request, response) => {
  const { userIds } = request.body;
  if (!userIds || !Array.isArray(userIds)) {
      // Validate that userIds are provided as an array
      return response.status(400).json({ error: 'userIds must be provided as an array' });
  }

  // Fetch users by their IDs
  Db.getUsersByIds(userIds).then((data) => {
      // Send the fetched user data
      response.json({ Users: data });
  }).catch((error) => {
      // Log and send error if fetching users by IDs fails
      console.error('Error fetching users by IDs:', error);
      response.status(500).json({ error: 'Internal server error' });
  });
});

// Set the port and start the server
var port = process.env.PORT || 8090;
app.listen(port, () => {
  console.log('User API is running at ' + port);
});