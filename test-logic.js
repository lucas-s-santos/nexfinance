const fs = require('fs');

const csvMap = {
  date: "Data",
  amount: "Valor",
  name: "Descricao",
  memo: "",
  type: ""
};

const csvData = {
  headers: ["Data", "Valor", "Descricao", "Extra"],
  rows: [
    ["12/09/2023", "45,00", "Ifood", "Some info"],
    ["15/09/2023", "-10,00", "Uber", "Another info"]
  ]
};

// mock parseCsvDate
const parseCsvDate = (value) => value;
const parseMoneyToNumber = (val) => parseFloat(val.replace(',', '.'));
const inferType = () => null;

const mappedIndices = new Set([0, 1, 2, -1, -1].filter(i => i >= 0));

const rows = csvData.rows.map((row, index) => {
  const rawDate = row[0];
  const rawAmount = row[1];
  const rawName = row[2];
  const rawMemo = ""; // memoIndex = -1
  const rawType = "";

  const date = parseCsvDate(rawDate);
  const name = rawName.trim();
  
  const extras = [];
  if (-1 >= 0 && rawMemo) extras.push(rawMemo.trim());
  
  csvData.headers.forEach((h, i) => {
    if (!mappedIndices.has(i)) {
      const val = row[i]?.trim();
      if (val) extras.push(`${h}: ${val}`);
    }
  });

  const memo = extras.join(" | ") || undefined;
  const parsedAmount = parseMoneyToNumber(rawAmount);

  return { date, name, memo, amount: parsedAmount };
});

console.log("CSV Rows:", rows);

// Also test PDF regex
const singleLineRegex = /^(\d{2}\/\d{2}(?:\/\d{4})?|\d{4}-\d{2}-\d{2}|\d{2}\s+(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)[A-Z]*)\s+(.+?)\s+(?:R\$?\s*)?(-?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})/i;

const txt = "12 SET Transferencia interbancaria R$ 1.500,00";
const match = txt.match(singleLineRegex);
console.log("PDF Match:", match);
