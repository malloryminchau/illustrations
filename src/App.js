import React, { Fragment, useState } from 'react';
import './App.css';
import Canvas from './components/Canvas'
import Button from './components/Button'
import JoinRoom from './components/JoinRoom'

function App() {
  
  const [state, setState] = useState({
    roomID: "",
    playerPosition: null,
    name: "",
    hostMachine: false
  });

  function enterRoom(name, room){
    setState({ ...state, name: name, roomID: room });
  }

  function createRoom(){
    console.log("Room ID Creating Now")
    setState({ ...state, hostMachine: true })
  }

  return (
    <Fragment>

      {!state.roomID && 
        <Fragment>
          <JoinRoom
            onClick={enterRoom}
          >
          </JoinRoom>
          <Button
            onClick={createRoom}
          >Create Room</Button>
       </Fragment>
      }

      {state.roomID && 
      <Fragment>
        <h3 style={{ textAlign: 'center' }}>Draw</h3>
        <Canvas />
      </Fragment>
      }


    </Fragment>
  );
}

export default App;
