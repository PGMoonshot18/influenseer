require('dotenv').config();

// Neural Network
const scorer = require('./scorer.js');
// API Client
const Twit = require('twit')
const config = require('./twitter_config');
const T = new Twit(config);

// Sentiment Analysis / NLP
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const speakeasy = require('speakeasy-nlp')

class evaluater{
	evaluate(tweets, id) {
		let favourites = 0;
		let retweets = 0;
		let follow = 0;
		let posts_with_interactions = 0;
		let sensitive_content_posts = 0;
		let is_beauty = false;
		let is_family = false;
		let historical_tweets = tweets;
		let sentiment_grade = 0;
		let user_engagement_rate = 0;
		let sensitive_content_rate = 0;
		let content_interaction_rate = 0;
		let aggregate_sentiment_grade = 0;
		let total_retweets = 0
		let average_sentiment_grade = 0;
		let tokenizer = new natural.TreebankWordTokenizer();


		for (let i = historical_tweets.length - 1; i >= 0; i--) {
			retweets += parseInt(historical_tweets[i]['retweet_count']);
			favourites += parseInt(historical_tweets[i]['favorite_count']);
			follow += parseInt(historical_tweets[i].user.followers_count);
			if ((parseInt(historical_tweets[i].favorite_count) > 0) || (parseInt(historical_tweets[i].retweet_count) > 0)) {
				posts_with_interactions++;
			}
			if (historical_tweets[i].possibly_sensitive) {
				sensitive_content_posts++;
			}
		}

		user_engagement_rate = (favourites + retweets) / follow;
		content_interaction_rate = (posts_with_interactions) / historical_tweets.length;
		sensitive_content_rate = sensitive_content_posts / historical_tweets.length;

		for (var i = historical_tweets.length - 1; i >= 0; i--) {
			T.get('statuses/retweets/:id', {
				id: historical_tweets[i].id_str
			}).
			then(response => {
				sentiment_grade = 0;
				for (var i = response.length - 1; i >= 0; i--) {
					aggregate_sentiment_grade += speakeasy.classify(response[i].text);
				}
			});
		}

		average_sentiment_grade = aggregate_sentiment_grade / total_retweets;


		for (let tweet of historical_tweets){ 
			let text = tokenizer.tokenize(tweet.full_text);
			if(this.beauty_tagger(text)){
				is_beauty = true;
				break;
			}
		}

		for (let tweet of historical_tweets){ 
			let text = tokenizer.tokenize(tweet.full_text);
			if(this.family_tagger(text)){
				is_family = true;
				break;
			}
		}

		let grader = new scorer();
		return [grader.network.activate([content_interaction_rate, user_engagement_rate, sensitive_content_rate, average_sentiment_grade]),is_beauty,is_family];
	}

	beauty_tagger(text) {

		// Filter by positive
		let beauty = ['lipstick','make-up','powder','salon','facial','face','skin','body'];
		let is_beauty = false;
		for (var i = text.length - 1; i >= 0; i--) {
			if(beauty.includes(text[i])){
				is_beauty =  true;
				break;
			}
		}
		return is_beauty;
	}

	family_tagger(text){
		let family = ['son','kids','brother','father','mother','sister','pamilya','daughter','love','care'];
		let is_family = false;
		for (var i = text.length - 1; i >= 0; i--) {
			if(family.includes(text[i])){
				is_family =  true;
				break;
			}
		}
		return is_family;

	}

	debug(historical_tweets) {
		historical_tweets = historical_tweets.slice(0, 20);
		for (var i = historical_tweets.length - 1; i >= 0; i--) {
			tagger(historical_tweets[i])
		}
		for (var i = historical_tweets.length - 1; i >= 0; i--) {
			T.get('statuses/retweets/:id', {
				count: 100,
				id: historical_tweets[i].id_str,
			}, (err, response) => {
				sentiment_grade = 0;
				console.log(response);
			});
		}

	}
}

// Test

var fs = require('fs')
data = JSON.parse(fs.readFileSync('data/twitter.json'));
eva = new evaluater();
console.log(eva.evaluate(data));