const fs = require('fs');
const path = require('path');
const _ = require('underscore');

function getDirectories(srcpath) {
    return fs.readdirSync(srcpath).filter(function(file) {
        return fs.statSync(path.join(srcpath, file)).isDirectory();
    });
}

module.exports = {
    loadCards: function(path) {
        var cards = {};

        _.each(getDirectories(path), directory => {
            var normalisedPath = path.join(__dirname, directory);

            _.each(fs.readdirSync(normalisedPath), file => {
                var plot = require('./' + directory + '/' + file);

                cards[plot.code] = plot;
            });
        });

        return cards;
    }
};    
