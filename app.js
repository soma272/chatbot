const express = require('express');
const path = require('path');

const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const index = require('./routes/index');
const libKakaoWork = require('./libs/kakaoWork');

const redis = require("redis");
const client = redis.createClient(6379, "127.0.0.1");

const crawl = require("./crawl");
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
 cron.schedule("*/10 * * * *", async () => {
     console.log("running a task every 1 minute");
     await crawlAsync();    
 });


// 1시간마다(매시 02분에) 전송
// 이 때 lastId 값 갱신

// 테스트 용으로 1분마다 실행
// 오류가 난다면 그 전 시간대의 데이터가 없을 확률 매우 높습니다.
// 미리 크롤링한 데이터만 있으면 가능!
// 아래 cron job 주석 처리 해두고 위에 크롤링먼저 돌려두면 될 확률 up!


// TODO: 실제 구름 환경에서 아래 주석 해제
// cron.schedule("* 2 * * * *", async () => {
cron.schedule("*/1 * * * *", async () => {
	if (!crawl.isActivate) {
		console.log('not activate');
		return;
	}
    console.log("02분 -> 메세지 전송");
    
    client.get('last_id', function(err, res){
        let lastId = Number(res);

        let date = new Date();
        // date.setHours(date.getHours() - 1); // TODO: 실 서비스 시 주석 해제
        const currentKey = `mentorings:${date.getDate()}:${date.getHours()}`;

        client.get(currentKey, async function (err, res) {
            let mentoringList = JSON.parse(res);
            if (mentoringList && Number(mentoringList[0].id) != lastId) {
				const newMentorings = mentoringList.filter(e => Number(e.id) < lastId);
				
				const users = await libKakaoWork.getUserList();
				const conversations = await Promise.all(
					users.map((user) => libKakaoWork.openConversations({ userId: user.id }))
				);
				
				const convertedTalk = newMentorings.map(mentoring => {
					const d = new Date(mentoring.date * 1000);
					return ([
						{ type: 'text', text: `${mentoring.mentor} 멘토님` , markdown: true},
						{ type: 'text', text: mentoring.title , markdown: true},
						{ type: 'text', text: `신청기한 : ${d.getMonth() + 1}월 ${d.getDate()}일까지`, markdown:true},
						{ type: 'text', text: `접수인원 : ${mentoring.limit}`, markdown: true},
						{ type: 'divider'}
					]);
				}).reduce((acc, cur) => [...acc, ...cur]);
				
				await Promise.all([
					conversations.map((conversation) => {
						libKakaoWork.sendMessage({
							conversationId: conversation.id,
							text: '알리미',
							blocks: convertedTalk
						});
					})
				]);

				console.log(`${new Date().toLocaleString()} - has ${newMentorings.length} and last id : ${mentoringList[0].id}`);
                client.set('last_id', mentoringList[0]["id"] * 1)
            } else {
                console.log(`${new Date().toLocaleString()} - has no mentoring`);
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
