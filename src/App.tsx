import React, { useRef, useEffect, useState } from 'react';

const constraints: MediaStreamConstraints = {
  audio: true,
  video: true,
};

const offerOption: RTCOfferOptions = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,
};

function App() {
  const localVideo = useRef<HTMLVideoElement | null>(null);
  const remoteVideo = useRef<HTMLVideoElement | null>(null);

  const peerA = useRef<RTCPeerConnection | null>();
  const peerB = useRef<RTCPeerConnection | null>();

  const [localStream, setLocalStream] = useState<MediaStream | null>();

  const getRemoteSteam = (e: RTCTrackEvent) => {
    // 监听是否有媒体流接入，如果有就赋值给 remoteVideo 的 src
    if (remoteVideo.current && remoteVideo.current.srcObject !== e.streams[0]) {
      remoteVideo.current.srcObject = e.streams[0];
    }
  };

  const onCreateAnswer = async (desc: RTCSessionDescriptionInit) => {
    try {
      await peerB.current?.setLocalDescription(desc);
    } catch (err) {
      console.log('Answer-setLocalDescription: ', err);
    }

    try {
      await peerA.current?.setRemoteDescription(desc);
    } catch (err) {
      console.log('Answer-setRemoteDescription: ', err);
    }
  };

  const onCreateOffer = async (desc: RTCSessionDescriptionInit) => {
    try {
      await peerA.current?.setLocalDescription(desc);
    } catch (err) {
      console.log('Offer-setLocalDescription: ', err);
    }

    try {
      await peerB.current?.setRemoteDescription(desc);
    } catch (err) {
      console.log('Offer-setRemoteDescription: ', err);
    }

    try {
      const answer = await peerB.current?.createAnswer();
      await onCreateAnswer(answer as RTCSessionDescriptionInit);
    } catch (err) {
      console.log('Offer-setRemoteDescription: ', err);
    }
  };

  const initPeer = () => {
    // 創建 RTCPeerConnention
    peerA.current = new RTCPeerConnection();
    if (!localStream) return;
    // 添加本地流
    localStream
      .getTracks()
      .forEach((track) => peerA.current?.addTrack(track, localStream));
    // 監聽 A 的ICE候選信息,如果收集到，就添加給 B
    peerA.current.onicecandidate = (event) => {
      if (event.candidate) {
        peerB.current?.addIceCandidate(event.candidate);
      }
    };

    // 創建呼叫端
    peerB.current = new RTCPeerConnection();
    peerB.current.ontrack = getRemoteSteam;

    // 监听 B 的ICE候选信息
    // 如果收集到，就添加给 A
    peerB.current.onicecandidate = (event) => {
      if (event.candidate) {
        peerA.current?.addIceCandidate(event.candidate);
      }
    };
  };

  const call = async () => {
    if (!peerA.current || !peerB.current) {
      initPeer();
    }
    try {
      const offer = await peerA.current?.createOffer(offerOption);
      await onCreateOffer(offer as RTCSessionDescriptionInit);
    } catch (err) {
      console.log(err);
    }
  };

  const hangup = () => {
    peerA.current?.close();
    peerB.current?.close();
    peerA.current = null;
    peerB.current = null;
  };

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        setLocalStream(stream);
        if (localVideo.current) {
          localVideo.current.srcObject = stream;
        }
        // 初始化 RTCPeerConnention
        initPeer();
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  return (
    <div className='App'>
      <video
        width='200'
        height='200'
        className='rtc'
        autoPlay
        ref={localVideo}
        muted
        playsInline></video>
      <video
        width='200'
        height='200'
        className='rtc'
        autoPlay
        ref={remoteVideo}
        playsInline></video>
      <button onClick={call}>call</button>
      <button onClick={hangup}>hangup</button>
    </div>
  );
}

export default App;
