SyncMessage.REQUEST = 1;
SyncMessage.RESPONSE = 2;
SyncMessage.STREAM = 3;
SyncMessage.ACK = 4;
SyncMessage.SOURCE_LIST = 5;
SyncMessage.CHECKSUM = 6;
SyncMessage.DIFF = 7;
SyncMessage.PATCH = 8;
SyncMessage.RESET = 9;
SyncMessage.ERROR = 0;

function validateParams(param, paramType) {
  if(param) {
    if(paramType === 'TYPE') {
      return param === SyncMessage.REQUEST ||
        param === SyncMessage.RESPONSE ||
        param === SyncMessage.STREAM;
    } else if(paramType === 'NAME') {
      return param === SyncMessage.SOURCE_LIST ||
        param === SyncMessage.CHECKSUM ||
        param === SyncMessage.DIFF ||
        param === SyncMessage.PATCH ||
        param === SyncMessage.ERROR ||
        param === SyncMessage.ACK ||
        param === SyncMessage.RESET;
    }
  }
  return false;
}

function SyncMessage(type, name) {
  this.type = validateParams(type, 'TYPE') ? type : null;
  this.name = validateParams(name, 'NAME') ? name : null;
  this.content = 'No content';
}

SyncMessage.prototype.setContent = function(content) {
  this.content = content;
}

// TODO: Expose a .toJSON method

module.exports = SyncMessage;
