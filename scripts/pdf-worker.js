const fs = require("fs");
let pdfParse = require("pdf-parse");

if (typeof pdfParse !== "function") {
    if (pdfParse.default && typeof pdfParse.default === "function") {
        pdfParse = pdfParse.default;
    } else {
        try { pdfParse = require("pdf-parse/lib/pdf-parse.js"); } catch(e) {}
    }
}

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error("Caminho do PDF nao fornecido");
  process.exit(1);
}

const dataBuffer = fs.readFileSync(pdfPath);

if (typeof pdfParse !== "function") {
    console.error("Erro critico: pdf-parse nao exportou uma funcao.");
    process.exit(1);
}

pdfParse(dataBuffer).then(function(data) {
    console.log(data.text);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
