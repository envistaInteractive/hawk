'use strict';

// Load modules

const Url = require('url');
const Code = require('code');
const Hawk = require('../lib');
const Hoek = require('hoek');
const Lab = require('lab');


// Declare internals

const internals = {};


// Test shortcuts

const lab = exports.lab = Lab.script();
const describe = lab.experiment;
const it = lab.test;
const expect = Code.expect;


describe('Uri', () => {

    const credentialsFunc = function (id, callback) {

        const credentials = {
            id,
            key: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
            algorithm: (id === '1' ? 'sha1' : 'sha256'),
            user: 'steve'
        };

        return callback(null, credentials);
    };

    it('should generate a bewit then successfully authenticate it', (done) => {

        const req = {
            method: 'GET',
            url: '/resource/4?a=1&b=2',
            host: 'example.com',
            port: 80
        };

        credentialsFunc('123456', (err, credentials1) => {

            expect(err).to.not.exist();

            const bewit = Hawk.uri.getBewit('http://example.com/resource/4?a=1&b=2', { credentials: credentials1, ttlSec: 60 * 60 * 24 * 365 * 100, ext: 'some-app-data' });
            req.url += '&bewit=' + bewit;

            Hawk.uri.authenticate(req, credentialsFunc, {}, (err, credentials2, attributes) => {

                expect(err).to.not.exist();
                expect(credentials2.user).to.equal('steve');
                expect(attributes.ext).to.equal('some-app-data');
                done();
            });
        });
    });

    it('should generate a bewit then successfully authenticate it (no ext)', (done) => {

        const req = {
            method: 'GET',
            url: '/resource/4?a=1&b=2',
            host: 'example.com',
            port: 80
        };

        credentialsFunc('123456', (err, credentials1) => {

            expect(err).to.not.exist();

            const bewit = Hawk.uri.getBewit('http://example.com/resource/4?a=1&b=2', { credentials: credentials1, ttlSec: 60 * 60 * 24 * 365 * 100 });
            req.url += '&bewit=' + bewit;

            Hawk.uri.authenticate(req, credentialsFunc, {}, (err, credentials2, attributes) => {

                expect(err).to.not.exist();
                expect(credentials2.user).to.equal('steve');
                done();
            });
        });
    });

    it('should successfully authenticate a request (last param)', (done) => {

        const req = {
            method: 'GET',
            url: '/resource/4?a=1&b=2&bewit=MTIzNDU2XDQ1MTE0ODQ2MjFcMzFjMmNkbUJFd1NJRVZDOVkva1NFb2c3d3YrdEVNWjZ3RXNmOGNHU2FXQT1cc29tZS1hcHAtZGF0YQ',
            host: 'example.com',
            port: 8080
        };

        Hawk.uri.authenticate(req, credentialsFunc, {}, (err, credentials, attributes) => {

            expect(err).to.not.exist();
            expect(credentials.user).to.equal('steve');
            expect(attributes.ext).to.equal('some-app-data');
            done();
        });
    });

    it('should successfully authenticate a request (first param)', (done) => {

        const req = {
            method: 'GET',
            url: '/resource/4?bewit=MTIzNDU2XDQ1MTE0ODQ2MjFcMzFjMmNkbUJFd1NJRVZDOVkva1NFb2c3d3YrdEVNWjZ3RXNmOGNHU2FXQT1cc29tZS1hcHAtZGF0YQ&a=1&b=2',
            host: 'example.com',
            port: 8080
        };

        Hawk.uri.authenticate(req, credentialsFunc, {}, (err, credentials, attributes) => {

            expect(err).to.not.exist();
            expect(credentials.user).to.equal('steve');
            expect(attributes.ext).to.equal('some-app-data');
            done();
        });
    });

    it('should successfully authenticate a request (only param)', (done) => {

        const req = {
            method: 'GET',
            url: '/resource/4?bewit=MTIzNDU2XDQ1MTE0ODQ2NDFcZm1CdkNWT3MvcElOTUUxSTIwbWhrejQ3UnBwTmo4Y1VrSHpQd3Q5OXJ1cz1cc29tZS1hcHAtZGF0YQ',
            host: 'example.com',
            port: 8080
        };

        Hawk.uri.authenticate(req, credentialsFunc, {}, (err, credentials, attributes) => {

            expect(err).to.not.exist();
            expect(credentials.user).to.equal('steve');
            expect(attributes.ext).to.equal('some-app-data');
            done();
        });
    });

    it('should fail on multiple authentication', (done) => {

        const req = {
            method: 'GET',
            url: '/resource/4?bewit=MTIzNDU2XDQ1MTE0ODQ2NDFcZm1CdkNWT3MvcElOTUUxSTIwbWhrejQ3UnBwTmo4Y1VrSHpQd3Q5OXJ1cz1cc29tZS1hcHAtZGF0YQ',
            host: 'example.com',
            port: 8080,
            authorization: 'Basic asdasdasdasd'
        };

        Hawk.uri.authenticate(req, credentialsFunc, {}, (err, credentials, attributes) => {

            expect(err).to.exist();
            expect(err.output.payload.message).to.equal('Multiple authentications');
            done();
        });
    });

    it('should fail on method other than GET', (done) => {

        credentialsFunc('123456', (err, credentials1) => {

            expect(err).to.not.exist();

            const req = {
                method: 'POST',
                url: '/resource/4?filter=a',
                host: 'example.com',
                port: 8080
            };

            const exp = Math.floor(Hawk.utils.now() / 1000) + 60;
            const ext = 'some-app-data';
            const mac = Hawk.crypto.calculateMac('bewit', credentials1, {
                ts: exp,
                nonce: '',
                method: req.method,
                resource: req.url,
                host: req.host,
                port: req.port,
                ext
            });

            const bewit = credentials1.id + '\\' + exp + '\\' + mac + '\\' + ext;

            req.url += '&bewit=' + Hoek.base64urlEncode(bewit);

            Hawk.uri.authenticate(req, credentialsFunc, {}, (err, credentials2, attributes) => {

                expect(err).to.exist();
                expect(err.output.payload.message).to.equal('Invalid method');
                done();
            });
        });
    });

    it('should fail on invalid host header', (done) => {

        const req = {
            method: 'GET',
            url: '/resource/4?bewit=MTIzNDU2XDQ1MDk5OTE3MTlcTUE2eWkwRWRwR0pEcWRwb0JkYVdvVDJrL0hDSzA1T0Y3MkhuZlVmVy96Zz1cc29tZS1hcHAtZGF0YQ',
            headers: {
                host: 'example.com:something'
            }
        };

        Hawk.uri.authenticate(req, credentialsFunc, {}, (err, credentials, attributes) => {

            expect(err).to.exist();
            expect(err.output.payload.message).to.equal('Invalid Host header');
            done();
        });
    });

    it('should fail on empty bewit', (done) => {

        const req = {
            method: 'GET',
            url: '/resource/4?bewit=',
            host: 'example.com',
            port: 8080
        };

        Hawk.uri.authenticate(req, credentialsFunc, {}, (err, credentials, attributes) => {

            expect(err).to.exist();
            expect(err.output.payload.message).to.equal('Empty bewit');
            expect(err.isMissing).to.not.exist();
            done();
        });
    });

    it('should fail on invalid bewit', (done) => {

        const req = {
            method: 'GET',
            url: '/resource/4?bewit=*',
            host: 'example.com',
            port: 8080
        };

        Hawk.uri.authenticate(req, credentialsFunc, {}, (err, credentials, attributes) => {

            expect(err).to.exist();
            expect(err.output.payload.message).to.equal('Invalid bewit encoding');
            expect(err.isMissing).to.not.exist();
            done();
        });
    });

    it('should fail on missing bewit', (done) => {

        const req = {
            method: 'GET',
            url: '/resource/4',
            host: 'example.com',
            port: 8080
        };

        Hawk.uri.authenticate(req, credentialsFunc, {}, (err, credentials, attributes) => {

            expect(err).to.exist();
            expect(err.output.payload.message).to.not.exist();
            expect(err.isMissing).to.equal(true);
            done();
        });
    });

    it('should fail on invalid bewit structure', (done) => {

        const req = {
            method: 'GET',
            url: '/resource/4?bewit=abc',
            host: 'example.com',
            port: 8080
        };

        Hawk.uri.authenticate(req, credentialsFunc, {}, (err, credentials, attributes) => {

            expect(err).to.exist();
            expect(err.output.payload.message).to.equal('Invalid bewit structure');
            done();
        });
    });

    it('should fail on empty bewit attribute', (done) => {

        const req = {
            method: 'GET',
            url: '/resource/4?bewit=YVxcY1xk',
            host: 'example.com',
            port: 8080
        };

        Hawk.uri.authenticate(req, credentialsFunc, {}, (err, credentials, attributes) => {

            expect(err).to.exist();
            expect(err.output.payload.message).to.equal('Missing bewit attributes');
            done();
        });
    });

    it('should fail on missing bewit id attribute', (done) => {

        const req = {
            method: 'GET',
            url: '/resource/4?bewit=XDQ1NTIxNDc2MjJcK0JFbFhQMXhuWjcvd1Nrbm1ldGhlZm5vUTNHVjZNSlFVRHk4NWpTZVJ4VT1cc29tZS1hcHAtZGF0YQ',
            host: 'example.com',
            port: 8080
        };

        Hawk.uri.authenticate(req, credentialsFunc, {}, (err, credentials, attributes) => {

            expect(err).to.exist();
            expect(err.output.payload.message).to.equal('Missing bewit attributes');
            done();
        });
    });

    it('should fail on expired access', (done) => {

        const req = {
            method: 'GET',
            url: '/resource/4?a=1&b=2&bewit=MTIzNDU2XDEzNTY0MTg1ODNcWk1wZlMwWU5KNHV0WHpOMmRucTRydEk3NXNXTjFjeWVITTcrL0tNZFdVQT1cc29tZS1hcHAtZGF0YQ',
            host: 'example.com',
            port: 8080
        };

        Hawk.uri.authenticate(req, credentialsFunc, {}, (err, credentials, attributes) => {

            expect(err).to.exist();
            expect(err.output.payload.message).to.equal('Access expired');
            done();
        });
    });

    it('should fail on credentials function error', (done) => {

        const req = {
            method: 'GET',
            url: '/resource/4?bewit=MTIzNDU2XDQ1MDk5OTE3MTlcTUE2eWkwRWRwR0pEcWRwb0JkYVdvVDJrL0hDSzA1T0Y3MkhuZlVmVy96Zz1cc29tZS1hcHAtZGF0YQ',
            host: 'example.com',
            port: 8080
        };

        Hawk.uri.authenticate(req, (id, callback) => {

            callback(Hawk.error.badRequest('Boom'));
        }, {}, (err, credentials, attributes) => {

            expect(err).to.exist();
            expect(err.output.payload.message).to.equal('Boom');
            done();
        });
    });

    it('should fail on credentials function error with credentials', (done) => {

        const req = {
            method: 'GET',
            url: '/resource/4?bewit=MTIzNDU2XDQ1MDk5OTE3MTlcTUE2eWkwRWRwR0pEcWRwb0JkYVdvVDJrL0hDSzA1T0Y3MkhuZlVmVy96Zz1cc29tZS1hcHAtZGF0YQ',
            host: 'example.com',
            port: 8080
        };

        Hawk.uri.authenticate(req, (id, callback) => {

            callback(Hawk.error.badRequest('Boom'), { some: 'value' });
        }, {}, (err, credentials, attributes) => {

            expect(err).to.exist();
            expect(err.output.payload.message).to.equal('Boom');
            expect(credentials.some).to.equal('value');
            done();
        });
    });

    it('should fail on null credentials function response', (done) => {

        const req = {
            method: 'GET',
            url: '/resource/4?bewit=MTIzNDU2XDQ1MDk5OTE3MTlcTUE2eWkwRWRwR0pEcWRwb0JkYVdvVDJrL0hDSzA1T0Y3MkhuZlVmVy96Zz1cc29tZS1hcHAtZGF0YQ',
            host: 'example.com',
            port: 8080
        };

        Hawk.uri.authenticate(req, (id, callback) => {

            callback(null, null);
        }, {}, (err, credentials, attributes) => {

            expect(err).to.exist();
            expect(err.output.payload.message).to.equal('Unknown credentials');
            done();
        });
    });

    it('should fail on invalid credentials function response', (done) => {

        const req = {
            method: 'GET',
            url: '/resource/4?bewit=MTIzNDU2XDQ1MDk5OTE3MTlcTUE2eWkwRWRwR0pEcWRwb0JkYVdvVDJrL0hDSzA1T0Y3MkhuZlVmVy96Zz1cc29tZS1hcHAtZGF0YQ',
            host: 'example.com',
            port: 8080
        };

        Hawk.uri.authenticate(req, (id, callback) => {

            callback(null, {});
        }, {}, (err, credentials, attributes) => {

            expect(err).to.exist();
            expect(err.message).to.equal('Invalid credentials');
            done();
        });
    });

    it('should fail on invalid credentials function response (unknown algorithm)', (done) => {

        const req = {
            method: 'GET',
            url: '/resource/4?bewit=MTIzNDU2XDQ1MDk5OTE3MTlcTUE2eWkwRWRwR0pEcWRwb0JkYVdvVDJrL0hDSzA1T0Y3MkhuZlVmVy96Zz1cc29tZS1hcHAtZGF0YQ',
            host: 'example.com',
            port: 8080
        };

        Hawk.uri.authenticate(req, (id, callback) => {

            callback(null, { key: 'xxx', algorithm: 'xxx' });
        }, {}, (err, credentials, attributes) => {

            expect(err).to.exist();
            expect(err.message).to.equal('Unknown algorithm');
            done();
        });
    });

    it('should fail on invalid credentials function response (bad mac)', (done) => {

        const req = {
            method: 'GET',
            url: '/resource/4?bewit=MTIzNDU2XDQ1MDk5OTE3MTlcTUE2eWkwRWRwR0pEcWRwb0JkYVdvVDJrL0hDSzA1T0Y3MkhuZlVmVy96Zz1cc29tZS1hcHAtZGF0YQ',
            host: 'example.com',
            port: 8080
        };

        Hawk.uri.authenticate(req, (id, callback) => {

            callback(null, { key: 'xxx', algorithm: 'sha256' });
        }, {}, (err, credentials, attributes) => {

            expect(err).to.exist();
            expect(err.output.payload.message).to.equal('Bad mac');
            done();
        });
    });

    describe('getBewit()', () => {

        it('returns a valid bewit value', (done) => {

            const credentials = {
                id: '123456',
                key: '2983d45yun89q',
                algorithm: 'sha256'
            };

            const bewit = Hawk.uri.getBewit('https://example.com/somewhere/over/the/rainbow', { credentials, ttlSec: 300, localtimeOffsetMsec: 1356420407232 - Hawk.utils.now(), ext: 'xandyandz' });
            expect(bewit).to.equal('MTIzNDU2XDEzNTY0MjA3MDdca3NjeHdOUjJ0SnBQMVQxekRMTlBiQjVVaUtJVTl0T1NKWFRVZEc3WDloOD1ceGFuZHlhbmR6');
            done();
        });

        it('returns a valid bewit value (explicit port)', (done) => {

            const credentials = {
                id: '123456',
                key: '2983d45yun89q',
                algorithm: 'sha256'
            };

            const bewit = Hawk.uri.getBewit('https://example.com:8080/somewhere/over/the/rainbow', { credentials, ttlSec: 300, localtimeOffsetMsec: 1356420407232 - Hawk.utils.now(), ext: 'xandyandz' });
            expect(bewit).to.equal('MTIzNDU2XDEzNTY0MjA3MDdcaFpiSjNQMmNLRW80a3kwQzhqa1pBa1J5Q1p1ZWc0V1NOYnhWN3ZxM3hIVT1ceGFuZHlhbmR6');
            done();
        });

        it('returns a valid bewit value (null ext)', (done) => {

            const credentials = {
                id: '123456',
                key: '2983d45yun89q',
                algorithm: 'sha256'
            };

            const bewit = Hawk.uri.getBewit('https://example.com/somewhere/over/the/rainbow', { credentials, ttlSec: 300, localtimeOffsetMsec: 1356420407232 - Hawk.utils.now(), ext: null });
            expect(bewit).to.equal('MTIzNDU2XDEzNTY0MjA3MDdcSUdZbUxnSXFMckNlOEN4dktQczRKbFdJQStValdKSm91d2dBUmlWaENBZz1c');
            done();
        });

        it('returns a valid bewit value (parsed uri)', (done) => {

            const credentials = {
                id: '123456',
                key: '2983d45yun89q',
                algorithm: 'sha256'
            };

            const bewit = Hawk.uri.getBewit(Url.parse('https://example.com/somewhere/over/the/rainbow'), { credentials, ttlSec: 300, localtimeOffsetMsec: 1356420407232 - Hawk.utils.now(), ext: 'xandyandz' });
            expect(bewit).to.equal('MTIzNDU2XDEzNTY0MjA3MDdca3NjeHdOUjJ0SnBQMVQxekRMTlBiQjVVaUtJVTl0T1NKWFRVZEc3WDloOD1ceGFuZHlhbmR6');
            done();
        });

        it('errors on invalid options', (done) => {

            const bewit = Hawk.uri.getBewit('https://example.com/somewhere/over/the/rainbow', 4);
            expect(bewit).to.equal('');
            done();
        });

        it('errors on missing uri', (done) => {

            const credentials = {
                id: '123456',
                key: '2983d45yun89q',
                algorithm: 'sha256'
            };

            const bewit = Hawk.uri.getBewit('', { credentials, ttlSec: 300, localtimeOffsetMsec: 1356420407232 - Hawk.utils.now(), ext: 'xandyandz' });
            expect(bewit).to.equal('');
            done();
        });

        it('errors on invalid uri', (done) => {

            const credentials = {
                id: '123456',
                key: '2983d45yun89q',
                algorithm: 'sha256'
            };

            const bewit = Hawk.uri.getBewit(5, { credentials, ttlSec: 300, localtimeOffsetMsec: 1356420407232 - Hawk.utils.now(), ext: 'xandyandz' });
            expect(bewit).to.equal('');
            done();
        });

        it('errors on invalid credentials (id)', (done) => {

            const credentials = {
                key: '2983d45yun89q',
                algorithm: 'sha256'
            };

            const bewit = Hawk.uri.getBewit('https://example.com/somewhere/over/the/rainbow', { credentials, ttlSec: 3000, ext: 'xandyandz' });
            expect(bewit).to.equal('');
            done();
        });

        it('errors on missing credentials', (done) => {

            const bewit = Hawk.uri.getBewit('https://example.com/somewhere/over/the/rainbow', { ttlSec: 3000, ext: 'xandyandz' });
            expect(bewit).to.equal('');
            done();
        });

        it('errors on invalid credentials (key)', (done) => {

            const credentials = {
                id: '123456',
                algorithm: 'sha256'
            };

            const bewit = Hawk.uri.getBewit('https://example.com/somewhere/over/the/rainbow', { credentials, ttlSec: 3000, ext: 'xandyandz' });
            expect(bewit).to.equal('');
            done();
        });

        it('errors on invalid algorithm', (done) => {

            const credentials = {
                id: '123456',
                key: '2983d45yun89q',
                algorithm: 'hmac-sha-0'
            };

            const bewit = Hawk.uri.getBewit('https://example.com/somewhere/over/the/rainbow', { credentials, ttlSec: 300, ext: 'xandyandz' });
            expect(bewit).to.equal('');
            done();
        });

        it('errors on missing options', (done) => {

            const bewit = Hawk.uri.getBewit('https://example.com/somewhere/over/the/rainbow');
            expect(bewit).to.equal('');
            done();
        });
    });
});

