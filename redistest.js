var redis = require('redis');
var redisClient = redis.createClient();
var twitpic = require('twitpic').TwitPic;
var keyword = 'momoclo';

redisClient.hexists("images", "9g2qk9", function (err, res) {
  console.log(res);
});

twitpic.query('tags/show', {tag: keyword}, function (data) {
    for (var index in data.images) {
      var id = data.images[index].short_id;
      console.log(id);
      exists(id);
}});
}
