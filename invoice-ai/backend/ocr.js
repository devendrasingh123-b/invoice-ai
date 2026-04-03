const Tesseract = require('tesseract.js');
const fs = require('fs');

async function extractTextFromImage(filePath) {
  try {
    const result = await Tesseract.recognize(filePath, 'eng', {
      logger: () => {}
    });
    return result.data.text.trim();
  } catch (err) {
    throw new Error(`Image OCR failed: ${err.message}`);
  }
}

async function extractTextFromPDF(filePath) {
  return new Promise((resolve, reject) => {
    const { PdfReader } = require('pdfreader');
    const rows = {};
    
    new PdfReader().parseFileItems(filePath, (err, item) => {
      if (err) {
        reject(new Error(`PDF extraction failed: ${err.message}`));
        return;
      }
      
      if (!item) {
        // End of file — combine all text
        const text = Object.keys(rows)
          .sort((a, b) => a - b)
          .map(y => rows[y].join(' '))
          .join('\n');
        
        if (text.trim().length > 30) {
          console.log('✅ PDF text extracted successfully');
          resolve(text.trim());
        } else {
          reject(new Error('No text found in PDF'));
        }
        return;
      }
      
      if (item.text) {
        const y = item.y;
        if (!rows[y]) rows[y] = [];
        rows[y].push(item.text);
      }
    });
  });
}

async function extractText(filePath, mimeType) {
  if (mimeType === 'application/pdf') {
    return await extractTextFromPDF(filePath);
  } else if (['image/jpeg', 'image/png', 'image/jpg'].includes(mimeType)) {
    return await extractTextFromImage(filePath);
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

module.exports = { extractText };