
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes');
var twitpic = require('twitpic').TwitPic;
var redis = require('redis');
var io = require('socket.io');
var redisClient, subscriber;

if (process.env.REDISTOGO_URL) {
  var rtg   = require("url").parse(process.env.REDISTOGO_URL);
  redisClient = redis.createClient(rtg.port, rtg.hostname);
  subscriber = redis.createClient(rtg.port, rtg.hostname);
  redisClient.auth(rtg.auth.split(":")[1]);
  subscriber.auth(rtg.auth.split(":")[1]);
} else {
  redisClient = redis.createClient();
  subscriber = redis.createClient();
}

var app = module.exports = express.createServer();

// Configuration

redisClient.on("error", function(err) {
  console.log("Error! " + err);
});
subscriber.subscribe('images');

var keyword = 'momoclo';
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  setInterval(function() {
  try {
  console.log("keyword = " + keyword);
  twitpic.query('tags/show', {tag: keyword}, function (data){
    if(data) {
      for (var index in data.images) {
        console.log(index);
        existsAndSet(data, index, keyword);
      }
    }
  });
  } catch (e) {
    console.log(e);
  }

  }, 60000);
  });

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes
app.get('/', routes.index);
app.get('/img', function(req, res){
  redisClient.hvals("images", function (err, images) {
  console.log('redis connect.');
    if (!images) {
      console.log("images is null");
      getImages(res);
    } else {
      console.log(images);
      var imageData = [];
      for (var index in images) {
        imageData.push(JSON.parse(images[index]));
      }
      res.json({title: keyword, data: imageData});
    }
  });
});

function existsAndSet(data, index, keyword) {
 redisClient.hexists("images", data.images[index].short_id, function (err, res) {
    console.log(res);
    if (err) {
      console.log(err);
    } else if (res == 0) {
      if (data.images[index].message.indexOf(keyword) >= 0) {
        var jsonData = {
          category: 'twitpic',
          short_id: data.images[index].short_id,
          message: data.images[index].message,
          username: data.images[index].user.username,
          width: data.images[index].width,
          height: data.images[index].height
        };
        redisClient.hset("images", data.images[index].short_id, JSON.stringify(jsonData), redis.print);
        redisClient.publish('images', JSON.stringify(jsonData));
      }
    } else {
     //KEY EXISTS, DO NOTHING 
    }
  });
}

function getImages(res) {
  console.log("method getImages begin");
  var imgJsonArray = new Array();
  try {
  twitpic.query('tags/show', {tag: keyword}, function (data) {
    if (data) {
    for (var index in data.images) {
      console.log(data.images[index]);
      var jsonData = {
        category: 'twitpic',
        short_id: data.images[index].short_id,
        message: data.images[index].message,
        username: data.images[index].user.username,
        width: data.images[index].width,
        height: data.images[index].height
      };
      imgJsonArray.push(jsonData);
      redisClient.hset("images", data.images[index].short_id, JSON.stringify(jsonData), redis.print);
    }
     res.json(
     { title: 'Express1',
       data: imgJsonArray
     });
    }
  });
  } catch (e) {
    console.log(e);
  }

}

io = io.listen(app);
subscriber.on('message', function(channel, message) {
  console.log('getMessage: ' + message);
  io.sockets.emit('updated', JSON.parse(message));
});

app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
//  twitter.search(keyword, {}, function(err, data) {
//      console.log(data);
//  });
//  twitter.stream('statuses/filter', {'track': keyword},function(stream) {
//    stream.on('data', function (data) {
//      console.log(data);
//    });
//    stream.on('end', function (response) {
      // 切断された場合の処理
//    });
//    stream.on('destroy', function (response) {
      // 接続が破棄された場合の処理
//    });
//  });

//twitpic.query('tags/show', {tag: 'momoclo'}, function (data) {
//  twitpic.query('media/show', {id: data.id}, function (media) {
//    console.log(media);
//  });
//});
