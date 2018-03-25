/*
 STEEM Account Recovery From Password v1.0 - by @drakos
 A NodeJS script to recover a forgotten account name using the password. The script uses steemsql.com's database.

 SETUP:
 - Install NodeJS (https://nodejs.org).
 - Create a folder for your project and go into it.
 - Copy the script into a file, e.g. recover_account.js.
 - Alternatively:
   git clone https://github.com/Jolly-Pirate/steem-recover-account && cd recover-account
 - Install the steem, mssql, command-line-args and mongodb packages into your project folder (don't use mssql 4.x)
   npm install

 USAGE:
 Run the script from the project's folder with:
 node recover_account.js -p YOURPASSWORD -s startdate (-e enddate)

 The dates are in the format year/mm/dd

 For example, using a single day search:
 node recover_account.js -p YOURPASSWORD -s 2017/12/01

 Or if searching on a range of dates (takes longer of course):
 node recover_account.js -p YOURPASSWORD -s 2017/12/01 -e 2017/12/05
 */

var steem = require("steem"),
    cliOptionsDefinitions = [
        { name: 'mongodb', alias: 'm', type: Boolean, defaultOption: false },
        { name: 'password', alias: 'p', type: String },
        { name: 'startdate', alias: 's', type: String },
        { name: 'enddate', alias: 'e', type: String }
    ],
    commandLineArgs = require('command-line-args'),
    cliOptions = commandLineArgs(cliOptionsDefinitions),
    benchmarkStart = new Date(),
    config = {},
    benchmarkEnd, benchmarkDiff, created, mongo, sql;

if (!cliOptions.password || !cliOptions.startdate) {
    console.log('Please provide a password and start date (and optionally an end date if different from start date):');
    console.log('node recover_account.js -p P5xxxxxxxxxxxxxxxxxx -s YYYY/MM/DD -e YYYY/MM/DD');
    process.exit();
}

if (!cliOptions.enddate) {
    cliOptions.enddate = cliOptions.startdate;
}

if (cliOptions.mongodb) {
    // Using the Mongo database from steemdata.com
    mongo = require('mongodb').MongoClient;

    // Reformat date strings
    cliOptions.startdate = cliOptions.startdate.replace(/\//g, '-');
    cliOptions.enddate = cliOptions.enddate.replace(/\//g, '-');
} else {
    // Using the database from steemsql.com
    sql = require('mssql');

    /**
     * Steem SQL free account is now disabled, either signup for a paid account or use MongoDB (-m in CLI)
     *
     * @type {{user: string, password: string, server: string, port: number, database: string}}
     */
    config = {
        user: "steemit",
        password: "steemit",
        server: "sql.steemsql.com",
        port: 1433,
        database: 'DBSteem'
    };
}

steem.api.setOptions({url: "https://api.steemit.com"});

getAccountFromPassword(cliOptions.password, cliOptions.startdate, cliOptions.enddate); // Run the function

/**
 * Brute force recordSet to find an account matching the password
 *
 * @param password
 * @param recordSet
 */
function findAccount(password, recordSet) {
    for(var i=0; i<recordSet.length; i++) {
        var record = recordSet[i];
        // Values on the blockchain
        name = record.name;
        memokeyBlockchain = record.memo_key;

        // We only need one of the public keys, let's pick the memo key
        roles = ["memo"];
        memokeyDerived = steem.auth.getPrivateKeys(name, password, roles).memoPubkey;

        console.log("Checking", (i + 1) + "/" + recordSet.length, name);
        if (memokeyBlockchain === memokeyDerived) {
            benchmarkEnd = new Date();  // End benchmark
            benchmarkDiff = (benchmarkEnd - benchmarkStart) / 1000;
            created = record.created;

            console.log("Found account :\t", name);
            console.log("Creation date :\t", created);
            console.log("Memo pubkey   :\t", memokeyBlockchain);
            console.log("Process took  :\t", benchmarkDiff, "sec");

            break; // Break the loop when the result is found
        }
    }
}

/**
 * Connect to the remote DB to find accounts created during the given date range
 * and try to find account that uses the given password
 *
 * @param password
 * @param dateStart
 * @param dateEnd
 */
function getAccountFromPassword(password, dateStart, dateEnd) {
    console.log('Searching for account using password '+ password +' from '+ dateStart +' to '+ dateEnd);

    if (cliOptions.mongodb) {
        var mongoUrl = 'mongodb://steemit:steemit@mongo1.steemdata.com:27017/?authMechanism=SCRAM-SHA-1&authSource=SteemData';
        mongo.connect(mongoUrl, function(err, db) {
            if (err) {
                console.log(err);
                db.close()
            } else {
                var SteemData = db.db('SteemData');
                var collection = SteemData.collection('Accounts');

                collection.﻿find({
                    "recovery_account": "steem",
                    "created": {
                        "$gte": new Date(dateStart + "T00:00:00Z"),
                        "$lte": new Date(dateEnd + "T23:59:59Z")
                    }
                })
                .project({name: 1, created: 1, memo_key: 1})
                .toArray(function(err, recordSet) {
                    findAccount(password, recordSet);
                    db.close();
                });
            }
        });
    } else {
        var dbConn = new sql.Connection(config);
        dbConn.connect().then(function () {
            var request = new sql.Request(dbConn);
            dateStart = "'" + dateStart + " 00:00:00'";
            dateEnd = "'" + dateEnd + " 23:59:59'";
            var query = "SELECT name,created,memo_key FROM Accounts WHERE created BETWEEN " + dateStart + " AND " + dateEnd + " ORDER BY name ASC";

            request.query(query).then(function (recordSet) {
                findAccount(password, recordSet);
                dbConn.close();
            }).catch(function (err) {
                console.log(err);
                dbConn.close();
            });
        }).catch(function (err) {
            console.log(err);
        });
    }
}