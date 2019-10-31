import React, { Fragment, useState, useEffect } from 'react';
import './App.css';
import Canvas from './components/Canvas'
import Button from './components/Button'
import JoinRoom from './components/JoinRoom'
import HostRoom from './components/HostRoom'
import Waiting from './components/Waiting'
import Header from './components/Header'
const io = require('socket.io-client');


function App() {

  var socket = io('http://localhost:8080');

  
  const [state, setState] = useState({
    roomID: "",
    name: "",
    playerPosition: null,
    keyword: "",
    hostMachine: false,
    phase: "",
    players:[],
    ready: [],
  });

  //call this function with the number of players
  //IE: generatePlayersArray(players.count()) or something similar
  function generatePlayersArray(size, startAt = 1) {
    const players = [...Array(size).keys()].map(i => i + startAt)
    players.unshift(players.pop())
    players.forEach(() => {
       players.push(players.shift())
       //THIS IS WHERE WE WILL ADD PLAYERS ARRAY INTO JSON
    });
  }

  function enterRoom(name, room){
    // socket.on('connection', function(socket){
    //   socket.join(room);
    // });
    setState({ ...state, name: name, roomID: room });
    // socket.emit('joinRoom', name, room );
    // var promise = function(name, room){
    //   setState(prevState => ({ ...prevState, name: name, roomID: room }))
    // }
    // promise(name, room).then(() => {
    //   console.log("this worked ok")
    //   console.log("name state has been assigned")
    //   socket.emit('joinRoom', name, room );
    // }).catch((err) => {
    //   console.log(err)
    // })
    
    // let promise1 = setState(prevState => ({ ...prevState, name: name, roomID: room }))

    // let promise2 = socket.emit('joinRoom', name, room );

    // Promise.all([promise1, promise2]).then(function(values) {
    //   console.log(values);
    // });
 

  }

  
  const generateRandomString = function() {
    const possibleCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let newShortURL = "";
    while (newShortURL.length < 4) {
      newShortURL = newShortURL + possibleCharacters[Math.floor(Math.random() * 36)];
    }
    return newShortURL;
  };

  function createRoom(){
    let roomCode = generateRandomString()
    // socket.on('connect', function(socket){
    //   //socket.join(roomCode);
    // });
    socket.emit('createRoom', { roomCode: `${roomCode}` });
    
    setState({ ...state, hostMachine: true, roomID: roomCode })
  }

  function startGame(){
    socket.emit('startGame', state.roomID);
  }

  function ready(){
    console.log(state.room, state.name, "is going to be sent to the server as ready")
    socket.emit('Ready', state.roomID, state.name);
  }

  useEffect(() => {
    socket.on('system', function (data) {
      console.log(data);
    });
  })

  useEffect(() => {
    socket.on('hostMode', function (player) {
      console.log(player)
      setState(prevState => ({ ...prevState, players: [ ...prevState.players, player] }))
      console.log(state.players)
    });
  }, )

  useEffect(() =>{
    socket.on('Ready', function (name) {
      console.log("I have received a message")
      if (state.ready.includes(name)){
        //do nothing
        console.log("the ready player is already in ready state")
      } else {
          setState(prevState => ({ ...prevState, ready: [ ...prevState.ready, name] }))
      }
    });
  })

  useEffect(()=>{
    socket.on('startGame', function (data) {
      console.log("starting game and entering draw phase")
      if (data === "start"){
        setState(prevState => ({ ...prevState, phase: "draw" }))
        }
    });
  })

  useEffect(()=>{
    socket.on('joinRoom', function (name, position) {
      console.log(`Receiving a player position for ${name} and assigning ${position}`)
      console.log ("this is the client name: ", state.name)
      console.log ("this is the server name: ", name)
      if (name === state.name){
        console.log("the position has been assigned", position)
        setState(prevState => ({ ...prevState, playerPosition: position }))
        }
    });
  })

  useEffect(()=>{
    if (state.name){
      console.log("this is the state at name change", state)
      console.log("the name state has changed")
      socket.emit('joinRoom', state.name, state.roomID );
    }
  },[state.name])



  //delete later this is for testing purposes
  function draw() {
    setState({ ...state, phase: "draw" })
  }

  
  return (
    <Fragment>
      <Header
        room = {state.roomID}
      >  
      </Header>


      {state.phase === "draw" && !state.hostMachine &&//Draw Phase
      <Fragment>
        <h3 style={{ textAlign: 'center' }}>Draw this: Lonely Cat</h3>
        <Canvas />
      </Fragment>
      }

      {state.roomID && state.hostMachine &&
      <Fragment>
        <HostRoom
          ready={state.ready}
          roomID={state.roomID}
          players={state.players}
          onClick={startGame}
          phase={state.phase}
        >
        </HostRoom>

      </Fragment>
      }

      {!state.roomID && !state.hostMachine &&//When roomID is falsy, Join room field, name field, and create room field will be rendered
        <Fragment>
          <Button
            onClick={draw}
          >Draw Iceman</Button>
          <JoinRoom
            onClick={enterRoom}
          >
          </JoinRoom>
          <Button
            onClick={createRoom}
          >Create Room</Button>
       </Fragment>
      }

      {state.roomID && !state.hostMachine && //If the client receives room ID and is not the host machine, put client in waiting room
      <Fragment>
        <Waiting
          name={state.name}
          room={state.roomID}
          message="Waiting for Game to Start"
          onClick={ready}
        ></Waiting>
      </Fragment>
      }

       



    </Fragment>
  );
}

export default App;
