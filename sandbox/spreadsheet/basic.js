const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = require('./config/credential.json');

(async () => {
  /* SW 마에스트로 회의실 링크 */
  const doc = new GoogleSpreadsheet(link);
  /* 기본 인증 절차 */
  await doc.useServiceAccountAuth(creds);
  /* 초기에 1번만 로딩해두면 나머지 정보를 다 쓸수 있게 설정되어 있음*/
  await doc.loadInfo();
  /* Get Title */
  console.log(doc.title);

  /* Print All spreadsheet Name */
  /*
  const length = doc.sheetCount;
  for (let i = 0; i < length; ++ i) {
    console.log(doc.sheetsByIndex[i].title);
  }
  */

  /* 특정 날짜의 Sheet 를 가져오기 */
  const sheetName = "4/30(금)";
  const sheet = doc.sheetsByTitle[sheetName];
  //console.log(sheet);

  /* 특정 Cell에 접근하기 */
  await sheet.loadCells('A1:P30');
  const K16 = sheet.getCellByA1('K16');
  console.log(K16.value);

  /* 특정 Cell에 데이터 쓰기 */
  /* 실제로 반영되니까 주석 해제 함부로 하지마세요 */
  /*
  const K30 = sheet.getCellByA1('K30');
  K30.value = "이민욱";
  await sheet.saveUpdatedCells();
  */
})();
