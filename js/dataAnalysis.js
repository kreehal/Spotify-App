import * as d3 from 'https://d3js.org/d3.v6.min.js'
import * as SpotifyWebApi from './spotify-web-api.js'
import * as knn_model from './KNN_Model.js'
/*
const SpotifyWebApi = require('spotify-web-api-node');
const knn_model = require('./KNN_Model.js');
*/

const spotifyApi = new SpotifyWebApi({
    clientId: '69e1c0e4539041d7917c217c4b6f94cb',
    clientSecret: 'ffd609f69b4940eca3ee212b75de03b5',
});

// Retrieve an access token.
const accesTokenPromise = spotifyApi.clientCredentialsGrant().then(
  function(data) {
    console.log('The access token expires in ' + data.body['expires_in']);
    console.log('The access token is ' + data.body['access_token']);

    // Save the access token so that it's used in future calls
    spotifyApi.setAccessToken(data.body['access_token']);
  },
  function(err) {
    console.log('Something went wrong when retrieving an access token', err);
  }
);

const emotions = [
    'Calm', 'Chill', 'Energetic', 'Powerful', 'Sentimental',
    'Soothing', 'Upbeat', 'Vulnerable', 'Wistful'
]

const colors = [
    '#78d6c2', '#7ee171', '#ff920c', '#ff4500', '#3262bc',
    '#0b6623', '#fff675', '#f2a0b9', '#908cbd'
]

const emptyEmotionFrequencies = function (arr=emotions) {
    const dict = {};
    for (e of arr)
        dict[e] = 0;
    return dict;
}

// from [Ramki Pitchala](https://medium.com/swlh/set-a-time-limit-on-async-actions-in-javascript-567d7ca018c2)
async function fulfillWithTimeLimit(timeLimit, task, failureValue){
    let timeout;
    const timeoutPromise = new Promise((resolve, reject) => {
        timeout = setTimeout(() => {
            resolve(failureValue);
        }, timeLimit)
    });
    const response = await Promise.race([task, timeoutPromise]);
    if(timeout){ 
        clearTimeout(timeout);
    }
    return response;
}

/**
 * @class ListeningSession utility object for all operations involving a session
 *
 * @field {number} size the number of songs in the session
 * @field {Date} time the date and time that the final song ended
 * @field {Array[Object]} songList the list of songs listened to during the session
 *      each object represents a single song and has the following fields:
 *          - endTime {Date}
 *          - trackName {String}
 *          - artistName {String}
 *          - msPlayed {number}
 *      array is sorted by endTime, with later times first
 */
class ListeningSession {
    /**
     * @param {Array[Object]} songs the list of songs to be part of the session
     *      each object should represent a single song and have the following fields:
     *          - endTime {Date}
     *          - trackName {String}
     *          - artistName {String}
     *          - msPlayed {number}
     *      array should be sorted by endTime, with later times first
     */
    constructor(songs) {
        this.size = songs.length;
        this.time = songs[songs.length-1].endTime;
        this.songList = songs;
        this.frequencies = emptyEmotionFrequencies();
        this.unlabeledSongs = songs.length;
    }

    calculateEmotionsFromDatabase() {
        for (const song of this.songList) {
            let e = emotionFromDatabase(song);
            if (e) {
                this.frequencies[e] += 1;
                song.emotion = e;
                this.unlabeledSongs--;
            }
        }
        /*
        this.unfoundIndices = [];
        for (let i=0; i<this.songList.length; i++)
        {
            let e = emotionFromDatabase(this.songList[i]);
            if (e) {
                if (e === 'Party Music')
                    e = 'Party';
                this.frequencies[e] += 1;
            }
            else {
                this.unfoundIndices.push(i);
            }
        }
        */

        return this.frequencies;
    }

    async calculateEmotionsFromSearch() {
        for (const song of this.songList) {
            if (!song.hasOwnProperty('emotion')) {
                const id = await fulfillWithTimeLimit(300000, searchForId(song), '');
                if (id) {
                    song.id = id;
                }
            }
        }

        let ids = [];
        for (const song of this.songList) {
            if (song.hasOwnProperty('id'))
                ids.push(song.id);
        }


        let features = [];

        while (ids.length > 100) {
            features = features.concat(await featuresFromIds(ids.slice(0, 100)));
            ids = data.slice(100);
        }
        features = features.concat(await featuresFromIds(ids));


        for (const song of this.songList) {
            if (song.hasOwnProperty('id') && song.id === features[0].id) {
                song.emotion = emotionFromFeatures(features[0]);
                this.unlabeledSongs--;
                this.frequencies[song.emotion]++;
                features = features.slice(1);
            }
        }

        /*
        const songsToSearch = [];
        for (index of this.unfoundIndices)
            songsToSearch.push(this.songList(index));
        this.unfoundIndices = [];

        const ids = [];
        for (let i=0; i < songsToSearch.length; i++) {
            id = searchForId(songsToSearch[i]);
            if (id)
                ids.push(id);
            else
                this.unfoundIndices.push(i);
        }
        */
    }

    getDominantEmotion() {

        // get array of most frequent emotions for given frequency table
        const getMaxEmotion = object => {
            return Object.keys(object).filter(x => {
                 return object[x] == Math.max.apply(null, 
                 Object.values(object));
           });
        };


        const mostFrequent = getMaxEmotion(this.frequencies);

        // case i: the whole list has a single most frequent
        if (mostFrequent.length === 1) {
            this.dominantEmotion = mostFrequent[0];
            console.log(this);
            return mostFrequent[0];
        }

        // find the frequencies in the last five songs from
        // the most frequent in the whole list
        const lastFiveFrequencies = emptyEmotionFrequencies(mostFrequent);
        for (const song of this.songList.slice(0, 5)) {
            if (song.hasOwnProperty('emotion') 
                && lastFiveFrequencies.hasOwnProperty(song.emotion)) {
                lastFiveFrequencies[song.emotion]++
            }
        }

        const lastFiveMostFrequent = getMaxEmotion(lastFiveFrequencies);

        // case ii: the last five has a single most frequent
        if (lastFiveMostFrequent.length === 1) {
            this.dominantEmotion = lastFiveMostFrequent[0];
            console.log(this);
            return lastFiveMostFrequent[0];
        }

        // case iii: return the latest emotion if tie within the last five
        for (const song of this.songList) {
            if (song.hasOwnProperty('emotion')
                && lastFiveMostFrequent.hasOwnProperty(song.emotion)) {
                this.dominantEmotion = song.emotion;
                console.log(this);
                return song.emotion;
            }
        }

        // should never execute
        this.dominantEmotion = '';
        return '';
    }

    getDonutDataset() {
        const arr = [];
        for (e in emotions) {
            arr.push({name: e, quantity: this.frequencies[e]});
        }
        return arr;
    }
}

/**
 * Get all songs the user has listened to from their data
 *
 * @param {String} folderPath the path to the folder of downloaded data
 * @return {Array[Object]} all songs in the streaming history
 *      each object represents a single song and has the following fields:
 *          - endTime {Date}
 *          - trackName {String}
 *          - artistName {String}
 *          - msPlayed {number}
 *      array is sorted by endTime, with later times first
 */
function getHistory(folderPath) {
    try {
        const files = fs.readdirSync(folderPath, throwErrorCb);

        // find streaming history files
        const historyFiles = [];
        for (const file of files) {
            if (file.includes('StreamingHistory')) {
                historyFiles.push(file);
            }
        }

        // add all streaming history entries into giant array
        let history = [];
        for (const file of historyFiles) {
            let data_str = fs.readFileSync(folderPath+'/'+file, {encoding: 'utf8'})
            const arr = JSON.parse(data_str);
            history = history.concat(arr);
        }

        // convert endTime to a proper datetime
        for (let entry of history) {
            dateAndTime = entry.endTime.split(' ');
            dateParts = dateAndTime[0].split('-');
            timeParts = dateAndTime[1].split(':');
            entry.endTime = new Date(
                parseInt(dateParts[0]), parseInt(dateParts[1]), parseInt(dateParts[2]),
                parseInt(timeParts[0]), parseInt(timeParts[1]), 0
            );

        }

        // sort history by end time
        history.sort((a, b) => b.endTime - a.endTime);
        return history;

    }
    catch (err) {
        console.error(err);
    }
}

/**
 * Divide straming history into listening sessions
 *
 * A listening session meets the following conditions:
 *      - each track was played for between 30 seconds and 10 minutes, inclusive
 *      - each pair of consecutive tracks was played within 30 minutes of each other, inclusive
 *      - the session contains at least 10 songs meeting the above two criteria
 *
 * @param {Array[Object]} history all the songs a user has listened to
 *      each object should represent a single song and have the following fields:
 *          - endTime {Date}
 *          - trackName {String}
 *          - artistName {String}
 *          - msPlayed {number}
 *      array should be sorted by endTime, with later times first
 *
 * @return {Array[ListeningSession]} all the valid listening sessions from the user's data
 *      array is sorted by endTime of final song in each session, with later times first
 */
function getListeningSessions(history) {

    // copy tracks with > 30s of time played into new array
    tracks = [];
    for (track of history) {
        if (track.msPlayed >= 30*1000 && track.msPlayed <= 10*60*1000)
            tracks.push(track);
    }

    // divide tracks into groups of songs with < 30m between each consecutive song
    groups = [[]];
    for (let i=0; i < tracks.length-2; i++) {
        groups[groups.length-1].push(tracks[i]);
        const diff = Math.abs(tracks[i].endTime - tracks[i+1].endTime);
        if (diff > 30*60*1000) {
            groups.push([]);
        }
    }

    // create session objects for all groups with > 10 songs
    sessions = [];
    for (group of groups) {
        if (group.length >= 10) {
            sessions.push(new ListeningSession(group));
        }
    }

    return sessions;
}

let dbSongs = [];
const cmpSong = function (a, b) { 
    return a.trackName.localeCompare(b.trackName) || a.artistName.localeCompare(b.artistName); 
};

const matchSong = function(songA, songB) {
    const standardize = (s) => { return s.replace(/[""\\]/g, '').toLowerCase(); };

    a = {trackName: standardize(songA.trackName), artistName: standardize(songA.artistName)};
    b = {trackName: standardize(songB.trackName), artistName: standardize(songB.artistName)};

    const isVersion = (lhs, rhs) => {
        const flagWords = ['edition', 'remaster', 'edit', 'live', 'rerecord', 'feat.']
        for (const word of flagWords) {
            if (lhs.includes(word) || rhs.includes(word))
                return lhs.includes(rhs) || rhs.includes(lhs);
        }
    };

    return (a.artistName === b.artistName && (a.trackName === b.trackName || isVersion(a.trackName, b.trackName)));

};

function databaseInit() {
    data_str = fs.readFileSync('song_info.json', {encoding: 'utf8'})
    dbSongs = JSON.parse(data_str);
    dbSongs.sort(cmpSong);
}

function emotionFromDatabase(song) {

    const binarySearch = function (song, l, r) {
        if (r < l || l < 0 || r > dbSongs.length)
            return -1;

        let mid = l + Math.floor((r-l)/2);
        let cmp = cmpSong(song, dbSongs[mid]);

        if (cmp === 0)
            return mid;
        else if (cmp > 0)
            return binarySearch(song, mid+1, r);
        else
            return binarySearch(song, l, mid-1);
    }

    const index = binarySearch(song, 0, dbSongs.length);
    if (index === -1)
        return "";
    else
        return dbSongs[index].emotion;
}

idCache = {};

async function searchForId(song) {
    const query = `track:${song.trackName} artist:${song.artistName}`

    if (idCache.hasOwnProperty(query))
        return idCache[query];

    try {
        const data = await spotifyApi.searchTracks(query);

        const result = data.body.tracks.items[0];
        if (result) {
            idCache[query] = result.id;
            return result.id;
        }
        else {
            idCache[query] = '';
            return '';
        }
        /*
        if (result === undefined) {
            idCache[query] = "";
            return "";
        }

        if (matchSong(song, {trackName: result.name, artistName: result.artists[0].name})) {
            idCache[query] = result.id;
            return result.id
        }
        else {
            console.log('failed to find song:');
            console.log(song);
            console.log('found:');
            console.log(result.name);
            console.log(result.artists[0].name);

            idCache[query] = "";
            return "";
        }
        */

    }
    catch (error) {
        if (error.statusCode === 429) {
            const time = error.headers['Retry-After'] * 1000;
            return setTimeout(() => { return searchForId(song); }, time);
        }
        else if (error.code === 'ECONNRESET') {
            return setTimeout(() => { return searchForId(song); }, 1000);
        }
        else {
            console.error(error);
            return "";
        }
    }
}


async function featuresFromIds(arr) {
    try {
        const features = [];
        const data = await spotifyApi.getAudioFeaturesForTracks(arr);
        for (const info of data.body.audio_features) {
            if (info)
                features.push(info);
        }

        return features;
    }
    catch (error) {
        if (error.statusCode === 429) {
            const time = error.headers['Retry-After'] * 1000;
            return setTimeout(() => { return featuresFromIds(arr); }, time);
        }
        else if (error.code === 'ECONNRESET') {
            return setTimeout(() => { return featuresFromIds(arr); }, 1000);
        }
        else {
            console.error(error);
            featuresFromIds(arr);
        }
    }
};

function emotionFromFeatures(features) {
    const features_arr = [
        features.acousticness, features.danceability, features.energy,
        features.instrumentalness, features.liveness, features.speechiness,
        features.valence, features.loudness, features.tempo
    ]
    const emotionIndex = knn_model.model.predict(features_arr);
    return emotions[emotionIndex];

}

databaseInit();
console.log('database initialized!\n');

history = getHistory('shania_data');
console.log('history read!');
console.log(`${history.length} songs in history`);
console.log();

sessions = getListeningSessions(history);
console.log('sessions parsed!');
console.log(`${sessions.length} valid sessions\n`);

let totalSongs = 0;
let unfoundSongs = 0;
for (session of sessions) {
    session.calculateEmotionsFromDatabase();
    totalSongs += session.size;
    unfoundSongs += session.unlabeledSongs;
}
console.log(`emotion frequencies calculated!\n`);
console.log(`${unfoundSongs} of ${totalSongs} not found`);


Promise.resolve(accesTokenPromise).then( () => {
    for (session of sessions.slice(1, 10)) {
        session.calculateEmotionsFromSearch();
    }
}).then( () => {
    for (const session of sessions.slice(0, 5)) {
        session.getDominantEmotion();
    }
});
