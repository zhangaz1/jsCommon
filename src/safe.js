;
(function(netBrain) {
    'use strict';

    Function.prototype.safe ||
        (Function.prototype.safe = safe);

    return void(0);

    function safe() {
        var fn = this;

        return function() {
            try {
                return fn.apply(this, arguments);
            } catch(ex) {
                console.group('Safe Error');
                console.error(ex);
                console.log(fn);
                console.log(arguments);
                console.groupEnd('Safe Error');
            }
        };
    }

})(NetBrain);
