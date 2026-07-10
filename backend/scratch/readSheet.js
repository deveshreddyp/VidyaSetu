const xlsx = require('xlsx');
const path = require('path');

const filePath = path.resolve(__dirname, '../../TYL UG Batch 2023-27.xlsx');
const workbook = xlsx.readFile(filePath);

const sheetName = 'UG-CSE'; // Reading specific branch sheet
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log("Sheet Name:", sheetName);
console.log("Rows 0-5:");
console.log(JSON.stringify(data.slice(0, 6), null, 2));
