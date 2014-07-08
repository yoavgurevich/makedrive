var expect = require('chai').expect;
var util = require('../lib/util.js');
var SyncMessage = require('../../server/lib/syncmessage');
var Sync = require('../../server/lib/sync');

describe('[Downstream Syncing with Websockets]', function(){
  describe('The server', function(){
    it('should close a socket if bad data is sent in place of websocket-auth token', function(done) {
      util.authenticatedConnection({ done: done }, function( err, result ) {
        expect(err).not.to.exist;

        var gotMessage = false;

        var socketPackage = util.openSocket({
          onMessage: function() {
            gotMessage = true;
          },
          onClose: function() {
            expect(gotMessage).to.be.false;
            util.cleanupSockets(result.done, socketPackage);
          },
          onOpen: function() {
            socketPackage.socket.send("this-is-garbage");
          }
        });
      });
    });
    it('shouldn\'t allow the same token to be used twice', function(done) {
      util.authenticatedConnection({ done: done }, function( err, result ) {
        expect(err).not.to.exist;
        var socketData = {
          token: result.token
        };

        var socketPackage = util.openSocket(socketData, {
          onMessage: function(message) {
            expect(message).to.equal(JSON.stringify(new SyncMessage(SyncMessage.RESPONSE, SyncMessage.ACK)));

            var socketPackage2 = util.openSocket(socketData, {
              onClose: function(code, reason) {
                expect(code).to.equal(1008);
                util.cleanupSockets(result.done, socketPackage, socketPackage2);
              }
            });
          }
        });
      });
    });
    it(', after receiving a valid token and syncId, should send a RESPONSE named "AUTHZ"', function(done) {
      util.authenticatedConnection({ done: done }, function( err, result ) {
        expect(err).not.to.exist;
        var socketData = {
          token: result.token
        };

        var socketPackage = util.openSocket(socketData, {
          onMessage: function(message) {
            expect(message).to.equal(JSON.stringify(new SyncMessage(SyncMessage.RESPONSE, SyncMessage.AUTHZ)));
            util.cleanupSockets(result.done, socketPackage);
          }
        });
      });
    });
    it('should allow two socket connections for the same username from different clients', function(done) {
      util.authenticatedConnection(function( err, result ) {
        expect(err).not.to.exist;
        var socketData = {
          token: result.token
        };

        var socketPackage = util.openSocket(socketData, {
          onMessage: function(message) {
            expect(message).to.equal(JSON.stringify(new SyncMessage(SyncMessage.RESPONSE, SyncMessage.AUTHZ)));
            util.authenticatedConnection(function(err, result2) {
              expect(err).not.to.exist;
              socketData = {
                syncId: result2.syncId,
                token: result2.token
              };

              var socketPackage2 = util.openSocket(socketData, {
                onMessage: function(message) {
                  util.cleanupSockets(function() {
                    result.done();
                    result2.done();
                    done();
                  }, socketPackage, socketPackage2);
                },
              });
            });
          }
        });
      });
    });
    it('should send an "invalid data" SyncMessage error object when a non-syncmessage object is sent', function(done) {
      util.authenticatedConnection({ done: done }, function(err, result) {
        expect(err).not.to.exist;
        var socketData = {
          token: result.token
        };

        var socketPackage = util.openSocket(socketData, {
          onMessage: function(message) {
            // First, confirm server acknowledgment
            expect(message).to.equal(JSON.stringify(new SyncMessage(SyncMessage.RESPONSE, SyncMessage.AUTHZ)));
            // Listen for SyncMessage error
            socketPackage.socket.on("message", function(message) {
              expect(message).to.equal(JSON.stringify(Sync.socket.errors.EINVAL));
              util.cleanupSockets(result.done, socketPackage);
            });

            var invalidMessage = {
              anything: "else"
            };

            socketPackage.socket.send(JSON.stringify(invalidMessage));
          }
        });
      });
    });
  });
  describe('SRCLIST requests', function() {
    it('should still return a REQUEST for CHKSUM with the sourceList after calculating a sourceList', function(done) {
      util.authenticatedConnection({ done: done }, function( err, result ) {
        expect(err).not.to.exist;
        var socketData = {
          token: result.token
        };

        var socketPackage = util.openSocket(socketData, {
          onMessage: function(message) {
            expect(message).to.equal(JSON.stringify(new SyncMessage(SyncMessage.REQUEST, SyncMessage.CHKSUM)));
            var username = util.username();

            util.prepareDownstreamSync(username, socketPackage, function(syncData, fs) {
              util.downstreamSyncSteps.srcList(socketPackage, function(data1) {
                expect(data1.srcList).to.exist;
                expect(data1.path).to.exist;
                util.cleanupSockets(result.done, socketPackage);
              });
            });
          }
        });
      });
    });
    it('should still return a SyncMessage with the sourceList and path for a sync when requested a second time', function(done) {
      util.authenticatedConnection({ done: done }, function( err, result ) {
        expect(err).not.to.exist;
        var socketData = {
          token: result.token
        };

        var socketPackage = util.openSocket(socketData, {
          onMessage: function(message) {
            expect(message).to.equal(JSON.stringify(new SyncMessage(SyncMessage.RESPONSE, SyncMessage.AUTHZ)));             var username = util.username();

            util.prepareDownstreamSync(username, socketPackage, function(syncData, fs) {
              util.downstreamSyncSteps.srcList(socketPackage, function(data1) {
                expect(data1.srcList).to.exist;
                expect(data1.path).to.exist;

                util.downstreamSyncSteps.srcList(socketPackage, function(data2) {
                  expect(data1.srcList).to.exist;
                  expect(data1.path).to.exist;

                  util.cleanupSockets(result.done, socketPackage);
                });
              });
            });
          }
        });
      });
    });
    it('should return a ESTATE SyncMessage when sent out of turn', function(done) {
      util.authenticatedConnection({ done: done }, function( err, result ) {
        expect(err).not.to.exist;
        var socketData = {
          token: result.token
        };

        var socketPackage = util.openSocket(socketData, {
          onMessage: function(message) {
            expect(message).to.equal(util.resolveFromJSON(new SyncMessage(SyncMessage.RESPONSE, SyncMessage.AUTHZ)));

            var username = util.username();

            util.prepareDownstreamSync("checksums", username, socketPackage, function(syncData, fs) {
              util.downstreamSyncSteps.srcList(socketPackage, function(msg, cb) {
                expect(util.resolveFromJSON(msg)).to.equal(util.resolveFromJSON(Sync.socket.errors.ESTATE));
                cb();
              }, function(data) {
                util.cleanupSockets(result.done, socketPackage);
              });
            });
          }
        });
      });
    });
  });
  describe('DIFFS responses', function() {
    it('should return an RESPONSE message with the diffs', function(done) {
      util.authenticatedConnection({ done: done }, function( err, result ) {
        expect(err).not.to.exist;

        var username = util.username();
        var socketData = {
          token: result.token
        };

        var socketPackage = util.openSocket(socketData, {
          onMessage: function(message) {
            expect(message).to.equal(util.resolveFromJSON(new SyncMessage(SyncMessage.RESPONSE, SyncMessage.DIFFS)));
            util.prepareDownstreamSync('checksums', username, socketPackage, function(syncData, fs) {
              util.downstreamSyncSteps.diffs(socketPackage, syncData, fs, function(msg, cb) {
                msg = util.resolveToJSON(msg);

                expect(msg.content).to.exist;
                expect(msg.content.diffs).to.exist;
                cb();
              }, function(data) {
                util.cleanupSockets(result.done, socketPackage);
              });
            });
          }
        });
      });
    });
    it('should return an ESTATE SyncMessage when sent out of turn', function(done) {
      util.authenticatedConnection({ done: done }, function( err, result ) {
        expect(err).not.to.exist;

        var username = util.username();
        var socketData = {
          token: result.token
        };

        var socketPackage = util.openSocket(socketData, {
          onMessage: function(message) {
            expect(message).to.equal(util.resolveFromJSON(new SyncMessage(SyncMessage.RESPONSE, SyncMessage.AUTHZ)));

            util.prepareDownstreamSync('srcList', username, socketPackage, function(syncData, fs) {
              util.downstreamSyncSteps.diffs(socketPackage, syncData, fs, function(msg, cb){
                expect(msg).to.equal(util.resolveFromJSON(Sync.socket.errors.ESTATE));
                cb();
              }, function(data) {
                util.cleanupSockets(result.done, socketPackage);
              });
            });
          }
        });
      });
    });
  });
  describe('PATCH', function() {
    it('should be available to initiate/cater to a new sync REQUEST after receiving a PATCH response from the client', function(done) {
      util.authenticatedConnection({ done: done }, function( err, result ) {
        expect(err).not.to.exist;

        var username = util.username();
        var socketData = {
          token: result.token
        };

        var socketPackage = util.openSocket(socketData, {
          onMessage: function(message) {
            util.prepareDownstreamSync('diffs', username, socketPackage, function(syncData, fs) {
              util.downstreamSyncSteps.patch(socketPackage, syncData, fs, function(msg, cb) {
                msg = util.resolveToJSON(msg);
                var sendMsg = JSON.stringify(new SyncMessage(SyncMessage.REQUEST, SyncMessage.SYNC));
                util.sendMessage(socketPackage, sendMsg, function(message){
                  expect(msg.content).to.exist;
                  expect(msg.content.srcList).to.exist;
                  cb();
                });
              }, function(data) {
                util.cleanupSockets(result.done, socketPackage);
              });
            });
          }
        });
      });
    });
    it('should return an ESTATE SyncMessage when sent out of turn', function(done) {
      util.authenticatedConnection({ done: done }, function( err, result ) {
        expect(err).not.to.exist;

        var username = util.username();
        var socketData = {
          token: result.token
        };

        var socketPackage = util.openSocket(socketData, {
          onMessage: function(message) {
            expect(message).to.equal(util.resolveFromJSON(new SyncMessage(SyncMessage.RESPONSE, SyncMessage.AUTHZ)));

            util.prepareDownstreamSync('srcList', username, socketPackage, function(syncData, fs) {
              util.downstreamSyncSteps.diffs(socketPackage, syncData, fs, function(msg, cb){
                expect(msg).to.equal(util.resolveFromJSON(Sync.socket.errors.ESTATE));
                cb();
              }, function(data) {
                util.cleanupSockets(result.done, socketPackage);
              });
            });
          }
        });
      });
    });
  });
});
