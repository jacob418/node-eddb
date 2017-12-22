const config = require('./config.json') ;
const fileManager = require('./src/fileManager')() ;
const databaseManager = require('./src/databaseManager')(config.mysql) ;

(function(){
	const action = (typeof process.argv[2] === "string" ? process.argv[2] : "") ;

	switch(action) {
		case "init-db":
			databaseManager.initDatabase(function (err, result) {
				if (err) {
					console.log(err);
				} else {
					console.log(result);
				}
			});
			break ;
		default:
			throw new Error("no valid action specified") ;
	}
})() ;
