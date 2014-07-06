var fs = require('fs'),
    _ = require('lodash'),
    express = require('express'),
    exphbs  = require('express3-handlebars'),
    bodyParser = require('body-parser'),
    multer  = require('multer'),
    cookieSession = require('cookie-session'),
    mysql = require('mysql'),
    config = require('./config.json'),
    app = express(),
    sql = mysql.createConnection(config.mysql);

sql.connect();

app.set('views', __dirname + '/views');
app.engine('hbs', exphbs({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: __dirname + '/views/layouts'
}));
app.set('view engine', 'hbs');

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(multer());
app.use(cookieSession({
    signed: false
}));

function getDefaultData(req) {
    var defaultData = {
        pageTitle: config.title,
        isLoggedIn: req.session.loggedIn,
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
    var minPrice = parseFloat(req.query.min, 10) * 100,
        maxPrice = parseFloat(req.query.max, 10) * 100,
        query = 'SELECT * FROM products WHERE ';

    if (req.query.min && !_.isNaN(minPrice)) {
        query += '(price >= ' + minPrice + ') AND ';
    }
    if (req.query.max && !_.isNaN(maxPrice)) {
        query += '(price <= ' + maxPrice + ') AND ';
    }

    query += '(1=1);';

    sql.query(query, function (err, rows) {
        if (err) {
            res.render('index', _.extend(getDefaultData(req), {
                minPrice: '',
                maxPrice: '',
                products: []
            }));
        }

        res.render('index', _.extend(getDefaultData(req), {
            minPrice: minPrice / 100,
            maxPrice: maxPrice / 100,
            products: _.map(rows, function (it) {
                return {
                    id: it.id,
                    name: it.name,
                    description: it.description,
                    image: new Buffer( it.image, 'binary' ).toString('base64'),
                    price: (it.price / 100) + ' EUR',
                    isMine: it.user === req.session.loggedInAs
                };
            })
        }));
    });


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

app.get('/edit', function (req, res) {
    if (req.session.loggedIn) {
        res.render('edit');
    } else {
        res.send(403);
    }
});

app.get('/edit/:id', function (req, res) {
    var id = req.params.id,
        query = 'SELECT * FROM products WHERE (id = ' + id + ');';

    if (req.session.loggedIn) {
        sql.query(query, function (err, rows) {
            if (err) {
                console.log(err, query);
                res.send(500);
            } else {
                if (rows.length > 0) {
                    res.render('edit', _.extend(getDefaultData(req), rows[0]));
                } else {
                    res.send(404);
                }
            }
        });
    } else {
        res.send(403);
    }
});

app.post('/update', function (req, res) {
    var formValues = _.pick(req.body, 'name', 'price', 'description'),
        image,
        query,
        doUpdate = function () {
            formValues = {
                name: '"' + formValues.name + '"',
                user: '"' + req.session.loggedInAs + '"',
                price: formValues.price.toString(),
                description: '"' + formValues.description + '"'
            };
            if (image) {
                image = '0x' + image;
                formValues.image = image;
            }

            if (req.body.id) {
                formValues = _(formValues).omit('user').map(function (val, key) {
                    return key + '=' + val;
                }).values();
                query = 'UPDATE `products` SET ' + formValues.join(', ') + ' WHERE id=' + req.body.id + ';';
            } else {
                formValues = [
                    formValues.name,
                    formValues.user,
                    formValues.price,
                    formValues.image,
                    formValues.description
                ];
                query = 'INSERT INTO `products` (`name`, `user`, `price`, `image`, `description`) VALUES (' + formValues.join(', ') + ');';
            }
            sql.query(query, function (err) {
                if (err) {
                    console.log(err, query);
                    res.send(500);
                } else {
                    res.redirect('/');
                }
            });
        };

    if (!req.session.loggedIn) {
        return res.send(403);
    }
    if (!_.all(formValues)) {
        return res.send(500, 'Not all values provided');
    }
    if (!req.files.image && !req.body.id) {
        return res.send(500, 'No image provided');
    }

    if (req.files.image) {
        fs.readFile(req.files.image.path, { encoding: 'hex' }, function (err, readImage) {
            if (err) {
                return res.send(500);
            }
            image = readImage;
            doUpdate();
        });
    } else {
        doUpdate();
    }
});

app.listen(3000);
