'use strict';
const express = require('express');
const router = express.Router();
const privacy = require('../../lib/privacy-utils');
const query = require('../../lib/Query');

router.route('/login')
    .get(function (req, res, next) {
        res.render('page/admin/auth/login');
    })
    .post(async function (req, res, next) {
        const email = req.body.email;
        const password = req.body.password;
        const encodePassword = await privacy.password(password);

        (async () => {
            const sql = 'SELECT adminNo, password FROM TB_ADMIN WHERE email = :email';
            const admin = await query.findOne(sql, {'email': privacy.encode(email)});
            if (!admin) {
                console.log('관리자를 찾을 수 없습니다. email : ' + email );
                console.log("email_enc : " + privacy.encode(email));
                return next({
                    'status': 403,
                    'message': '관리자 로그인이 실패하였습니다.'
                });
            }

            if (admin.password != encodePassword) {
                console.log('관리자 비밀번호가 맞지 않습니다.');
                return next({
                    'status': 403,
                    'message': '관리자 로그인이 실패하였습니다.'
                });
            }

            req.session.admin = {};
            req.session.admin.adminNo = admin.adminNo;
            req.session.admin.adminId = email;
            req.session.save();
            res.redirect(req.session.admin.redirectUrl || '/admin/');
        })();
    });

router.get('/logout', function (req, res, next) {
    req.session.admin = null;
    res.redirect('/admin/');
});

module.exports = router;
