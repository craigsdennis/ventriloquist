'use strict';

const Alexa = require('alexa-sdk');
const https = require('https');

const APP_ID = 'amzn1.ask.skill.37c38d6c-cbbb-41de-9ec3-9c09c6cf78a1';
// TEMP
const SCRIPT_URL = 'https://gist.githubusercontent.com/7footmoustache/65d1f9bc81d6dee2a2a0f024109362f8/raw/b4a572447999bccbcd6624cab7265b761c6317be/script.ssml';

function getLines(callback) {
    var request = https.get(SCRIPT_URL, (res) => {
        let data = '';
        res.on('data', function (chunk) {
            data += chunk;
        });
        res.on('end', function () {
            let lines = data.split(/\r?\n/);
            callback(null, lines.filter(line => line.length > 0));
        });
    });
    request.on('error', function (e) {
        callback(e, null);
    });
    request.end();

}

const handlers = {
    'LaunchRequest': function () {
        this.emit('GetDummyLine');
    },
    'GetNewDummyLineIntent': function () {
        this.emit('GetDummyLine');
    },
    'GetDummyLine': function () {
        // Attributes are session based
        getLines((err, lines) => {
            if (err) {
                this.emit(':tell', 'Something went really wrong: ' + err.message);
                throw err;
            }
            let lineIndex = this.attributes.lineIndex;
            if (lineIndex === undefined) {
                lineIndex = -1;
            }
            lineIndex++;
            this.attributes.lineIndex = lineIndex;
            const line = lines[lineIndex];

            // Create speech output
            this.emit(':ask', line);
        });

    },
    'AMAZON.HelpIntent': function () {
        this.emit(':ask', 'Derp', 'Derp');
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', 'Peace!');
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', 'See you later aligator!');
    },
};

exports.handler = function (event, context) {
    const alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};
