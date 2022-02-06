const socket = io();

const welcome = document.getElementById("welcome"); // welcome id를 갖고있는 DOM을 welcome 변수에 저장
const form = welcome.querySelector("form");  // welcome이라는 id에서 "form"과 일치하는 element를 반환한다.

/* room id를 가진 docu를 숨긴다. */
const room = document.getElementById("room");

function addMessage(message) {
    const ul = room.querySelector("ul");
    const li = document.createElement("li");
    li.innerText = message;
    ul.appendChild(li);
}

function handleMessageSubmit(event) {
    event.preventDefault(); // 얘가 없으면 다시 main 화면으로 복귀하네
    const input = room.querySelector("#msg input");
    const value = input.value;
    socket.emit("new_message", input.value, roomName, ()=> {
        addMessage(`You : ${value}`);
        // input.value = "";
    });  // 새 이벤트 new_message. 백엔드로 보낸다.
    input.value = '';  // 한번 다 쓰고 나면 지워준다.

}

function handleNicknameSubmit(event) {
    event.preventDefault();
    const input = room.querySelector('#nickname input');
    socket.emit("nickname", input.value);
}


/* 방에 대한 room 태그로 기존 화면을 교체하는 함수 */
room.hidden = true;  // 1. 맨 처음에는 숨겨져 있다가
let roomName;
function showRoom(){  // 2. 이 콜백이 실행되면
    console.log("showroom");
    welcome.hidden = true;  // 3. welcome 태그는 숨겨지고
    room.hidden = false;    // 4. room 태그가 보인다.
    const h3 = room.querySelector("h3");  
    h3.innerText = `room ${roomName}`;  // 5. 이 태그에 해당 문자열을 추가한다.
    // 이 때 아래에서 roomName은 showRoom()보다 먼저 초기화가 되는데, 그 이유는 showRoom이
    // callback함수라서 먼저 동기적 작업부터 처리한 후 호출되기 때문이 아닌가.

    const msgForm = room.querySelector("#msg");
    const nameForm = room.querySelector("#nickname");
    msgForm.addEventListener("submit", handleMessageSubmit);  // Send 버튼에 대한 submit 이벤트 리스너
    nameForm.addEventListener("submit", handleNicknameSubmit);
}


function handleRoomSubmit(event){
    event.preventDefault();  // form 태그에서 submit을 누른 후 바로 새로고침되지 않도록 한다.
    const input = form.querySelector("input");  // form 태그에서 input DOM 찾기

    /* enter_room이라는 특정한 event를 emit해준다. 
       string뿐 아니라 object, 심지어는 세 번째 인자로 함수를 백엔드에 전송할 수 있다.
       우리는 input이라는 DOM에 클라가 입력한 값을 object 형태로 서버에 전달해줄 것이다.
       서버에서는 socket io를 설치한 서버에서 enter_room 이벤트에 대한 이벤트 핸들러인
       socket.on에서 이를 받고 콜백 함수에서 작업을 진행한다.  */
    // ( 이벤트 이름, 보내고 싶은 payload, 서버에서 호출될 클라이언트 콜백, 다른것도 )
    socket.emit("enter_room", input.value, showRoom); // enter_room이라는 event를 백엔드로 emit한다.
    roomName = input.value;  // 얘가 showroom보다 먼저 실행됨. showroom은 callback 함수이므로!!
    input.value = "";
}

/* form은 element로서 이벤트를 수신할 수 있는 eventTarget이다.
   submit이라는 이벤트에 대한 콜백 함수를 지정한다. */
form.addEventListener("submit", handleRoomSubmit);

socket.on("welcome", (user) => {
    addMessage(`${user} joined`);
});

socket.on("bye", (user) =>{
    addMessage(`${user} left...`);
}); 

socket.on("new_message", addMessage);
// socket.on("new_message", (msg)=>{addMessage(msg)}); // 같음