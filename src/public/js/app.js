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
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);


// Welcome Form (Choose a Room)
const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");


function startMedia(){
    welcome.hidden = true;
    call.hidden = false;
    getMedia();
}

function handleWelcomeSubmit(event){
    event.preventDefault();
    const input = welcomeForm.querySelector("input");
    const value = input.value;
    socket.emit("join_room", value, startMedia);
    roomName = input.value;
    input.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// Socket Code
socket.on("welcome", () => {
    console.log("someone joined");
})