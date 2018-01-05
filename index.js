const config = require('./config.json') ;
const fileManager = require('./src/fileManager')(config.eddb) ;
const databaseManager = require('./src/databaseManager')(config.mysql) ;
const eddnListener = require('./src/eddnListener') ;
const queryScheduler = require('./src/queryScheduler') ;

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
		case "update":
			fileManager.updateEddbJSON(function(err, results){
				if(err) {
					console.log(err);
					process.exit(1) ;
				}else{
					console.log(results) ;
					process.exit(0) ;
				}
			}) ;
			break ;
		case 'listen':
			var listener = new eddnListener({}) ;
			listener.on('starSystem', function(data){
			}) ;
			listener.listen() ;
			break ;
		default:
			throw new Error("no valid action specified") ;
	}

	return ;
})() ;
