// routes/index.js
const express = require('express');
const router = express.Router();


const libKakaoWork = require('../libs/kakaoWork');
const crawl = require('../crawl.js');
const { crawlMentoring } = require("../crawl.js");

let timer = null;
router.get('/', async(req, res, next) => {
	const users = await libKakaoWork.getUserList();
	res.json({
		users
	});
});

router.get('/chatbot', async (req, res, next) => {
	if (crawl.isActivate) {
		res.json({
			message: '이미 활성화 되었습니다.'
		});
		return;
	}
	crawl.isActivate = true;
	console.log('활성화 되었습니다.');
    // 유저 목록 검색 (1)
    const users = await libKakaoWork.getUserList();
	const conversations = await Promise.all(
		users.map((user) => libKakaoWork.openConversations({ userId: user.id }))
	);
	const messages = await Promise.all([
		conversations.map((conversation) => {
			libKakaoWork.sendMessage({
				conversationId: conversation.id,
				text: '이칠이조(27조) 멘토링 알리미',
				blocks: [
					{ 
						type: 'header',
						text: '활성화 알림',
						style: 'blue'
					},
					{
						type: 'text',
						text: '소프트웨어 마에스트로 멘토링 알리미가 활성화 되었습니다.',
						markdown: true
					}
				]
			})
		})
	])
    res.json({
        users
    });
});


router.get('/mentorings', async (req, res, next) => {
    let date = new Date();
    let mentoringsList = {};

    const client = req.cache;

    client.exists(`mentorings:${date.getDate()}:${date.getHours()}`, function(err, res){
        console.log("==========/mentorings=======")
        console.log(res)
        console.log(err)
        if(res == 1){
            console.log("caching")
            client.get(`${date.getDate()}:${date.getHours()}`, function(err, res){
                console.log(res);
                mentoringsList = res;
            })
        } else {
            console.log("caching fail....");
            
        }
    })
    
    
    
    console.log(mentoringsList);

    res.json({
        mentoringsList
    });

})

module.exports = router;