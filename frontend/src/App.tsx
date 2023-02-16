import React, { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

const constraints: MediaStreamConstraints = {
  audio: true,
  video: true,
};

const server: RTCConfiguration = {
  iceServers: [
    {
      urls: 'stun:global.stun.twilio.com:3478',
    },
    {
      username:
        '5846a73f31aebf8e6ff2ed8488a30fc5094af030a81a30d315f98047e0656a28',
      urls: 'turn:global.turn.twilio.com:3478?transport=udp',
      credential: '0SHP8I2jrWXsnygCsCQpj7Dp02wPqeHS6YNuyysarj8=',
    },
    {
      username:
        '5846a73f31aebf8e6ff2ed8488a30fc5094af030a81a30d315f98047e0656a28',
      urls: 'turn:global.turn.twilio.com:3478?transport=tcp',
      credential: '0SHP8I2jrWXsnygCsCQpj7Dp02wPqeHS6YNuyysarj8=',
    },
    {
      username:
        '5846a73f31aebf8e6ff2ed8488a30fc5094af030a81a30d315f98047e0656a28',
      urls: 'turn:global.turn.twilio.com:443?transport=tcp',
      credential: '0SHP8I2jrWXsnygCsCQpj7Dp02wPqeHS6YNuyysarj8=',
    },
  ],
};

const signalOption: RTCOfferOptions = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,
};

const socket = io('http://localhost:8080');

function APP() {
  const [room, setRoom] = React.useState<string>('123');

  const localVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const peerA = React.useRef<RTCPeerConnection | null>(null);

  const sendSignalingMessage = (
    sdp: RTCSessionDescription | null,
    offer: boolean
  ) => {
    const isOffer = offer ? 'offer' : 'answer';
    console.log(`Sending ${isOffer}`);
    socket?.emit('peerConnectSignaling', {
      sdp,
      room,
    });
  };

  const createSignal = async (isOffer: boolean) => {
    try {
      if (!peerA.current) {
        console.log('尚未開啟視訊');
        return;
      }
      const offer = await peerA.current[
        `create${isOffer ? 'Offer' : 'Answer'}`
      ](signalOption);
      await peerA.current.setLocalDescription(offer);
      sendSignalingMessage(
        peerA.current.localDescription,
        isOffer ? true : false
      );
    } catch (error) {
      console.log('create signal error :', error);
    }
  };

  useEffect(() => {
    // 設定 socket 事件
    socket.on('peerConnectSignaling', async (message) => {
      if (message.sdp && !peerA.current?.currentRemoteDescription) {
        console.log('sdp', message.sdp);
        await peerA.current?.setRemoteDescription(
          new RTCSessionDescription(message.sdp)
        );
        await createSignal(message.sdp.type === 'answer' ? true : false);
      } else if (message.candidate) {
        // console.log('candidate', candidate);
        peerA.current?.addIceCandidate(new RTCIceCandidate(message.candidate));
      }
    });

    socket.on('roomBroadcast', (message) => {
      console.log('房間廣播 => ', message);
    });
  }, []);

  const init = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (stream && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;

        // create peer connection
        peerA.current = new RTCPeerConnection(server);
        console.log('create peer connection');

        // add stream to peer connection
        stream.getTracks().forEach((track) => {
          peerA.current?.addTrack(track, stream);
        });

        // 如果有 candidates 就傳去 server
        peerA.current.onicecandidate = (event) => {
          if (event.candidate) {
            // console.log('ice candidate A', event.candidate);
            socket?.emit('peerConnectSignaling', {
              candidate: event.candidate,
              room,
            });
          }
        };

        // 監聽是否有流傳入，如果有的話就顯示影像
        peerA.current.ontrack = (event) => {
          if (
            remoteVideoRef.current &&
            !remoteVideoRef.current.srcObject &&
            event.streams[0]
          ) {
            remoteVideoRef.current.srcObject = event.streams[0];
            console.log('接收流並顯示於遠端視訊！', event);
          }
        };
      }
    } catch (error) {
      console.log(error);
    }
  };

  const joinRoom = () => {
    if (!room) return;
    socket?.emit('joinRoom', room);
  };

  return (
    <div>
      <div>
        <button onClick={init}>初始化</button>

        <input
          type='text'
          placeholder='enter the room id'
          value={room}
          onChange={(e) => setRoom(e.target.value)}
        />
        <button onClick={joinRoom}>join room</button>

        <button onClick={() => createSignal(true)}>send offer</button>

        <video
          width='200'
          height='200'
          autoPlay
          ref={localVideoRef}
          muted
          playsInline></video>

        <video
          width='500'
          height='500'
          autoPlay
          ref={remoteVideoRef}
          playsInline></video>
      </div>
    </div>
  );
}

export default APP;
