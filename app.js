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
        password = req.body.password.replace(/[;=]/g, ''),
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

app.get('/register', function (req, res) {
    res.render('register');
});

app.post('/register', function (req, res) {
    var username = req.body.username,
        password = req.body.password,
        password2 = req.body.password2,
        errors = [],
        query = 'INSERT INTO users VALUES ("' +  username + '", "' + password + '", 0);';

    if (username.length < 5 || username.length > 30 || !username.match('^[a-zA-Z0-9]+$')) {
        errors.push('The username should be 5 - 30 alphanumeric characters.');
    }
    if (password.match('[;=]')) {
        errors.push('= and ; are not allowed in the password.');
    }
    if (password.length < 5 || password.length > 30) {
        errors.push('The password should be 5 to 30 characters.')
    }
    if (password !== password2) {
        errors.push('The passwords do not match.')
    }

    if (errors.length === 0) {
        sql.query(query, function (err) {
            if (err) {
                console.log(err, query);
                return res.render('register', _.extend(getDefaultData(req), {
                    errorMessage: 'An error occured, try again later'
                }));
            }

            req.session.loggedIn = true;
            req.session.loggedInAs = username;
            res.redirect('/');
        });
    } else {
        res.render('register', _.extend(getDefaultData(req), {
            errorMessage: errors.join(' ')
        }));
    }
});

app.listen(3000);
