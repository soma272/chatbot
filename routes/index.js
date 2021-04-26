// routes/index.js
const express = require('express');
const router = express.Router();


const libKakaoWork = require('../libs/kakaoWork');
const { crawlMentoring } = require("../crawl.js");

router.get('/', async (req, res, next) => {
    // 유저 목록 검색 (1)
    const users = await libKakaoWork.getUserList();
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