const socket = io();

const myFace = document.getElementById("myFace");
// stream = audio + video

const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");

const call = document.getElementById("call");

call.hidden = true;


let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;
let myDataChannel;

async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        const currentCamera = myStream.getVideoTracks()[0];
        cameras.forEach(camera => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            
            if (currentCamera.label === camera.label) {  
                // camera option이 현재 선택된 카메라와 같은 label을 가지고 있다면
                option.selected = true;
            }
            camerasSelect.appendChild(option);
        })
    } catch(err){
        console.log(err);
    }
}

async function getMedia(deviceId){
    const initialConstraints = { 
        audio: true, 
        video: { facingMode: "user" } 
    };
    const cameraConstraints = {
        audio: true, 
        video: { deviceId : {exaxt : deviceId} }
    };

    try{
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId? cameraConstraints : initialConstraints  // 맨 처음 카메라가 선택되지 않고 실행했을 때
        );
        myFace.srcObject = myStream;
        await getCameras();

    } catch(err) {
        console.log(err);
    }
};

// getMedia();  // deviceId === null -> initialConstraints가 선택된다.

function handleMuteClick(){
    myStream.getAudioTracks().forEach((track) => track.enabled = !track.enabled);
    if (!muted){
        muteBtn.innerText = "Unmute";
        muted = true;
    } else {
        muteBtn.innerText = "Mute";
        muted = false;
    }
}

function handleCameraClick(){
    myStream.getVideoTracks().forEach((track) => track.enabled = !track.enabled);
    if (cameraOff) {
        cameraBtn.innerText = "Turn Camera On";
        cameraOff = false;
    } else {
        cameraBtn.innerText = "Turn Camera Off";
        cameraOff = true;
    }
}

async function handleCameraChange() {
    await getMedia(camerasSelect.value);
    if(myPeerConnection){
        const videoTrack = myStream.getVideoTracks()[0]; // 지금 내 브라우저에서의 비디오 트랙
        const videoSender = myPeerConnection
            .getSenders()
            .find(sender => sender.track.kind === "video");
        videoSender.replaceTrack(videoTrack); // 그 트랙을 똑같이 다른 peer에게 보낸다.
    }
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);


// Welcome Form (Choose a Room)
const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");


async function initCall(){
    welcome.hidden = true;
    call.hidden = false;
    await getMedia();
    makeConnection();
}

async function handleWelcomeSubmit(event){
    event.preventDefault();
    const input = welcomeForm.querySelector("input");
    const value = input.value;
    await initCall(); // 수정됨
    socket.emit("join_room", value);
    roomName = input.value;
    input.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// Socket Code
/* peer A가 이미 방에 있고 peer B가 이 방에 들어오면
   peer A에서 실행되는 코드 */
socket.on("welcome", async () => {
    /* data channel을 생성하고 그 데이터 채널에 대한 이벤트 리스너를 만든다 */
    myDataChannel = myPeerConnection.createDataChannel("chat");
    myDataChannel.addEventListener("message", console.log);
    console.log("made data channel");
    const offer = await myPeerConnection.createOffer(); // 다른 브라우저가 초대될 수 있는 초대장을 만든다. 
    myPeerConnection.setLocalDescription(offer); // peerA가 이 offer로 connection을 구성한다.
    console.log("sent an offer")
    socket.emit("offer", offer, roomName);
})

/* peer A에서 실행되는 코드 */
socket.on("answer", answer => {
     myPeerConnection.setRemoteDescription(answer);
     console.log("recieved the answer");
})

/* peer B에서 실행되는 코드 */
socket.on("offer", async (offer) => {
    myPeerConnection.addEventListener("datachannel", event => {
        myDataChannel = event.channel;
        myDataChannel.addEventListener("message", console.log);
    });
    console.log("recieved the offer");
    myPeerConnection.setRemoteDescription(offer);  // peer A가 보낸 description 받아서 setting하기
    const answer = await myPeerConnection.createAnswer(); 
    myPeerConnection.setLocalDescription(answer);  // local description 만들기

    socket.emit("answer", answer, roomName); // peer B가 peer A로 뭔가 보낼 일이 있을 때 answer를 보낸다.
    console.log("sent the answer");
})

socket.on("ice", ice => {
    console.log("recieve ice candidate")
    myPeerConnection.addIceCandidate(ice);
})

// RTC code

function makeConnection() {
    /* 양쪽 브라우저에서 각각 peer to peer connection을 만들고
       브라우저의 오디오, 비디오 스트림을 peer to peer connection에 집어넣기(아직 연결은 x) */
    myPeerConnection = new RTCPeerConnection({
        iceServers: [
            {
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302",
                    "stun:stun2.l.google.com:19302",
                    "stun:stun3.l.google.com:19302",
                    "stun:stun4.l.google.com:19302",
                ]
            }
        ]
    });
    myPeerConnection.addEventListener("icecandidate", handleIce);
    myPeerConnection.addEventListener("addstream", handleAddStream);
    myStream
        .getTracks()
        .forEach(track => myPeerConnection.addTrack(track, myStream));
}

/* 브라우저들이 ice candidate를 서로 주고받는다. */
function handleIce(data) {
    socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data){
    const peerFace = document.getElementById("peerFace");
    peerFace.srcObject = data.stream;
}