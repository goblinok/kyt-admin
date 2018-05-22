'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../../lib/auth');

router.get('/', function (req, res, next) {

    if (auth.authAdminCheckAndRedirect(req, res)) {
        return;
    }

    res.render('page/admin/index.ejs');
});

module.exports = router;
