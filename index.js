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
  console.log(latestURL);
};

const run = async () => {
  try {
    await extractLatestURL();
  } catch (err) {
    throw err;
  }
};

run();
