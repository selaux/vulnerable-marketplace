var express = require('express'),
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

app.get('/', function(req, res) {
    res.render('index');
});

app.get('/login', function(req, res) {
    res.render('login', {
        redirectTo: req.query.redirectTo
    });
});

app.post('/login', function(req, res) {
    if (req.body.username == 'admin' && req.body.password === 'password') {
        req.session.loggedInAs = 'admin';
        req.session.loggedIn = true;
        res.redirect(req.body.redirectTo);
    } else {
        res.render('login', {
            errorMessage: 'Login Failed',
            redirectTo: req.body.redirectTo
        });
    }
});

app.listen(3000);
