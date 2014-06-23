var _ = require('lodash'),
    express = require('express'),
    exphbs  = require('express3-handlebars'),
    bodyParser = require('body-parser'),
    cookieSession = require('cookie-session'),
    config = require('./config.json'),
    app = express();

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
        redirectTo: req.query.redirectTo
    }));
});

app.post('/login', function(req, res) {
    if (req.body.username == 'admin' && req.body.password === 'password') {
        req.session.loggedInAs = 'admin';
        req.session.loggedIn = true;
        res.redirect(req.body.redirectTo);
    } else {
        res.render('login', _.extend(getDefaultData(req), {
            errorMessage: 'Login Failed for user ' + req.body.username,
            redirectTo: req.body.redirectTo
        }));
    }
});

app.get('/logout', function (req, res) {
    req.session = null;
    res.redirect('/');
});

app.listen(3000);
