const config = require('./config.json') ;
const fileParser = require('./src/fileParser')() ;
const databaseManager = require('./src/databaseManager')(config.mysql) ;

(function(){
	const action = (typeof process.argv[2] === "string" ? process.argv[2] : "") ;

	switch(action) {
		default:
			throw new Error("no valid action specified") ;
	}
})() ;
