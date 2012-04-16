/**
 * REQUIRES: suite, responder, broadcast
 *
 * When server recieves siginal to start tests
 * will tell every client to run all or some tests.
 */
function StartTests(){}

StartTests.prototype = {

  eventName: 'queue tests',

  enhance: function(server){
    server.on(this.eventName, this._startTests.bind(this, server));
  },

  _startTests: function(server, data){
    if(data && data.files && data.files.length > 0){
      this._broadCastFiles(server, data.files);
    } else {
      server.suite.findTestFiles(function(err, files){
        this._broadCastFiles(server, files);
      }.bind(this));
    }
  },

  _broadCastFiles: function(server, files){
    var list = files.map(function(file){
      return server.suite.testFromPath(file).testUrl;
    });
    server.broadcast(server.stringify('run tests', {tests: list}));
  }

};

module.exports = exports = StartTests;