const xlsx = require('xlsx');
const path = require('path');

const filePath = path.resolve(__dirname, '../../TYL UG Batch 2023-27.xlsx');
const workbook = xlsx.readFile(filePath);

console.log("Sheets available:", workbook.SheetNames);

['UG-AIDS', 'UG-CSDS'].forEach(sheetName => {
  if (workbook.SheetNames.includes(sheetName)) {
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`\n--- Sheet: ${sheetName} ---`);
    console.log("Headers:", data[0]);
    console.log("Row 1:", data[1]);
    console.log(`Total rows: ${data.length}`);
  } else {
    console.log(`\nSheet ${sheetName} not found!`);
  }
});
