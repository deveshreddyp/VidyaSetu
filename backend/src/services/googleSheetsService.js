const { google } = require('googleapis');
const path = require('path');
const { admin } = require('../config/firebase');

class GoogleSheetsService {
  constructor() {
    this.spreadsheetId = '11PziTSalNNbQ_ZthDCOYH7Ca8hy6DCUtsmN-J1ynaUE';
    this.auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, '../../serviceAccountKey.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  async getSheetNames() {
    const metadata = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
    });
    return metadata.data.sheets.map(s => s.properties.title);
  }

  async getSheetData(sheetName) {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A1:AZ`,
    });
    return response.data.values || [];
  }
}

module.exports = new GoogleSheetsService();
