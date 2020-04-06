const AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: 'us-east-1' });

const BUCKET_NAME = 'graphics.thomsonreuters.com';

module.exports = async (data, filePath) => {
  const key = `data/2020/coronavirus/acaps-policy-measures/${filePath}`;

  console.log('Publishing to: ', `https://${BUCKET_NAME}/${key}`);

  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: JSON.stringify(data),
    CacheControl: 'no-cache',
    ACL: 'public-read',
    ContentType: 'application/json',
  };

  return new Promise((resolve, reject) => {
    s3.putObject(params, (err, data) => {
      if (err) reject(err);
      resolve();
    });
  });
};
