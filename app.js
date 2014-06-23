var _ = require('lodash'),
    express = require('express'),
    exphbs  = require('express3-handlebars'),
    bodyParser = require('body-parser'),
    cookieSession = require('cookie-session'),
    mysql = require('mysql'),
    config = require('./config.json'),
    app = express(),
    sql = mysql.createConnection(config.mysql);

sql.connect();

app.engine('hbs', exphbs({
    extname: '.hbs',
    defaultLayout: 'main'
}));
app.set('view engine', 'hbs');

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cookieSession({
    signed: false
}));

function getDefaultData(req) {
    var defaultData = {
        pageTitle: config.title,
        showLogin: req.url.indexOf('/login') !== 0,
        currentUrl: encodeURIComponent(req.url)
    };
    if (req.session.loggedIn) {
        defaultData.loggedIn = true;
        defaultData.loggedInAs = req.session.loggedInAs;
    }
    return defaultData;
}

app.get('/', function(req, res) {
    res.render('index', getDefaultData(req));
});

app.get('/login', function(req, res) {
    res.render('login', _.extend(getDefaultData(req), {
        redirectTo: req.query.redirectTo || '/'
    }));
});

app.post('/login', function(req, res) {
    var username = req.body.username.replace(/[^a-zA-Z0-9]/g, ''),
        password = req.body.password.replace(';', '').replace('=', ''),
        query = 'SELECT * FROM users WHERE (username = "' + username + '" AND password = "' + password + '");';

    function failed() {
        res.render('login', _.extend(getDefaultData(req), {
            errorMessage: 'Login Failed for user ' + req.body.username,
            redirectTo: req.body.redirectTo
        }));
    }

    sql.query(query, function(err, rows) {
        if (err) {
            return failed();
        }

        if (rows.length > 0) {
            req.session.loggedInAs = rows[0].username;
            req.session.loggedIn = true;
            res.redirect(req.body.redirectTo);
        } else {
            failed();
        }
    });
});

app.get('/logout', function (req, res) {
    req.session = null;
    res.redirect('/');
});

app.listen(3000);
