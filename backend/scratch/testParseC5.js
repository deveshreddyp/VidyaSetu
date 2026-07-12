const xlsx = require('xlsx');

function testParse() {
  const workbook = xlsx.readFile('TYL UG Batch 2023-27.xlsx');
  const sheet = workbook.Sheets['UG-CSE'];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  const subjectNames = data[1];
  const maxMarks = data[2];
  const passMarks = data[3];
  
  let emailIndex = 1;
  const row = data[4]; // First student
  
  const results = [];
  
  for (let c = 0; c < subjectNames.length; c++) {
    if (c === emailIndex || c < 5) continue;
    
    const subjName = subjectNames[c];
    const rawMarkVal = row[c];
    let markVal = parseFloat(rawMarkVal);
    let maxMark = parseFloat(maxMarks[c]);
    let passMark = parseFloat(passMarks[c]);
    
    if (subjName && typeof subjName === 'string') {
      if (subjName.trim() === 'C2 Full') maxMark = 25;
      
      if (!subjName.toLowerCase().includes('level') && !subjName.toLowerCase().includes('empty')) {
        if (rawMarkVal !== undefined && rawMarkVal !== null && !isNaN(markVal) && !isNaN(maxMark) && !isNaN(passMark)) {
          results.push({ subject: subjName.trim(), mark: markVal, max: maxMark, pass: passMark, isAbsent: false });
        } else if (rawMarkVal === undefined || rawMarkVal === null || isNaN(markVal)) {
          if (!isNaN(maxMark) && !isNaN(passMark)) {
            results.push({ subject: subjName.trim(), mark: 0, max: maxMark, pass: passMark, isAbsent: true });
          } else {
            console.log(`Skipped ${subjName} because max/pass is NaN. max: ${maxMark}, pass: ${passMark}`);
          }
        }
      }
    }
  }
  
  console.log("Results for first student:");
  results.forEach(r => {
    if (r.subject.includes('C5')) {
      console.log('->', r);
    }
  });
}

testParse();
