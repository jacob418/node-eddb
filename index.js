const config = require('./config.json') ;
const fileManager = require('./src/fileManager')(config.eddb) ;
const databaseManager = require('./src/databaseManager')(config.mysql) ;

(function(){
	const action = (typeof process.argv[2] === "string" ? process.argv[2] : "") ;

	switch(action) {
		case "init-db":
			databaseManager.initDatabase(function (err, result) {
				if (err) {
					console.log(err);
					process.exit(1) ;
				} else {
					process.exit(0) ;
				}
			});
			break ;
		default:
			throw new Error("no valid action specified") ;
	}

	return ;
})() ;
