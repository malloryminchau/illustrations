var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const prompt = require('./utils/sentencer.js')
const generatePlayersArray = require('./utils/generatePlayersArray.js')

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const db = require("./db");

const rooms = require("./routes/create_room")
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(8080);

//CONNECTING OTHER DEVICE TO SOCKET: USE BELOW
// server.listen(8080, '172.46.0.158');// < it has to be your local ip :)
// WARNING: app.listen(80) will NOT work here!

app.get('/', function (req, res) {
  res.send('I am alive!');
});


//Socket connection to handle Room Creation Logic
io.on('connection', function (socket) {

  socket.on('createRoom', function (data) {
    console.log(data);
      db.query(`
      INSERT INTO rooms (code)
      VALUES 
      ($1);
      `, [data.roomCode])
      
      .then((res)=>{
      socket.name = "host";
      socket.join(data.roomCode);
      console.log("A new room has been created:", data.roomCode)
        
      }).catch((err)=>{
        console.error(err)
      })
  });

  socket.on('joinRoom', function (name, room) {
    room = room.toUpperCase()

    db.query(`
    SELECT * FROM players 
    WHERE name = $1 AND room_id = (SELECT id FROM rooms WHERE code = $2)
    `, [name, room])

    .then((res) => {
      if (res.rowCount === 0) {
        return db.query(`
        INSERT INTO players (name, room_id, player_position)
          VALUES ($1, 
            (SELECT id FROM rooms WHERE rooms.code = $2), 
            (SELECT COUNT (players.id) FROM players
              JOIN rooms ON rooms.id = players.room_id
              WHERE rooms.code = $2) +1)
          RETURNING player_position;
      `, [name, room])
      .then((res) => {
        socket.join(room);
        return res
      })
      .then((res) => {
      
        socket.name = name;
        io.in(room).emit('joinRoom', name, res.rows[0].player_position)
        console.log(`${socket.name} has joined ${room}`)
        
        socket.to(room).emit('hostMode', `${name}`);

      }).catch((err) => {
        console.log(err)
      })

      } else {
        console.log("same name has been detected sending error message")
        socket.emit('joinRoom', name, 'error')

      }
    })
    .catch((err) => {
      console.error(err)
    })

    
    
    
  });



  socket.on('Ready', function (room, name) {
    console.log(`${name} is ready in ${room}`)
    socket.to(room).emit('Ready', `${name}`);
  });

  socket.on('startGame', function (room) {
    console.log(`${room} has requested to start a game`)

    db.query(`
      INSERT INTO games (room_id)
      VALUES ((SELECT rooms.id FROM rooms WHERE rooms.code = $1))
      RETURNING games.id;
      `, [room])
      .then((res) => {
        io.in(room).emit('game', res.rows[0].id)
      })

    .then((res) => {
      return db.query(`
        SELECT COUNT (players.id) FROM players
        WHERE players.room_id = (SELECT id FROM rooms WHERE code = $1);
      `, [room])
      
    })
    
    .then((res) => {
      let numberOfPlayers = parseInt(res.rows[0].count)
      
      let prompts = [];
      let playerArray = generatePlayersArray(numberOfPlayers);
      for (let i = 1; i <= res.rows[0].count; i++) {
        prompts.push(prompt());
      }
      
      for(let i = 1; i <= res.rows[0].count; i++) {

        db.query(`
          INSERT INTO prompts (game_id, info)
          VALUES ((SELECT id FROM games WHERE games.room_id = (SELECT id FROM rooms WHERE code = $1)),
          $2)
          RETURNING info;
        `, [room, JSON.stringify(`{"word": "${prompts[i-1]}", "queue": [${playerArray[i-1]}], "drawings": [], "guesses": []}`)])
      }
      

    }).then((res) => {
      return db.query(`
      SELECT info, id FROM prompts
      WHERE game_id = (SELECT id FROM games WHERE games.room_id = (SELECT id FROM rooms WHERE code = $1));
      `, [room])

    }).then((res) => {
      let wordArray = [];
      let positionArray = [];
      let idArray = [];
      for(let i = 0; i < res.rows.length; i++) {

        let jsonData = JSON.parse(res.rows[i].info);
        wordArray.push(jsonData.word)
        positionArray.push(jsonData.queue[0])
        idArray.push(res.rows[i].id)
      }
      let finalArray = [];
      for(let i = 0; i < wordArray.length; i++) {
        finalArray.push([wordArray[i], positionArray[i], idArray[i]]);
      }

      io.in(room).emit('startGame', finalArray)

    })
    .catch((err) => {
      console.log(err)
    })
    
  });



  socket.on('nextRound', function(game, round, room){

    db.query(`
      SELECT COUNT (id) FROM players
      WHERE room_id = (SELECT id FROM rooms WHERE rooms.code = $1)
    `, [room])
    .then((res) => {

      console.log("this is the number of players", res.rows[0])
      let numberOfPlayers = res.rows[0].count
      // tells the client browsers to submit their data
      io.in(room).emit('nextRound', game, round)
      console.log("THIS IS THE ROUND", round)

      if (numberOfPlayers % 2 === 0) {
        // always want to end on a guessing round
        numberOfPlayers = numberOfPlayers - 1
      }


      if (round === (numberOfPlayers - 1)) {
        //it is the end of the game

        let resultsArray = [];
        let resultQueues = [];
        let resultNames = [];

        setTimeout(() => 
          db.query(`
            SELECT * FROM prompts 
            WHERE game_id = $1
          `, [game])
          .then((res) => {

            resultsArray = res.rows;

            for (let i = 0; i < resultsArray.length; i++) {
              let queue = resultsArray[i].info.queue;
              resultQueues.push(queue);
            }

            return db.query(`
              SELECT name, player_position FROM players
              WHERE room_id = (SELECT id FROM rooms WHERE code = $1)
            `, [room])

            .then((res) => {
              let playersArray = res.rows;
              let namesForArray = [];
              for (let i = 0; i < resultQueues.length; i++) {
                let queueNames = []
                for (let j = 0; j < resultQueues[i].length; j ++) {
                  queueNames.push(playersArray[resultQueues[i][j] - 1].name)
                }
                namesForArray.push(queueNames)
              }
              for(let i = 0; i < resultsArray.length; i ++) {
                resultsArray[i].info.player_names = namesForArray[i];
              }
              io.in(room).emit('endGame', resultsArray)
            })
          })
          
          .catch((err) => {
            console.error(err)
          })
        , 3000)
      } else {

      setTimeout(() => 

        db.query(`
        SELECT info, id FROM prompts
        WHERE game_id = $1;
        `, [game])
        .then((res) => {
          let infoArray = res.rows;
          let submissionData = [];

          if (round % 2 === 0) {
            round = round + 1;
            for (let i = 0; i < infoArray.length; i++) {
              
              let infoQueue = infoArray[i].info.queue
              let jsonInfo = infoArray[i].info
              let drawingsLength = jsonInfo.drawings.length - 1;
              submissionData.push([jsonInfo.drawings[drawingsLength], infoArray[i].id, round, infoQueue[round]])
            }
            io.in(room).emit('nextRoundInfo', submissionData)
            return submissionData;
            
          } else {
            round = round + 1;
            for (let i = 0; i < infoArray.length; i++) {
              let jsonInfo = infoArray[i].info
              let infoQueue = infoArray[i].info.queue
              let guessesLength = jsonInfo.guesses.length - 1;
              submissionData.push([jsonInfo.guesses[guessesLength], infoArray[i].id, round, infoQueue[round]])
            }
            io.in(room).emit('nextRoundInfo', submissionData)
            return submissionData;
          }
        }).catch((err) => {
        //catching the error for the query inside the setTimeout
        console.error(err)
      }), 3000) 
      // after set timeout
      //end of else statement
    }
    //end of promise of the db.query counting the players
    })
    
    .catch((err) => {
      //catching the error for the initial promise
      console.error(err)
    })
  })

  socket.on('storeInfo', function(promptID, gameID, content, round){

    db.query(`
      SELECT info FROM prompts
      WHERE prompts.id = $1
    `, [promptID])
    .then((res) => {
      let jsonInfo = ''
      if (round === 0 ) {
        jsonInfo = JSON.parse(res.rows[0].info)
      } else {
        jsonInfo = res.rows[0].info
      }
      
      if(round % 2 === 0) {
        jsonInfo.drawings.push(content)
      } else{
        jsonInfo.guesses.push(content)

      } 
      db.query(`
        UPDATE prompts
        SET info = $1
        WHERE prompts.id = $2
      `, [JSON.stringify(jsonInfo), promptID])

    })
    .catch((err) => {
      console.error(err);
    })
  })
});


module.exports = app;

