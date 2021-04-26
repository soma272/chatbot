const express = require('express');
const path = require('path');

const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const index = require('./routes/index');

const redis = require("redis");
const client = redis.createClient(6379, "127.0.0.1");

const { crawlMentoring } = require("./crawl.js");

const cron = require("node-cron");

const app = express();

app.use(logger('dev'));
app.use(cookieParser());

// redis
client.on("error", function (err) {
    console.log("Error " + err);
});

app.use(function(req, res, next){
    req.cache = client;
    next();
})



app.use('/', index);
client.set("test", "Node.js");


async function crawlAsync() {
    const mentoringList = await crawlMentoring();
    console.log(mentoringList)
    let date = new Date();
    console.log(`${date.getDate()}:${date.getHours()}`);
    client.set(`mentorings`, "test complete");
    
    client.set(`mentorings:test:${date.getHours()}`, "test hourcomplete");
    client.set(`mentorings:${date.getDate()}:${date.getHours()}`, str(mentoringList));
    client.hget(`mentorings:${date.getDate()}:${date.getHours()}`, function (err, res) {
        console.log("=====crawlAsync res======");
        console.log(res);
        console.log("=====crawlAsync err======");
        console.log(err);
        client.quit();
    })
};


// crawlAsync();
// development
cron.schedule("*/1 * * * *", async () => {
    console.log("running a task every 15 minutes");
    await crawlAsync();
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.json({ err });
});

app.listen(process.env.PORT || 3000, () => console.log('Example app listening on port 3000!'));

module.exports = app;
