const cron = require("node-cron");

const { crawlMentoring } = require("./crawl.js");

async function crawlAsync() {
	const last_id=446;	
    const mentoringList = await crawlMentoring();
	let count=0; 
	for (let mentoring of mentoringList) {
 		 //console.log(mentoring);
		let id=(Object.values(mentoring))[0];
 		 //console.log(id);
		 if(id<=last_id){
			break;
		}
		count+=1;
	}
	//console.log(count);
	
	/*마지막 id 기준으로 그 뒤에 온것들 출력*/
	console.log(mentoringList.splice(0,count));
        
};
crawlAsync()


// development
//cron.schedule("*/1 * * * *", async () => {
//    console.log("running a task every two minutes");
//    await crawlAsync();
//}); 

// production
// cron.schedule("*/2 * * * *", async () => {
//     await crawlAsync();
// });