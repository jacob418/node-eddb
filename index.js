const config = require('./config.json') ;
const fileParser = new require('./src/fileParser') ;
const databaseManager = new require('./src/databaseManager')(config.mysql) ;

(function(){

})() ;
