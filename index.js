var http = require("http");
var util = require('util');
var encoding = require("encoding");//编码转换工具

var timeOut = 5;//s, 错误超时的检查间隔
var timeSuccess = 600;//s, 成功登录的检测间隔

var en = function (string) {
    //页面编码转换
    return encoding.convert(string, "utf-8", "GBK", false);
};

//var proxy = '10.109.0.47:8118';//设置代理，经过测验HTTP代理没法登录
var proxy = '';//代理无效

/**
 * 生成普通页面数据
 * @param url
 * @returns {*}
 */
var build_url = function (url) {
    if (proxy === null || proxy == '') {
        return url;
    }
    var _p = proxy.split(':');
    if (_p.length != 2) {
        return url;
    }
    return {
        host: _p[0],
        port: _p[1],
        path: url
    };
};

/**
 * 生成POST提交额数据
 * @param url
 * @param headers
 * @returns {{host: *, port: *, path: *, method: string, headers: *}}
 */
var build_post = function (url, headers) {
    var no_proxy = function () {
        return util._extend(require('url').parse(url), {
            method: "POST",
            headers: headers
        });
    };
    if (proxy === null || proxy == '') {
        return no_proxy();
    }
    var _p = proxy.split(':');
    if (_p.length != 2) {
        return no_proxy();
    }
    return {
        host: _p[0],
        port: _p[1],
        path: url,
        method: "POST",
        headers: headers
    };
};

/**
 * 时间格式化工具
 * @param fmt
 * @returns {*}
 * @constructor
 * @author  meizz
 */
Date.prototype.Format = function (fmt) {
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
};

/**
 * 日志记录方法
 * @param msg
 * @param type
 */
var log = function (msg, type) {
    type = type || 'log';
    type = console.hasOwnProperty(type) ? type : 'log';
    console[type]("[" + new Date().Format("yyyy-MM-dd hh:mm:ss") + "]: " + msg);
};

/**
 * 开始发生登录表单
 */
var login = function () {
        log("begin login");
        var post = "DDDDD=cjdx&upass=e0f30abb961ad32fd019aa8a4a1881ae123456781&R1=0&R2=1&para=00&0MKKey=123456";
        var req = http.request(build_post("http://10.10.240.250/a70.htm", {
                Referer: "http://10.10.240.250/a70.htm",
                Cookie: "md5_login=cjdx%7Ccjdx",
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": post.length
            }
        ), function (res) {
            var data = new Buffer(0);
            res.on("data", function (r) {
                data = Buffer.concat([data, r]);
            });
            res.on("end", function () {
                var r = en(data).toString();
                if (r.indexOf("注 销 (Logout)") > -1) {
                    //成功登录
                    log("Login success.");
                    logged();
                }
            });
        }).on("error", function (e) {
            log("POST a70.html, error:" + e.message, 'error');
            logged();
        });
        req.write(post);
        req.end();
    }
    ;

/**
 * 登录后的操作
 */
var logged = function () {
    //log("Logged");//忽略成功执行的状态
    setTimeout(run, timeSuccess * 1000);//登录成功的检测间隔
};

/**
 * 登录页面检查
 */
var loginPage = function () {
    http.get(build_url("http://10.10.240.250/a70.htm"), function (res) {
        var data = new Buffer(0);
        res.on("data", function (r) {
            data = Buffer.concat([data, r]);
        });
        res.on("end", function () {
            var r = en(data).toString();
            if (r.indexOf("长江大学校园网登录页面") > -1) {
                //Start Login Form
                login();
            } else {
                //CheckError
                try_again();
            }
        });
    }).on('error', function (e) {
        log("GET a70.html, error:" + e.message, 'error');
        try_again();
    });
};

/**
 * 程序执行检查
 */
var run = function () {
    http.get(build_url("http://10.10.240.250/"), function (res) {
        var data = new Buffer(0);
        res.on("data", function (r) {
            data = Buffer.concat([data, r]);
        });
        res.on("end", function () {
            var checkPage = en(data).toString();
            if (checkPage.indexOf("value=\"注 销 (Logout)\" class=\"btn\"") > 0) {
                logged();
            } else {
                loginPage();
            }
        });
    }).on('error', function (e) {
        //连接出错，请求登录页面
        log("GET /, error:" + e.message, 'error');
        loginPage();
    });
};

/**
 * 页面异常，重新执行
 */
var try_again = function () {
    log("try again");
    setTimeout(run, timeOut * 1000);
};


//----程序执行开始----------------------------------------
log("Start.");
run();