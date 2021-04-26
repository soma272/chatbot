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


async function crawlAsync() {
    const mentoringList = await crawlMentoring();
    
    // console.log(mentoringList[0]);
    let date = new Date();
    const key = `mentorings:${date.getDate()}:${date.getHours()}`
    
    client.set(key, JSON.stringify(mentoringList));
    
    client.get(key, function (err, res) {
        console.log("=====crawlMentoring res======");
        // console.log(JSON.parse(res));
    })
};


function findLastId() {
    let lastId = 1;
    let date = new Date();
    

    return lastId;
}

// 1분마다 크롤링
cron.schedule("*/1 * * * *", async () => {
    console.log("running a task every 15 minutes");
    await crawlAsync();
    // const lastId = await findLastId();
    
});


// 1시간마다(매시 02분에) 전송
// cron.schedule("* 2 * * * *", async () => {
cron.schedule("*/1 * * * *", async () => {
    console.log("02분 -> 메세지 전송");
    let date = new Date();
    console.log("find last ID")
    
    let last_id;
    let prev = new Date();

    // TODO : -2 가 맞음!!
    prev.setHours(prev.getHours() - 1);
    // lastId check
    const prevKey = `mentorings:${prev.getDate()}:${prev.getHours()}`;
    
    client.get(prevKey, function (err, res) {
        let prevMentoringList = JSON.parse(res);
        if (prevMentoringList) {
            lastId = prevMentoringList[0]["id"];
            console.log(`last id func ${lastId}`)
        } else {
            console.log("prevMentoringList null");
        }
    })
    
    // 비동기여서?
    console.log(`lastID ${lastId}`);
    
    const currentKey = `mentorings:${date.getDate()}:${date.getHours() - 1}`;

    client.get(currentKey, function(err, res){
        let mentoringList = JSON.parse(res);
        // console.log(mentoringList[0]);
        
        if (mentoringList[0]["id"]*1 != lastId){
            console.log("=======new mentorings!========")
            // 새로 올라온 멘토링 존재
            
            // TODO: 알림톡 전송
            // kakaowork api 사용
            
            // 인터페이스쪽한테 ???
            // 라우트도 굳이??
            


        } else {
            console.log("=======No new mentorings========")
            // 새로운 멘토링 없음. 알림톡 X
        }
    });
    
    // 
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
