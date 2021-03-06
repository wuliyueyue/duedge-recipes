Buffer.prototype.toByteArray = function () {return Array.prototype.slice.call(this, 0)};

const crypto = require('crypto');
const querystring = require("querystring");

const PREFIX = /^\/verify\//;

async function f(event) {
    const request = event.request;
    const uri = request.uri;

    // 符合格式的 path 进行签名校验
    if (PREFIX.test(uri)) {
        let params = querystring.parse(request.args);
        let encrypted = params.encrypted;
        if (encrypted) {
            const decipher = crypto.createDecipher('aes192', 'my key');

            // 解密
            try {
                let decrypted = decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
                if (decrypted.length < 14) {return {status: 403, body: 'request is invalid: decrypted is too short'};}

                let expire = Number(decrypted.slice(-13));
                if (isNaN(expire)) {return {status: 403, body: 'verify fail: expire is invalid'};}

                // 判断是否过期
                let now = Number(Date.now());
                if(now >= expire) {
                    return {
                        status: 403,
                        body: 'now    : ' + now + '\n'
                            + 'expired: ' + expire + '\n'
                            + 'this request is expired\n'
                    };
                }

                // 校验路径是否一致
                let signUri = decrypted.slice(0, decrypted.length - 13);
                let requestUri = uri.slice(7);
                if (signUri !== requestUri) {
                    return {
                        status: 403,
                        body: 'sign   : ' + signUri    + '\n'
                            + 'request: ' + requestUri + '\n'
                            + 'verify fail: uri is mismatch'
                    };
                }

                // 输出详细信息
                return {
                    status: 200,
                    body: 'decrypted: ' + decrypted  + '\n'
                        + 'now      : ' + now        + '\n'
                        + 'expire   : ' + expire     + '\n'
                        + 'sign     : ' + signUri    + '\n'
                        + 'request  : ' + requestUri + '\n'
                        + 'verify sucess'
                };
            } catch(err) {
                return {status: 403, body: 'request is invalid: ' + err};
            }
        } else {
            return {status: 403, body: 'request is invalid: encrypted is missing'};
        }
    } else {
        return {status: 200, body: 'skip verify'};
    }
}

exports.handler = f;