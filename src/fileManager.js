(function() {
	const fs = require('fs') ;
	const readline = require('readline');
	const request = require('request');
	const mergeJSON = require('merge-json') ;
	const async = require('async') ;
	const hashFiles = require('hash-files');

	var fileManager = function fileManager(eddbAPI) {
		if (eddbAPI.constructor !== {}.constructor) {
			throw new Error("given parameter is not a valid JSON");
		}

		Object.defineProperty(this, "eddbAPI", {
			enumerable: true,
			value: eddbAPI,
			writable: false,
		}) ;
	} ;

	fileManager.prototype.updateEddbJSON = function updateEddbJSON(cb){
		const baseOpts = {
			port: 443,
			method: "GET",
			gzip: true
		};

		try {
			fs.mkdirSync('./data');
		}catch(e){}

		var error = null ;
		// get api file for systems
		request(mergeJSON.merge(baseOpts, {url: this.eddbAPI.systems}), function (err, response, body) {
			if(error || err){
				if(error){
					err = error ;
				} else {
					error = err ;
				}
				cb(err) ;
			} else {
				fs.writeFile('./data/systems-tmp.jsonl', body, function(err) {
					if (err) {
						cb(err);
					}else{
						fs.appendFileSync('./data/systems.jsonl', "") ;
						this.replaceIfNotEqual(['./data/systems.jsonl','./data/systems-tmp.jsonl'], function(err, replaced) {
								if(err){
									console.log(err) ;
								} else {
									if(replaced){
										console.log("Systems-API has been updated") ;
									} else {
										// delete temp file if nothing was replaced
										fs.unlinkSync('./data/systems-tmp.jsonl') ;
										console.log("Systems-API has not changed") ;
									}
								}
							});
					}
				}.bind(this)) ;
			}
		}.bind(this));


		// get api file for factions
		request(mergeJSON.merge(baseOpts, {url: this.eddbAPI.factions}), function (err, response, body) {
			if(error || err){
				if(error){
					err = error ;
				} else {
					error = err ;
				}
				cb(err) ;
			} else {
				fs.writeFile('./data/factions-tmp.jsonl', body, function(err) {
					if (err) {
						cb(err);
					}else{
						fs.appendFileSync('./data/factions.jsonl', "") ;
						this.replaceIfNotEqual(['./data/factions.jsonl','./data/factions-tmp.jsonl'], function(err, replaced) {
							if(err){
								console.log(err) ;
							} else {
								if(replaced){
									console.log("Factions-API has been updated") ;
								} else {
									// delete temp file if nothing was replaced
									fs.unlinkSync('./data/factions-tmp.jsonl') ;
									console.log("Factions-API has not changed") ;
								}
							}
						});
					}
				}.bind(this)) ;
			}
		}.bind(this));
	} ;


	// replace files[0] with files[1] if they are not equal
	// cb => (err, replaced)
	fileManager.prototype.replaceIfNotEqual = function replaceIfNotEqual(files, cb){
		async.map(files, function(file, asyncCb){
				hashFiles({files:[file]}, asyncCb) ;
			},
			function(err, results) {
				if(err){
					console.log(err) ;
				} else {
					if(results[0].indexOf(results[1]) === -1){
						// delete orig file and rename temp file if create time differs
						try {
							fs.unlinkSync(files[0]);
							fs.renameSync(files[1], files[0]);
							cb(null, true) ;
						} catch (e) {
							cb(e) ;
						}
					} else {
						cb(null,false) ;
					}
				}
			});
	} ;

	fileManager.prototype.readFile = function readFile(fileName, cbLine, cbEnd){

		fs.stat(fileName, function(err,fileStats){
			if(err){
				cbEnd(err)
			}else {
				if (fileStats.isFile()) {
					var ifstream = fs.createReadStream(fileName) ;
					var lines = 0 ;
					var eof = false ;

					const lineReader = readline.createInterface({
						input: ifstream
					});

					ifstream.on('end', function(){
						eof = true ;
					}) ;

					lineReader.on('line', function (lineText) {
						if(!eof) {
							lines++;
							try {
								var lineData = JSON.parse(lineText);
								cbLine(null, lineData) ;
							} catch (e) {
								cbLine(e) ;
							}
						} else {
							cbEnd(null,lines) ;
						}
					});
				} else {
					cbEnd(new Error("no file or file not found: '" + fileName + "'")) ;
				}
			}
		}) ;

	} ;

	module.exports = function(eddbAPI){return new fileManager(eddbAPI)} ;
})() ;
