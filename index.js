const config = require('./config.json') ;
const fileParser = require('./src/fileParser')() ;
const databaseManager = require('./src/databaseManager')(config.mysql) ;

(function(){

})() ;
