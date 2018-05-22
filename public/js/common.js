function pad(n, width) {
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
}

function startInterval(callback, timeout) {
    callback();
    return setInterval(callback, timeout);
}

function remainDay(unixtime, callback) {
    var gap = unixtime * 1000 - new Date().getTime();
    callback(Math.floor(gap / 86400000));
}

function remainTime(unixtime, callback) {
    var gap = unixtime * 1000 - new Date().getTime();
    var day = Math.floor(gap / 86400000);
    gap = gap - day * 86400000;
    var hour = Math.floor(gap / 3600000);
    gap = gap - hour * 3600000;
    var minute = Math.floor(gap / 60000);
    gap = gap - minute * 60000;
    var seconds = Math.floor(gap / 1000);
    callback(pad(hour, 2), pad(minute, 2), pad(seconds, 2));
}
