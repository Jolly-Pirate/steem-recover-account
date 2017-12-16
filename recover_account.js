/*
 STEEM Account Recovery From Password v1.0 - by @drakos
 A NodeJS script to recover a forgotten account name using the password. The script uses steemsql.com's database.

 SETUP:
 - Install NodeJS (https://nodejs.org).
 - Create a folder for your project and go into it.
 - Copy the script into a file, e.g. recover_account.js.
 - Alternatively:  
   git clone https://github.com/Jolly-Pirate/steem-recover-account && cd recover-account
 - Install the steem and  mssql packages into your project folder (don't use mssql 4.x):
   npm install steem@latest mssql@3.0.0

 USAGE:
 Run the script from the project's folder with:  
 node recover_account.js YOURPASSWORD startdate enddate
 The dates are in the format year/mm/dd
 For example, using a single day search:
 node recover_account.js YOURPASSWORD 2017/12/01 2017/12/01
 Or if searching on a range of dates (takes longer of course):
 node recover_account.js YOURPASSWORD 2017/12/01 2017/12/05
 */

var steem = require("steem");
var sql = require('mssql');

steem.api.setOptions({url: "https://api.steemit.com"});

// Get arguments from command line
var args = process.argv.slice(2);
console.log(JSON.stringify(args));

var password = args[0];
var dateStart = args[1];
var dateEnd = args[2];

var benchmarkStart = new Date();  // Start benchmark
var benchmarkEnd, benchmarkDiff, created;

// Using the database from steemsql.com
var config = {
  user: "steemit",
  password: "steemit",
  server: "sql.steemsql.com",
  port: 1433,
  database: 'DBSteem'
};

getAccountFromPassword(password, dateStart, dateEnd); // Run the function

function getAccountFromPassword(password, dateStart, dateEnd) {
  var dbConn = new sql.Connection(config);
  dbConn.connect().then(function () {
    var request = new sql.Request(dbConn);
    dateStart = "'" + dateStart + " 00:00:00'";
    dateEnd = "'" + dateEnd + " 23:59:59'";
    var query = "SELECT name,created,memo_key FROM Accounts WHERE created BETWEEN " + dateStart + " AND " + dateEnd + " ORDER BY name ASC";

    request.query(query).then(function (recordSet) {
      // Loop through the accounts
      for (i = 0; i < recordSet.length; ++i) {
        // Values on the blockchain
        name = recordSet[i].name;
        memokeyBlockchain = recordSet[i].memo_key;

        // We only need one of the public keys, let's pick the memo key
        roles = ["memo"];
        memokeyDerived = steem.auth.getPrivateKeys(name, password, roles).memoPubkey;

        console.log("Checking", (i + 1) + "/" + recordSet.length, name);
        if (memokeyBlockchain === memokeyDerived) {
          benchmarkEnd = new Date();  // End benchmark
          benchmarkDiff = (benchmarkEnd - benchmarkStart) / 1000;
          created = recordSet[i].created;
          console.log("Found account :\t", name);
          console.log("Creation date :\t", created);
          console.log("Memo pubkey   :\t", memokeyBlockchain);
          console.log("Process took  :\t", benchmarkDiff, "sec");
          break; // Break the loop when the result is found
        }
      }
      dbConn.close();
    }).catch(function (err) {
      console.log(err);
      dbConn.close();
    });
  }).catch(function (err) {
    console.log(err);
  });
}
