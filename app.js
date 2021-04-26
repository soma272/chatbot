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

// 첫 실행 시 마지막으로 크롤링된 값 초기 세팅
client.set('last_id', 1);

async function crawlAsync() {
    let lastId;
    client.get('last_id', function (err, res) {
        lastId = res * 1;
    })

    const mentoringList = await crawlMentoring(lastId);

    let date = new Date();
    const key = `mentorings:${date.getDate()}:${date.getHours()}`
    
    client.set(key, JSON.stringify(mentoringList));
    
    client.get(key, function (err, res) {
        console.log("=====crawlMentoring res======");
        console.log(JSON.parse(res)[0]);
        console.log("...");
    })
};


// 1분마다 크롤링 
// cron.schedule("*/1 * * * *", async () => {
//     console.log("running a task every 1 minute");
//     await crawlAsync();
//     // const lastId = await findLastId();
    
// });


// 1시간마다(매시 02분에) 전송
// 이 때 lastId 값 갱신

// 테스트 용으로 1분마다 실행
// 오류가 난다면 그 전 시간대의 데이터가 없을 확률 매우 높습니다.
// 미리 크롤링한 데이터만 있으면 가능!
// 아래 cron job 주석 처리 해두고 위에 크롤링먼저 돌려두면 될 확률 up!


// TODO: 실제 구름 환경에서 아래 주석 해제
// cron.schedule("* 2 * * * *", async () => {
cron.schedule("*/1 * * * *", async () => {
    console.log("02분 -> 메세지 전송");
    
    client.get('last_id', function(err, res){
        let lastId = res * 1;
        let date = new Date();
        // date.setHours(date.getHours() - 1); // TODO: 실 서비스 시 주석 해제
        const currentKey = `mentorings:${date.getDate()}:${date.getHours()}`;

        client.get(currentKey, function (err, res) {
            let mentoringList = JSON.parse(res);
            
            if (mentoringList && mentoringList[0]["id"] * 1 != lastId) {
                // 새로 올라온 멘토링 존재
                console.log("=======new mentorings!========")
                // TODO: kakaowork api 사용하여 알림톡 전송

                // 인터페이스쪽에서 진행해주시면 될 것 같습니다...!

                // 알림톡 전송 끝
                console.log(`last id is ${mentoringList[0]["id"] * 1}`)
                client.set('last_id', mentoringList[0]["id"] * 1)
            } else {
                console.log("=======No new mentorings========")
                // 새로운 멘토링 없음. 알림톡 X
            }
        });
    })
    
    
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
