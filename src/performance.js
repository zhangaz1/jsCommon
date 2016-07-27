;
(function(netBrain) {
    'use strict';

    Function.prototype.performance ||
        (Function.prototype.performance = performance);

    return void(0);

    function performance() {
        var fn = this;

        return function(msg) {
            var key = msg || fn.name || getTime();

            console.group(key);
            console.timeline(key);
            console.profile(key);
            console.timeStamp(key + ': start');
            console.time(key);

            var result = fn.apply(this, arguments);

            console.timeEnd(key);
            console.timeStamp(key + ': end');
            console.profileEnd(key);
            console.timelineEnd(key);
            console.groupEnd(key);

            return result;
        };
    }

    function getTime() {
        return(new Date()).getTime();
    }

})(NetBrain);
