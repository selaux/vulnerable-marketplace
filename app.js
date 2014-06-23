var express = require('express'),
    exphbs  = require('express3-handlebars'),
    app = express();

app.engine('hbs', exphbs({
    extname: '.hbs',
    defaultLayout: 'main'
}));
app.set('view engine', 'hbs');

app.get('/', function(req, res){
    res.render('index');
});

app.listen(3000);
