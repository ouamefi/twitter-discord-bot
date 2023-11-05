require('dotenv').config()
const { Client } = require('discord.js');
const client = new Client({ intents: 2048 });
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');
const keepAlive = require("./server/server.js");

const ACCOUNTS_FILE = './accounts.json';

function loadObjectsFromJsonFile(filePath) {
  try {
      return JSON.parse(fs.readFileSync(filePath));
  } catch (err) {
      console.log(err)
  }
}

function writeObjectsToJsonFile(filePath, objects) {
  try {
      fs.writeFileSync(filePath, JSON.stringify(objects));
  } catch (err) {
      console.log(err)
  }
}

// Send messages to discord channel
async function sendMessage(username, tweetId) {
  const url = `https://fxtwitter.com/${username}/status/${tweetId}`;
  try {
    const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID)
    channel.send(`${process.env.CHANNEL_MESSAGE} ${url}`)
  } catch (error) {
    console.error(error);
  }
}

async function fetchTweets() {
  let accounts = loadObjectsFromJsonFile(ACCOUNTS_FILE);
  for(acc of accounts) {
    //console.log(`Fetching Tweets of @${acc.username}...`);
    url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${acc.username}`
    const opts = { headers: { cookie: process.env.USER_COOKIE } };

    const response = await fetch(url, opts);
    const responseHTML = await response.text();
    const jsonData = responseHTML.substring(responseHTML.indexOf('__NEXT_DATA__')+39, responseHTML.indexOf('}</script>')+1); //use bs4
    const tweets = JSON.parse(jsonData).props.pageProps.timeline.entries;
    //console.log('Fetched and parsed Tweets!');

    let lastTweetId = acc.last_tweet_id;
    let newLastTweetId = lastTweetId;

    // Only process the last 5 tweets
    for(let i = 0; i < 5; i++) {
      let tweetId = tweets[i].entry_id.substring(6);
      if(tweetId !== lastTweetId) {
        // Save latest tweet id
        if (i == 0) newLastTweetId = tweetId;
        sendMessage(acc.username, tweetId);
      } else {
        break;
      }
    }

    acc.last_tweet_id = newLastTweetId;
  }
  writeObjectsToJsonFile(ACCOUNTS_FILE, accounts);
  //console.log('Accounts file updated!');
}

client.login(process.env.DISCORD_TOKEN)
 client.on('ready', () => {
    console.log('Discord ready!')
    fetchTweets();
    let interval = 1 * 60 * 60 * 1000; // one hour
    setInterval(fetchTweets, interval);
})