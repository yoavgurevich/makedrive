if ( process.env.NEW_RELIC_ENABLED ) {
  require( "newrelic" );
}

var express = require( "express" ),
    helmet = require( "helmet" ),
    WebmakerAuth = require( "webmaker-auth" ),
    Path = require( "path" ),
    http = require( "http" ),
    jwt = require( "jsonwebtoken" ),
    wsAuth = require ( "wsauth" ),
    messina;

// Expose internals
var env = require( "./lib/environment" ),
    middleware = require( "./middleware" ),
    routes = require( "./routes" ),
    socketServer = require( "./lib/socket-server" );

var app = express(),
    distDir = Path.resolve( __dirname, "dist" ),
    webmakerAuth = new WebmakerAuth({
      loginURL: env.get( "LOGIN_SERVER_URL_WITH_AUTH" ),
      secretKey: env.get( "SESSION_SECRET" ),
      forceSSL: env.get( "FORCE_SSL" ),
      domain: env.get( "COOKIE_DOMAIN" )
    }, app),
    logger,
    port;

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ server: app, port: 8181 });

// Logging middleware
if ( env.get( "ENABLE_GELF_LOGS" ) ) {
  messina = require( "messina" );
  logger = messina( "MakeDrive-" + env.get( "NODE_ENV" ) || "development" );
  logger.init();
  app.use( logger.middleware() );
} else {
  app.use( express.logger( "dev" ) );
}

// General middleware
app.disable( "x-powered-by" );
app.use( helmet.contentTypeOptions() );
app.use( helmet.hsts() );
app.enable( "trust proxy" );
app.use( express.compress() );
app.use(express.static(Path.join(__dirname,'../client')));
app.use( express.json() );
app.use( express.urlencoded() );
app.use( webmakerAuth.cookieParser() );
app.use( webmakerAuth.cookieSession() );

app.use( app.router );

app.use( middleware.errorHandler );
app.use( middleware.fourOhFourHandler );

//wss.broadcast = function(data) {
//    for(var i in this.clients)
//        this.clients[i].send(data);
//};

function corsOptions ( req, res ) {
  res.header( "Access-Control-Allow-Origin", "*" );
}
wss.on('connection', function(ws) {
    var token = jwt.sign(persona, jwt_secret, { expiresInMinutes: 60*5 });

    ws.on('error', function(e){
      console.log(e);
    });
    ws.on('message', function(message) {
        console.log('received: %s', message);
    });
    ws.send({token: token});
});
app.post('/verify', webmakerAuth.handlers.verify, function(req, res){
  console.log('in verify post route');
});
app.post('/authenticate', webmakerAuth.handlers.authenticate);
app.post('/gettoken', function(req, res){

});
app.post('/create', webmakerAuth.handlers.create);
app.post('/logout', webmakerAuth.handlers.logout);
app.post('/check-username', webmakerAuth.handlers.exists);

// Declare routes
routes( app );

port = env.get( "PORT", 9090 );
var server = http.createServer( app );
server.listen(9090);

socketServer( server );

module.exports = app;
