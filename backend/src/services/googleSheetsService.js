const { google } = require('googleapis');
const path = require('path');
const { admin } = require('../config/firebase');

class GoogleSheetsService {
  constructor() {
    this.spreadsheetId = '11PziTSalNNbQ_ZthDCOYH7Ca8hy6DCUtsmN-J1ynaUE';
    
    try {
      const keyFilePath = path.join(__dirname, '../../serviceAccountKey.json');
      const fs = require('fs');
      
      if (fs.existsSync(keyFilePath)) {
        this.auth = new google.auth.GoogleAuth({
          keyFile: keyFilePath,
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
      } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        this.auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          },
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
      } else {
        console.warn('Google Sheets Service: No credentials found.');
      }
      
      if (this.auth) {
        this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      }
    } catch (err) {
      console.error('Google Sheets Service Init Error:', err);
    }
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
