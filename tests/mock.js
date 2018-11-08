(function (root, factory) {
    define("mock", [], factory);
}(this, function () {
    var _ = converse.env._;
    var Promise = converse.env.Promise;
    var Strophe = converse.env.Strophe;
    var moment = converse.env.moment;
    var $iq = converse.env.$iq;
    var u = converse.env.utils;

    window.libsignal = {
        'SignalProtocolAddress': function (name, device_id) {
            this.name = name;
            this.deviceId = device_id;
        },
        'SessionCipher': function (storage, remote_address) {
            this.remoteAddress = remote_address;
            this.storage = storage;
            this.encrypt = () => Promise.resolve({
                'type': 1,
                'body': 'c1ph3R73X7',
                'registrationId': '1337' 
            });
            this.decryptPreKeyWhisperMessage = (key_and_tag) => {
                return Promise.resolve(key_and_tag);
            };

            this.decryptWhisperMessage = (key_and_tag) => {
                return Promise.resolve(key_and_tag);
            }
        },
        'SessionBuilder': function (storage, remote_address) {
            this.processPreKey = function () {
                return Promise.resolve();
            }
        },
        'KeyHelper': {
            'generateIdentityKeyPair': function () {
                return Promise.resolve({
                    'pubKey': new TextEncoder('utf-8').encode('1234'),
                    'privKey': new TextEncoder('utf-8').encode('4321')
                });
            },
            'generateRegistrationId': function () {
                return '123456789';
            },
            'generatePreKey': function (keyid) {
                return Promise.resolve({
                    'keyId': keyid,
                    'keyPair': {
                        'pubKey': new TextEncoder('utf-8').encode('1234'),
                        'privKey': new TextEncoder('utf-8').encode('4321')
                    }
                });
            },
            'generateSignedPreKey': function (identity_keypair, keyid) {
                return Promise.resolve({
                    'signature': new TextEncoder('utf-8').encode('11112222333344445555'),
                    'keyId': keyid,
                    'keyPair': {
                        'pubKey': new TextEncoder('utf-8').encode('1234'),
                        'privKey': new TextEncoder('utf-8').encode('4321')
                    }
                });
            }
        }
    };

    var mock = {};
    mock.view_mode = 'overlayed';

    // Names from http://www.fakenamegenerator.com/
    mock.req_names = [
        'Louw Spekman', 'Mohamad Stet', 'Dominik Beyer'
    ];
    mock.pend_names = [
        'Suleyman van Beusichem', 'Nanja van Yperen', 'Nicole Diederich'
    ];
    mock.cur_names = [
        'Max Frankfurter', 'Candice van der Knijff', 'Irini Vlastuin', 'Rinse Sommer', 'Annegreet Gomez',
        'Robin Schook', 'Marcel Eberhardt', 'Simone Brauer', 'Asmaa Haakman', 'Felix Amsel',
        'Lena Grunewald', 'Laura Grunewald', 'Mandy Seiler', 'Sven Bosch', 'Nuriye Cuypers'
    ];
    mock.num_contacts = mock.req_names.length + mock.pend_names.length + mock.cur_names.length;

    mock.groups = {
        'colleagues': 3,
        'friends & acquaintences': 3,
        'Family': 4,
        'ænemies': 3,
        'Ungrouped': 2
    };

    mock.chatroom_names = [
        'Dyon van de Wege', 'Thomas Kalb', 'Dirk Theissen', 'Felix Hofmann', 'Ka Lek', 'Anne Ebersbacher'
    ];
    // TODO: need to also test other roles and affiliations
    mock.chatroom_roles = {
        'Anne Ebersbacher': { affiliation: "owner", role: "moderator" },
        'Dirk Theissen': { affiliation: "admin", role: "moderator" },
        'Dyon van de Wege': { affiliation: "member", role: "occupant" },
        'Felix Hofmann': { affiliation: "member", role: "occupant" },
        'Ka Lek': { affiliation: "member", role: "occupant" },
        'Thomas Kalb': { affiliation: "member", role: "occupant" }
    };

    mock.event = {
        'preventDefault': function () {}
    };

    mock.mock_connection = function ()  {  // eslint-disable-line wrap-iife
        return function () {
            Strophe.Bosh.prototype._processRequest = function () {}; // Don't attempt to send out stanzas
            var c = new Strophe.Connection('jasmine tests');
            var sendIQ = c.sendIQ;

            c.IQ_stanzas = [];
            c.IQ_ids = [];
            c.sendIQ = function (iq, callback, errback) {
                this.IQ_stanzas.push(iq);
                var id = sendIQ.bind(this)(iq, callback, errback);
                this.IQ_ids.push(id);
                return id;
            }
            c.features = Strophe.xmlHtmlNode(
                '<stream:features xmlns:stream="http://etherx.jabber.org/streams" xmlns="jabber:client">'+
                    '<ver xmlns="urn:xmpp:features:rosterver"/>'+
                    '<csi xmlns="urn:xmpp:csi:0"/>'+
                    '<c xmlns="http://jabber.org/protocol/caps" ver="UwBpfJpEt3IoLYfWma/o/p3FFRo=" hash="sha-1" node="http://prosody.im"/>'+
                    '<bind xmlns="urn:ietf:params:xml:ns:xmpp-bind">'+
                        '<required/>'+
                    '</bind>'+
                    '<session xmlns="urn:ietf:params:xml:ns:xmpp-session">'+
                        '<optional/>'+
                    '</session>'+
                '</stream:features>').firstChild;

            c._proto._connect = function () {
                c.authenticated = true;
                c.connected = true;
                c.mock = true;
                c.jid = 'dummy@localhost/resource';
                c._changeConnectStatus(Strophe.Status.CONNECTED);
            };
            return c;
        };
    }();

    async function initConverse (settings, spies, promises) {
        const el = document.querySelector('#conversejs');
        if (el) {
            el.parentElement.removeChild(el);
        }

        const connection = mock.mock_connection();
        if (!_.isUndefined(spies)) {
            _.forEach(spies, function (method) {
                spyOn(connection, method);
            });
        }

        const _converse = await converse.initialize(_.extend({
            'i18n': 'en',
            'auto_subscribe': false,
            'play_sounds': false,
            'bosh_service_url': 'localhost',
            'connection': connection,
            'animate': false,
            'use_emojione': false,
            'no_trimming': true,
            'view_mode': mock.view_mode,
            'debug': false
        }, settings || {}));

        _converse.ChatBoxViews.prototype.trimChat = function () {};

        _converse.api.vcard.get = function (model, force) {
            return new Promise((resolve, reject) => {
                let jid;
                if (_.isString(model)) {
                    jid = model;
                } else if (!model.get('vcard_updated') || force) {
                    jid = model.get('jid') || model.get('muc_jid');
                }
                let fullname;
                if (!jid || jid == 'dummy@localhost') {
                    jid = 'dummy@localhost';
                    fullname = 'Max Mustermann' ;
                } else {
                    const name = jid.split('@')[0].replace(/\./g, ' ').split(' ');
                    const last = name.length-1;
                    name[0] =  name[0].charAt(0).toUpperCase()+name[0].slice(1);
                    name[last] = name[last].charAt(0).toUpperCase()+name[last].slice(1);
                    fullname = name.join(' ');
                }
                const vcard = $iq().c('vCard').c('FN').t(fullname).nodeTree;
                const result = {
                    'vcard': vcard,
                    'fullname': _.get(vcard.querySelector('FN'), 'textContent'),
                    'image': _.get(vcard.querySelector('PHOTO BINVAL'), 'textContent'),
                    'image_type': _.get(vcard.querySelector('PHOTO TYPE'), 'textContent'),
                    'url': _.get(vcard.querySelector('URL'), 'textContent'),
                    'vcard_updated': moment().format(),
                    'vcard_error': undefined
                };
                resolve(result);
            }).catch(_.partial(_converse.log, _, Strophe.LogLevel.FATAL));
        };
        if (_.get(settings, 'auto_login') !== false) {
            _converse.api.user.login({
                'jid': 'dummy@localhost',
                'password': 'secret'
            });
        }
        window.converse_disable_effects = true;
        return _converse;
    }

    mock.initConverseWithPromises = function (spies, promise_names, settings, func) {
        return function (done) {
            initConverse(settings, spies).then(_converse => {
                const promises = _.map(promise_names, _converse.api.waitUntil);
                Promise.all(promises)
                    .then(_.partial(func, done, _converse))
                    .catch(_.partial(_converse.log, _, Strophe.LogLevel.FATAL));
            });
        }
    };

    mock.initConverseWithConnectionSpies = function (spies, settings, func) {
        return (done) => initConverse(settings).then(_converse => func(done, _converse));
    };

    mock.initConverseWithAsync = function (settings, func) {
        if (_.isFunction(settings)) {
            const _func = settings;
            settings = func;
            func = _func;
        }
        return (done) => initConverse(settings).then(_converse => func(done, _converse));
    };
    mock.initConverse = function (settings, func) {
        if (_.isFunction(settings)) {
            const _func = settings;
            settings = func;
            func = _func;
        }
        return (done) => initConverse(settings).then(_converse => func(done, _converse));
    };
    return mock;
}));
