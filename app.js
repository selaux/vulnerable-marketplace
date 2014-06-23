var _ = require('lodash'),
    express = require('express'),
    exphbs  = require('express3-handlebars'),
    bodyParser = require('body-parser'),
    cookieSession = require('cookie-session'),
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
    var defaultData = {};
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
            errorMessage: 'Login Failed',
            redirectTo: req.body.redirectTo
        }));
    }
});

app.listen(3000);
