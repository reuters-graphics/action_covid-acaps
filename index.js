const fs = require('fs');
const path = require('path');
const axios = require('axios');
const moment = require('moment');
const xlsx = require('node-xlsx');
const cheerio = require('cheerio');
const d3 = Object.assign({}, require('d3-collection'));

const publishJson = require('./lib/publishJSON.js');

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

//https://stackoverflow.com/questions/16229494/converting-excel-date-serial-number-to-date-using-javascript
const ExcelDateToJSDate = (date) =>
  new Date(Math.round((date - 25569) * 86400 * 1000));

const parseXLSX = async () => {
  // amazingly, there is a (presumably) hidden "Lists"
  // sheet in our Excel file, so "Database" is index [2], not [1]
  const parsedExcel = xlsx
    .parse(SOURCE_PATH)
    .filter((e) => e.name === 'Database')[0].data;

  const simplified = parsedExcel
    .map((e) => {
      return {
        countryName: e[1],
        countryISO: e[2],
        category: e[6],
        measures: e[7],
        comment: e[9],
        date: ExcelDateToJSDate(e[11]),
        datestring: moment(ExcelDateToJSDate(e[11])).format('DD/MM/YYYY'),
        source: e[12],
        source_type: e[13],
      };
    })
    .filter((e) => e.countryName !== 'COUNTRY');

  // jesus sorting dates is annoying
  const uniqueDates = simplified
    .map((e) => e.date.getTime())
    .filter((s, i, a) => a.indexOf(s) == i)
    .map((e) => new Date(e))
    .sort((a, b) => a - b)
    .map((e) => moment(e).format('DD/MM/YYYY'));

  const data = { series: uniqueDates, data: {} };

  const groupByCountry = d3
    .nest()
    .key((d) => d.countryName)
    .entries(simplified);

  for (let i = 0; i < groupByCountry.length; i++) {
    const country = groupByCountry[i].key;
    const countryData = groupByCountry[i].values;

    const simpleCountryData = data.series.map((e) => {
      const match = countryData.find((d) => d.datestring === e);
      if (match) {
        return {
          category: match.category,
          measures: match.measures,
          comment: match.comment,
          source: match.source,
          source_type: match.source_type,
        };
      }
    });
    data.data[country] = simpleCountryData;
  }

  writeJSONLocally(data, path.resolve(__dirname, 'data/latest_parsed.json'));

  await publishJson(data, 'latest.json');
};

const writeJSONLocally = (data, location) =>
  fs.writeFileSync(location, JSON.stringify(data, 4));

const run = async () => {
  try {
    await downloadLatestXLSX();
    await parseXLSX();
  } catch (err) {
    throw err;
  }
};

run();
