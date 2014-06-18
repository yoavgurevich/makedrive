if ( process.env.NEW_RELIC_ENABLED ) {
  require( "newrelic" );
}

var express = require( "express" ),
    helmet = require( "helmet" ),
    Path = require( "path" ),
    http = require( "http" );

// Expose internals
var env = require( "./lib/environment" ),
    middleware = require( "./middleware" ),
    routes = require( "./routes" ),
    WebmakerAuth = require('webmaker-auth'),
    socketServer = require( "./lib/socket-server" );

var app = express();

var webmakerAuth = new WebmakerAuth({
  // required
  loginURL: env.get('LOGIN'),
  secretKey: env.get('SESSION_SECRET')
});

// General middleware
app.disable( "x-powered-by" );
app.use( helmet.contentTypeOptions() );
app.use( helmet.hsts() );
app.enable( "trust proxy" );
app.use( express.compress() );
app.use( express.static(Path.join(__dirname,'../client')) );
app.use( express.bodyParser() );
app.use( express.json() );
app.use( express.urlencoded() );
app.use( webmakerAuth.cookieParser() );
app.use( webmakerAuth.cookieSession() );
app.use( express.csrf() );

app.use( app.router );

app.use( middleware.errorHandler );
app.use( middleware.fourOhFourHandler );

function corsOptions ( req, res ) {
  res.header( "Access-Control-Allow-Origin", "*" );
}

// Declare routes
routes( app, webmakerAuth );

app.post('/verify', webmakerAuth.handlers.verify);
app.post('/authenticate', webmakerAuth.handlers.authenticate);
app.post('/create', webmakerAuth.handlers.create);
app.post('/logout', webmakerAuth.handlers.logout);
app.post('/check-username', webmakerAuth.handlers.exists);

port = env.get( "PORT", 9090 );
var server = http.createServer( app );
server.listen(9090);

socketServer( server );

module.exports = app;
