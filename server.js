var express =       require('express')
    , bodyParser =  require('body-parser')
    , http =        require('http')
    , path =        require('path')
    , fs =          require("fs")
    , r =           require('request')
    , redis =       require('redis')
    , config =      require('./config');

var app = express();
var rc = redis.createClient();
var isConnected = false;

// connect local redis
rc.on('connect', function() {
  console.log('Redis Connected', new Date());
  isConnected = true;
});

// API WEATHER
app.get('/weather', function (req, res) {
  var oneMin = (+new Date()) - (60 * 1000);

  // Check if we have a cache, and that the cache isnt stale, checks for longer than 30 seconds
  rc.get('cacheTimestamp', function(err, val) {
    var lastCache = parseInt(val, 10);
    console.log('cacheTimestamp', new Date(lastCache));

    function formatCache(val, isCached) {
      var cacheJson = JSON.parse(val);
      cacheJson.isCached = isCached;
      cacheJson.cacheTimestamp = lastCache;
      return cacheJson;
    }

    function returnCache() {
      rc.get('cacheWeather', function(err, val) {
        var cacheJson = formatCache(val, true);
        res.json(cacheJson);
      });
    }

    if (oneMin > (+new Date(lastCache))) {
      r('http://api.openweathermap.org/data/2.5/weather?zip=97201,us&units=imperial&appid=' + config.weatherApiKey, function(err, response, body) {
        if (err || !body) {
          returnCache();
          return;
        }

        rc.set('cacheWeather', body);
        rc.set('cacheTimestamp', (+new Date()));

        var cacheJson = formatCache(body, false);
        res.json(cacheJson);
      });
    } else {
      returnCache();
    }
  });
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public/'));

app.all('/*', function(req, res){
    res.sendFile('index.html');
    // res.sendFile(__dirname + '/public/index.html');
});

app.set('port', process.env.PORT || 1337);
http.createServer(app).listen(app.get('port'), function(){
    console.log("GoBuild.xyz");
    console.log(" ");
    console.log("http://localhost:" + app.get('port'));
});
