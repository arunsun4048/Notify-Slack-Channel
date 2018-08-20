var url = require('url');
var https = require('https');
var util = require('util');
var Intercom = require('intercom-client');



var POST_OPTIONS = {
    hostname: 'hooks.slack.com',
    path: process.env.SLACK_WEBHOOK,
    method: 'POST',
  };

var _getUsersCreatedInThisIteration = function(token) {
    var client = new Intercom.Client({
        token: token
    });
    var promise = new Promise(function(resolve, reject){
        client.users.list(function(err, users) {
            if(err) {
                resolve(0);
            }
            var users = users.body.users;
            var count = 0;
            var d = (new Date()).getTime();

            for(var i = 0; i < users.length; i++) {
                if((users[i].created_at * 1000) > d - (10 * 60 * 1000)) {
                    count++;
                }
            }
            resolve(count);
        });
    });
    return promise;
}

exports.handler = (event, context, callback) => {
    var users = event.users;
    
    console.log("The user list is", event.users);
    var date = new Date();
    
    _getUsersCreatedInThisIteration(process.env.INTERCOM_ACCESS_TOKEN).then(function(count) {
        var status = count ? count + " users were imported into the intercom in this sync" : "No new users were imported in this sync";
        const message = {
            channel: '#teamsecrets-support',
            "attachments": [
                {
                    "title": "Atlassian to Intercom Sync",
                    "title_link": "https://app.intercom.io/a/apps/ppvk3ywm/users/segments/all-users",
                    "text": "The atlassian to intercom sync ran successfully on " + date.toUTCString() + ". " + status,
                    "color": "#764FA5"
                }
            ]
        };
        var r = https.request(POST_OPTIONS, function(res) {
                    res.setEncoding('utf8');
                    res.on('data', function (data) {
                        context.succeed("Message Sent: " + data);
                    });
                }).on("error", function(e) {context.fail("Failed: " + e);} );
        r.write(util.format("%j", message));
        r.end();
    });
};
