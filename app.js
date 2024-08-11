var  express = require('express');
var  bodyParser = require('body-parser');
var  cors = require('cors');
var  app = express();
var  router = express.Router();
var  Db = require('./dbConnection/operations');

app.use(bodyParser.urlencoded({ extended:  true }));
app.use(bodyParser.json());
app.use(cors());
app.use('/', router);

router.use((request, response, next) => {
  console.log('middleware');
  next();
});
 
 
router.route('/users').get((request, response) => {
  const {pageSize, page, filter, sortBy, sortOrder} = request.query
  Db.getUsers({
    sortBy,
    sortOrder,
    filter,
    page,
    pageSize,
  }).then((data) => {
    response.json({Users:data});
  })
})

router.route('/user/:id').get((request, response) => {
  const userId = request.params.id
  Db.getUser({
    userId : userId
  }).then((data) => {
    response.json(data);
  })
})
var  port = process.env.PORT || 8090;
app.listen(port);
console.log('User API is runnning at ' + port);