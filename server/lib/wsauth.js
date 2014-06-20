var authTable = {};

function addUser(){
  // When webmake-auth signs in, add user id data to authTable
};

function getUser(){
  // Expose data for comparison validation of websockets connection integrity
};


function deleteUser(){
  // When session is done, remove all related user data from authTable
};

module.exports = {
  getUser: getUser,
  addUser: addUser,
  deleteUser: deleteUser
};
