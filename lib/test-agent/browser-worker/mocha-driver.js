(function(window) {
  'use strict';

  function MochaDriver(options) {
    var key;

    if (typeof(options) === 'undefined') {
      options = {};
    }

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }
  }

  MochaDriver.createMutliReporter = function createMultiReporter() {
    var reporters = Array.prototype.slice.call(arguments);

    return function(runner) {
      reporters.forEach(function(Report) {
        new Report(runner);
      });
    };
  };

  MochaDriver.prototype = {
    /**
     * Test interface for mocha use.
     */
    ui: 'bdd',

    /**
     * Default test timeout.
     */
    timeout: 10000,

    /**
     * Mocha reporter to use.
     * If null is given none will be used.
     */
    reporter: 'HTML',

    /**
     * location of test helper(s).
     *
     * Will be loaded before any of your tests.
     * May pass more then one via an array.
     *
     * Each helper is loaded completely before
     * requiring any other helpers allowing multiple
     * files to be requested prior to executing tests.
     *
     * @type {String|Array}
     */
    testHelperUrl: './test/helper.js',

    /**
     * Location of the mocha runtime.
     */
    mochaUrl: './vendor/mocha/mocha.js',

    enhance: function enhance(worker) {
      this.worker = worker;
      worker.testRunner = this._testRunner.bind(this);
    },

    extend: function extend(target) {
      var result = target || {},
          objs = Array.slice(arguments, 1);

      return objs.reduce(function(result, obj) {
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            result[key] = obj[key];
          }
        }

        return result;
      }, result);
    },

    getReporter: function getReporter(box) {
      var stream = TestAgent.Mocha.JsonStreamReporter,
          self = this;

      stream.console = box.console;

      stream.send = function send(line) {
        self.worker.send('test data', line);
      };

      if (this.worker.env) {
        TestAgent.Mocha.JsonStreamReporter.testAgentEnvId = this.worker.env;
      }


      if(this.reporter) {
        return MochaDriver.createMutliReporter(
          TestAgent.Mocha.JsonStreamReporter,
          box.Mocha.reporters[this.reporter]
        );
      } else {
        return TestAgent.Mocha.JsonStreamReporter;
      }

      return result;
    },

    _loadTestHelpers: function(box, callback) {
      var helpers = this.testHelperUrl;
      if (typeof(helpers) === 'string') {
        helpers = [helpers];
      }

      var current = 0;
      var max = helpers.length;

      function next() {
        if (current < max) {
          box.require(helpers[current], function() {
            current++;
            next();
          });
        } else {
          callback();
        }
      }

      next();
    },

    _testRunner: function _testRunner(worker, tests, done) {
      var box = worker.sandbox.getWindow(),
          self = this;

      worker.loader.done(function onDone() {
        box.mocha.run(done);
      });

      box.require(this.mochaUrl, function onRequireMocha() {
        if (!box.process) {
          box.process = {
            stdout: {
              write: console.log
            },
            write: console.log
          };
        }

        var options = self.extend({}, self.setup, {
          ui: self.ui,
          timeout: self.timeout,
          reporter: self.getReporter(box)
        });

        //setup mocha
        box.mocha.setup(options);
      });

      self._loadTestHelpers(box, function() {
        tests.sort().forEach(function(test) {
          box.require(test);
        });
      });
    }

  };

  window.TestAgent.BrowserWorker.MochaDriver = MochaDriver;

}(this));
