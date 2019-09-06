'use strict';

const request = require('request');
const async = require('async');
const ora = require('ora');
const chalk = require('chalk');
const { Parser } = require('json2csv');
const fs = require('fs');

const _indentSpinner = (iterator, total) => {
  let newIterator = iterator++;
  return 'Get accounts from lists' + chalk.grey(` - [${newIterator}/${total}]`)
}

const getListAccount = (options, item, results, cb) => {
  request(options, (err, res, body) => {
    const bodyParsed = JSON.parse(body);
    const accounts = bodyParsed.result.accounts;
    const pageList = accounts.map(x => {
      return {
        url: x.url,
        list: item.title
      }
    });
    results = [...results, ...pageList];
    if (bodyParsed.result.pagination.nextPage) {
      options.url = bodyParsed.result.pagination.nextPage;
      return getListAccount(options, item, results, cb);
    } else {
      cb(results);
    }
  });
}

const getListPages = (lists, token) => {
  let results = [];
  let i = 0;
  const spinner = ora(_indentSpinner(i, lists.length)).start();
  return new Promise((resolve, reject) => {
    async.eachOfLimit(lists, 20, (item, key, cb) => {
      const options = {
        url: `https://api.crowdtangle.com/lists/${item.id}/accounts?count=100`,
        headers: {
          'x-api-token': token
        }
      };
      getListAccount(options, item, [], (res) => {
        results = [...results, ...res];
        i++;
        spinner.text = _indentSpinner(i, lists.length);
        cb();
      })
    }, (err) => {
      if (err) {
        spinner.fail();
        reject(err);
      }
      spinner.succeed();
      resolve(results);
    })
  })
}

const getList = (token) => {
  const spinner = ora(`Retrieve lists`).start();
  return new Promise((resolve, reject) => {
    const options = {
      url: 'https://api.crowdtangle.com/lists',
      headers: {
        'x-api-token': token
      }
    };
    request(options, (err, res, body) => {
      if (err) {
        spinner.fail();
        throw new Error(err);
      }
      const parsedList = JSON.parse(body).result;
      spinner.succeed();
      resolve(parsedList);
    })
  });
}

const exportToCsv = (data, fields, output) => {
  const spinner = ora(`Export data to csv`).start();
  const opts = { fields };
  try {
    const parser = new Parser(opts);
    const csv = parser.parse(data);
    fs.writeFileSync(output, csv)
    spinner.succeed();
  } catch (err) {
    spinner.fail();
    throw new Error(err);
  }
}

module.exports = async (token, output) => {
  if (!token) {
    throw new Error('Crowdtangle-cli - Token is required.');
  }
  const data = await getList(token);
  const list = data.lists.filter(x => x.type === 'LIST');
  const pageList = await getListPages(list, token);
  exportToCsv(pageList, ['url', 'list'], output);
}