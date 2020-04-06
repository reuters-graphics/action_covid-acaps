const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const siteUrl = 'https://www.acaps.org/covid19-government-measures-dataset';
const scrapeACAPSWebsite = async () => {
  const result = await axios.get(siteUrl);
  return cheerio.load(result.data);
};

const extractLatestURL = async () => {
  const $ = await scrapeACAPSWebsite();
  const latestURL = $('.field-item > .file > a').attr('href');
  return latestURL;
};

const SOURCE_PATH = path.resolve(__dirname, 'data/latest.xlsx');
async function downloadLatestXLSX() {
  const xlsx_path_latest = await extractLatestURL();
  const writer = fs.createWriteStream(SOURCE_PATH);

  const response = await axios({
    url: xlsx_path_latest,
    method: 'GET',
    responseType: 'stream',
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

const run = async () => {
  try {
    await downloadLatestXLSX();
  } catch (err) {
    throw err;
  }
};

run();
