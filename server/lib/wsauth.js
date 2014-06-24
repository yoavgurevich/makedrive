var uuid = require( "node-uuid" );

var authTable = {};

function addUser(err, user){
  // When webmake-auth signs in, add user id data to authTable
  if(err){
    return console.log(err);
  }
  if(authTable[user]){
    console.log(authTable[user]);
    authTable[user].tokens.push(uuid.v4());
    return authTable[user];
  }
  else{
    return authTable[user] = {username: user, tokens: [uuid.v4()]};
  }

};

function getToken(token){
  // Expose data for comparison validation of websockets connection integrity
  var u;
  for (var user in authTable) {
    u=authTable[user];
   for(var i=0; i<u.tokens.length; i++){
      if(u.tokens[i] == token){
        delete u.tokens[i];
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
