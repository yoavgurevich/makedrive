var uuid = require( "node-uuid" );

var authTable = [];

function addUser(err, user){
  // When webmake-auth signs in, add user id data to authTable
  if(err){
    return console.log(err);
  }
  user.tokens.push(uuid.v4());
  authTable.push(user);
};

function getToken(token){
  // Expose data for comparison validation of websockets connection integrity
  for(var i = 0; i<authTable.length; i++){
    for(var j=0; j<authTable[i].tokens.length; j++){
      if(authTable[i].tokens[j] == token){
        authTable[i].tokens[j].pop();
        return true;
      }
    }
  }
  return false;
};

module.exports = {
  addUser: addUser,
  getToken: getToken,
};
