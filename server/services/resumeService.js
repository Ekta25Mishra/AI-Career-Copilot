const fs = require("fs/promises");

const { PDFParse } = require("pdf-parse");

const extractTextFromPDF = async (filePath) => {
  const pdfBuffer = await fs.readFile(filePath);

  const parser = new PDFParse({
    data: pdfBuffer,
  });
  try {
    const result = await parser.getText();

    return {
      text: result.text,
      pages: result.total,
    };
  } finally {
    await parser.destroy();
  }
};

module.exports={extractTextFromPDF}
