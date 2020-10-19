const express = require('express');
const ejs = require('ejs');
const pm = require('path');     // path module
const ut = require('./util');
const dm = require('./db/db-module');
const vm = require('./view/view-module');
const alert = require('./view/alertMsg');

const bRouter = express.Router();
const path = pm.join(__dirname, 'view/template');
bRouter.get('/list/:page', (req, res) => {
    let page = parseInt(req.params.page);
    req.session.currentPage = page;
    let offset = (page - 1) * 10;
    dm.getBbsTotalCount(result => {
        let totalPage = Math.ceil(result.count / 10);
        let startPage = Math.floor((page-1)/10)*10 + 1;
        let endPage = Math.ceil(page/10)*10;
        endPage = (endPage > totalPage) ? totalPage : endPage;
        dm.getBbsList(offset, rows => {
            let navBar = vm.navBar(req.session.uname?req.session.uname:'개발자');
            let trs = vm.bbsList_trs(rows);
            let pages = vm.bbsList_pages(page, startPage, endPage, totalPage);
            ejs.renderFile('./view/bbsList.ejs', {
                //path: path, navBar: navBar, trs: trs, pages: pages
                path, navBar, trs, pages
            }, (error, html) => {
                res.send(html);
            });
        });
    });
});

bRouter.post('/search', ut.isLoggedIn, (req, res) => {
    let keyword = '%' + req.body.keyword + '%';
    console.log(keyword);
    dm.getSearchList(keyword, rows => {
        let navBar = vm.navBar(req.session.uname?req.session.uname:'개발자');
        let trs = vm.bbsList_trs(rows);
        let search = req.body.keyword;
        ejs.renderFile('./view/bbsSearchList.ejs', {
            path, navBar, trs, search
        }, (error, html) => {
            res.send(html);
        });
    })
});

bRouter.get('/bid/:bid', ut.isLoggedIn, (req, res) => {
    let bid = parseInt(req.params.bid);
    dm.getBbsData(bid, result => {
        dm.increaseViewCount(bid, () => {
            dm.getReplyData(bid, replies => {
                let navBar = vm.navBar(req.session.uname?req.session.uname:'개발자');
                let cards = vm.bbsView_cards(replies);
                ejs.renderFile('./view/bbsView.ejs', {
                    path, navBar, result, cards
                }, (error, html) => {
                    res.send(html);
                });
            });
        });
    });
});

bRouter.post('/reply', ut.isLoggedIn, (req, res) => {
    let bid = parseInt(req.body.bid);
    let uid = req.session.uid;
    let content = req.body.content;
    let isMine = (uid === req.body.uid) ? 1 : 0;
    let params = [bid, uid, content, isMine];
    dm.insertReply(params, () => {
        dm.increaseReplyCount(bid, () => {
            res.redirect(`/bbs/bid/${bid}`)
        });
    });
});

bRouter.get('/write', ut.isLoggedIn, (req, res) => {
    let navBar = vm.navBar(req.session.uname?req.session.uname:'개발자');
    ejs.renderFile('./view/bbsWrite.ejs', {
        path, navBar
    }, (error, html) => {
        res.send(html);
    });
});

bRouter.post('/write', ut.isLoggedIn, (req, res) => {
    let title = req.body.title;
    let content = req.body.content;
    let params = [req.session.uid, title, content];
    console.log(req.body);
    dm.insertBbs(params, () => {
        res.redirect('/bbs/list/1');
    });
});

bRouter.get('/update/:bid/uid/:uid', ut.isLoggedIn, (req, res) => {
    let bid = req.params.bid;
    let uid = req.params.uid;
    if (uid !== req.session.uid) {
        let html = alert.alertMsg('수정 권한이 없습니다.', `/bbs/bid/${bid}`);
        res.send(html);
    } else {
        dm.getBbsData(bid, result => {
            let navBar = vm.navBar(req.session.uname?req.session.uname:'개발자');
            ejs.renderFile('./view/bbsUpdate.ejs', {
                path, navBar, result
            }, (error, html) => {
                res.send(html);
            });
        });
    }
});

bRouter.post('/update', ut.isLoggedIn, (req, res) => {
    let bid = req.body.bid;
    let title = req.body.title;
    let content = req.body.content;
    let params = [title, content, bid];
    dm.updateBbs(params, () => {
        res.redirect(`/bbs/bid/${bid}`);
    });
});

bRouter.get('/delete/:bid/uid/:uid', ut.isLoggedIn, (req, res) => {
    let bid = req.params.bid;
    let uid = req.params.uid;
    if (uid !== req.session.uid) {
        let html = alert.alertMsg('삭제 권한이 없습니다.', `/bbs/bid/${bid}`);
        res.send(html);
    } else {
        let navBar = vm.navBar(req.session.uname?req.session.uname:'개발자');
        ejs.renderFile('./view/bbsDelete.ejs', {
            path, navBar, bid
        }, (error, html) => {
            res.send(html);
        });
    }
});

bRouter.get('/deleteConfirm/:bid', ut.isLoggedIn, (req, res) => {
    let bid = req.params.bid;
    let page = parseInt(req.session.currentPage);
    dm.deleteBbs(bid, () => {
        res.redirect(`/bbs/list/${page}`);
    });
});

module.exports = bRouter;