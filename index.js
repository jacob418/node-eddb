const config = require('./config.json') ;
const path = require('path') ;
const fileManager = require('./src/fileManager')(config.eddb) ;
const databaseManager = require('./src/databaseManager')(config.mysql) ;
const eddnListener = require('./src/eddnListener') ;
const queryScheduler = require('./src/queryScheduler') ;
const logrotate = require('file-stream-rotator') ;
const logger = require('log') ;

(function(){
	const action = (typeof process.argv[2] === "string" ? process.argv[2] : "listen") ;

	Date.prototype.toString = Date.prototype.toISOString ;

	var errorLogCnf = JSON.parse(JSON.stringify(config.log)) ;
	errorLogCnf.filename = path.join(config.log.logdir, "error-%DATE%.log") ;
	var errorLog = new logger(config.log.level, logrotate.getStream(errorLogCnf)) ;

	var appLogCnf = JSON.parse(JSON.stringify(config.log)) ;
	appLogCnf.filename = path.join(config.log.logdir, "application-%DATE%.log") ;
	var appLog = new logger(config.log.level, logrotate.getStream(appLogCnf)) ;

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
				var start = Date.now() ;
				appLog.info("--- SYS --- received: '" + data.name + "'") ;
				databaseManager.updateStarSystem(data, function(err, data){
					if(err) {
						appLog.warn("--- SYS --- error saving: '" + data.name + "' --- duration:" + (Date.now() - start).toString() + "ms");
						if(err.sql) {
							errorLog.error("--- SQL --- CODE: " + err.code
								+ " --- MSG: " + err.sqlMessage.replace(/[\r\n\t]/gi, "")
								+ " --- Query: " + err.sql.replace(/[\r\n\t]/gi, ""));
						} else {
							errorLog.error("--- GEN --- ERR: " + err);
						}
					} else {
						appLog.info("--- SYS --- saved: '" + data.name + "' --- duration:" + (Date.now() - start).toString() + "ms");
					}
				}) ;
			}) ;
			listener.listen() ;
			break ;
		default:
			throw new Error("no valid action specified") ;
	}

	return ;
})() ;
