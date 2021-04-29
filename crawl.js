// crawl.js
const Config = require('config');

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');


const somaId = Config.keys.swm.id;
const somaPwd = Config.keys.swm.pwd;
const boards = [];
const boardTitle = [];

exports.isActivate = false;
exports.crawlMentoring = async function (lastId) {
    try {
        const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox'] });

        const page = await browser.newPage();
        await page.goto("https://swmaestro.org/sw/mypage/mentoLec/list.do?menuNo=200046",
            await page.on('dialog', async dialog => {
                console.log("(alert window)")
                console.log(dialog.message());
                await dialog.accept();
            }),
        );

        /* Soma 페이지 로그인 */
        await page.type('#username', somaId);
        await page.type('#password', somaPwd);
        await page.click('.btn_blue2');
        await page.waitForNavigation();

        /* 멘토링 게시판의 Last page 추출 */
        pagination_data = await page.evaluate(() => document.querySelector('.paginationSet').outerHTML);
        const $p = await cheerio.load(pagination_data);
        const lastPageHref = $p('.end').find("a").attr("href")
        const firstIndex = lastPageHref.indexOf("?") + 1;
        const lastIndex = lastPageHref.length - 1;
        const queryString = lastPageHref.substring(firstIndex, lastIndex + 1).split("&");
        let lastPage = 1;

        for (let i = 0; i < queryString.length; i++) {
            var arr = queryString[i].split("=");

            if (arr.length != 2) {
                break;
            }

            if (arr[0] == "pageIndex") {
                lastPage = arr[1] * 1
                break;
            }
        }

        /* first ~ last page 반복 */
        // for (let pageIndex = 1; pageIndex < lastPage + 2; pageIndex++) {
        for (let pageIndex = 1; pageIndex < 2; pageIndex++) {
            let data = await page.evaluate(() => document.querySelector('table').outerHTML);
            let $ = await cheerio.load(data);

            /* 게시글 Table head 추출 */
            if (pageIndex == 1) {
                let getBoardTitle = $("th").each(function (i, element) {
                    boardTitle[i] = $(this).text().trim();
                });
            }

            /* 게시글 크롤링 후 map에 저장 */
            const getBoardTbody = $("tbody").find('tr').each(function (i, trElement) {
                let map = {};
                $(this).find('td').each(function (j, tdElement) {
                    // 0, 1, 3, 4, 6
                    // id, 제목, 날짜, 인원, 작성자
                    if (j == 0) {
                        map['id'] = $(this).text().trim();
                    } else if (j == 1) { // [제목] a태그만 필요한 정보를 담고 있음
                        map['title'] = $(this).find('a').text().trim();
                    } else if (j == 3) {    
                        map['date'] = new Date($(this).text().trim()).getTime() / 1000;
                    } else if (j == 4) {    
                        map['limit'] = $(this).text().trim();
                    } else if (j == 6) {    
                        map['mentor'] = $(this).text().trim();

                    } 
                })
                
                boards[(pageIndex - 1) * 10 + i] = map;
            });

            if (pageIndex == lastPage) {
                break;
            }

            /* go to next page */
            await page.goto(`https://swmaestro.org/sw/mypage/mentoLec/list.do?menuNo=200046&pageIndex=${pageIndex + 1}`,
                await page.on('dialog', async dialog => {
                    /* alert 창 확인 처리 */
                    await dialog.accept();
                }),
            );
        }
        await browser.close();
		
		// lastId보다 큰 id 값 세기위한 count
		let count = 0;
		for (let board of boards) {
			 let id=(Object.values(board))[0];
			 //현재 id가 레지스 lastId 보다 작거나 같으면 loop 나감
			 if(id<=lastId){
				break;
				}
			//현재 id가 크다면 count 1증가
			count += 1;
		}
		
		// 레디스에 저장된 lastId기준으로 큰 멘토링 글만 리턴
        return boards.splice(0, count);
				
        // return boards;

    } catch (error) {
        console.error(error);
    }

}

// module.exports = crawl;

