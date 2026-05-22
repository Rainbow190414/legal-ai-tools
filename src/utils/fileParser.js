import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// 使用本地 worker
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function parseFile(file, password = '') {
  const name = file.name.toLowerCase();
  
  if (name.endsWith('.pdf')) {
    return await parsePDF(file, password);
  } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
    return await parseDocx(file);
  } else if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
    return await parseExcel(file);
  } else {
    return await file.text();
  }
}

export function isPDFFile(file) {
  return file.name.toLowerCase().endsWith('.pdf');
}

async function parsePDF(file, password = '') {
  const arrayBuffer = await file.arrayBuffer();
  
  const params = { data: arrayBuffer };
  if (password) {
    params.password = password;
  }
  
  let pdf;
  try {
    pdf = await pdfjsLib.getDocument(params).promise;
  } catch (err) {
    if (err.name === 'PasswordException' || (err.message && err.message.includes('password'))) {
      throw new Error('PASSWORD_REQUIRED');
    }
    throw new Error('PDF解析失败: ' + (err.message || '未知错误'));
  }
  
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += '\n--- 第 ' + i + ' 页 ---\n' + pageText + '\n';
  }
  
  return fullText.trim();
}

async function parseDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function parseExcel(file) {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  let fullText = '';
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    fullText += '\n--- 工作表: ' + sheetName + ' ---\n' + csv + '\n';
  }
  
  return fullText.trim();
}

export function getFileAcceptString() {
  return '.txt,.md,.json,.pdf,.docx,.doc,.xlsx,.xls,.csv';
}

export function getFileAcceptLabel() {
  return '支持格式：.txt, .md, .json, .pdf, .docx, .xlsx, .xls, .csv';
}
