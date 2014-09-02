var request = require('request'),
    fs = require('fs'),
    pwuid = require('pwuid')(),
    config = JSON.parse(fs.readFileSync(pwuid.dir + '/.github.conf', 'utf8')),
    _ = require('lodash'),
    Notification = require('node-notifier'),
    notifier = new Notification();

var base64 = {};

base64.encode = function (unencoded) {
  return new Buffer(unencoded || '').toString('base64');
};

base64.decode = function (encoded) {
  return new Buffer(encoded || '', 'base64').toString('utf8');
};

var notificationRequest = {
  url: 'https://' + config.github.username + ':' + config.github.token + '@api.github.com/notifications',
  qs: {
    all: true
  },
  headers: {
    'user-agent': config.github.username
  }
};

if (config.lastModified) {
  notificationRequest.headers['If-Modified-Since'] = config.lastModified;
}

var handleNotification = function (notification) {
  var notificationDetailsRequest = {
    url: notification.subject.latest_comment_url,
    headers: {
      'user-agent': config.github.username,
      Authorization: 'Basic ' + base64.encode(config.github.username + ':' + config.github.token)
    }
  };
  request.get(notificationDetailsRequest, function (error, response, body) {
    if (response.statusCode === 200) {
      var jsonBody = JSON.parse(body);
      var options = {
        title: 'Message from ' + jsonBody.user.login,
        message: 'Message from ' + jsonBody.user.login,
        subtitle: jsonBody.body,
        open: jsonBody.html_url
      };
      console.log(jsonBody.html_url);
      notifier.notify(options);
    }
  });
};

var callBack = function (error, response, body) {
  if (response.statusCode === 200) {
    var jsonBody = JSON.parse(body).slice(0, 1);
    _.each(jsonBody, handleNotification);

    config.lastModified = response.headers['last-modified'];
    notificationRequest.headers['If-Modified-Since'] = response.headers['last-modified'];
    fs.writeFileSync(pwuid.dir + '/.github.conf', JSON.stringify(config), 'utf8');
  } else if (response.statusCode === 500) {
    console.log(body);
  }

  config.timeout = response.headers['x-poll-interval'];
  config.timeoutInMs = config.timeout * 1000;
  process.stdout.write('.');
  setTimeout(function () {
    request.get(notificationRequest, callBack);
  }, config.timeoutInMs);
};

request.get(notificationRequest, callBack);
