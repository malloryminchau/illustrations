import React, { Fragment, useState } from 'react';
import Button from './Button'

export default function HostRoom(props) {

  //const [roomID, setroomID] = useState(props.roomID || "");

  return (
    <Fragment>
      <h1>Room Code: {props.roomID}</h1>
      <h2>Players in Lobby</h2>
      <h3>{props.players}</h3>
      <Button>Start Game</Button>

    </Fragment>
  );
}