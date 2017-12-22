(function() {
	const fs = require('fs') ;
	const readline = require('readline');

	var fileManager = function fileManager(eddbAPI) {
		if(eddbAPI.constructor !== {}.constructor){
			throw new Error("given parameter is not a valid JSON") ;
		}

		Object.defineProperty(this, "eddbAPI", {
			enumerable: true,
			value: eddbAPI,
			writable: false,
		}) ;
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