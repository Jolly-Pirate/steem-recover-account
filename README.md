# steem-recover-account
## STEEM Account Recovery From Password v1.0 - by @drakos
A NodeJS script to recover a forgotten account name using the password. The script uses steemsql.com's database.
### SETUP
 - Install NodeJS (https://nodejs.org).
 - Create a folder for your project and go into it.
 - Copy the script into a file, e.g. recover_account.js.
 - Alternatively:  
 `git clone https://github.com/Jolly-Pirate/steem-recover-account && cd recover-account`  
 - Install the steem, mssql, command-line-args and mongodb packages into your project folder (don't use mssql 4.x)
 `npm install`

### USAGE
 Run the script from the project's folder with:  
 `node recover_account.js -p YOURPASSWORD -s startdate -e enddate`

 The dates are in the format `year/mm/dd`

 For example, using a single day search:  
 `node recover_account.js -p YOURPASSWORD -s 2017/12/01`

 Or if searching on a range of dates (takes longer of course):  
 `node recover_account.js -p YOURPASSWORD -s 2017/12/01 -e 2017/12/05`
