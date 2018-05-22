function post(url, data, success, complete) {

    $.ajax({
        url: url,
        type: 'post',
        dataType: 'json',
        data: data,
        success: function (data) {
            if (success) {
                success(data);
            }
        },
        complete: function () {
            if (complete) {
                complete();
            }
        }
    });
}

function get(url, success, complete) {

    $.ajax({
        url: url,
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (success) {
                success(data);
            }
        },
        complete: function () {
            if (complete) {
                complete();
            }
        }
    });
}
