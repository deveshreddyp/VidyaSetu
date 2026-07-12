const googleSheetsService = require('../src/services/googleSheetsService');

async function main() {
  try {
    console.log("Fetching sheets...");
    const names = await googleSheetsService.getSheetNames();
    console.log("Names:", names);
    if (names.length > 0) {
      const data = await googleSheetsService.getSheetData(names[0]);
      console.log(`Sheet 1 has ${data.length} rows`);
      console.log("Header:", data[1]);
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}
main();
