import http from "http";
import { Server } from "socket.io";
import express from "express";
import { set } from "express/lib/application";

const app = express();

app.set("view engine", "pug");  // 원하는 엔진을 템플릿 엔진으로 사용하기 위한 설정
app.set("views", __dirname + "/views");  // view 파일들이 모여있는 폴더 지정
app.use("/public", express.static(__dirname + "/public"));  // 유저가 public으로 가면 __dirname + '/public' 폴더를 보여준다.
app.get("/", (req, res) => res.render("home"));  // route handler. 응답해줄 템플릿 파일 home.pug
app.get('/*', (req, res) => res.redirect("/"));  // / 뒤의 다른 url은 다 /으로 리다이렉트된다.


const httpServer = http.createServer(app);
const wsServer = new Server(httpServer);  // 서버에 socket io 설치

/* 백엔드에서 connection을 받을 준비 */
wsServer.on("connection", (socket) => {
    console.log(socket["nickname"]);
    socket["nickname"] = "Anon";

    socket.onAny((event) => {  // 모든 이벤트를 핸들링하는 리스너(이벤트 핸들러)를 정의함.
        console.log(`Socket Event : ${event}`);
    });
    /* 서버에서의 enter_room 이벤트 핸들러.
       cli에서 enter_room이라는 특정한 이벤트를 발생시키면 socket.emit의 2,3번째 인자를
       roomName와 done으로 받고 이를 콜백 함수로 다룰 수 있다. */
    socket.on("enter_room", (roomName, done) => {
        socket.join(roomName);
        done();
        socket.to(roomName).emit("welcome", socket.nickname);  // roomName 룸에 있는 모든 사람들에게 welcome 이벤트를 emit했다.
    });  

    socket.on("disconnecting", () => {
        console.log(socket.rooms); //  { 'MwlTj79cCXvEsmXRAAAB', '123123' } 
        socket.rooms.forEach(room => socket.to(room).emit("bye", socket.nickname)); // 각 방에 있는 모든 사람들에게
    });

    socket.on("new_message", (msg, room, done) => {
        socket.to(room).emit("new_message", `${socket.nickname} : ${msg}`);
        done();
    });

    socket.on("nickname", nickname => socket["nickname"] = nickname);
    console.log(socket["nickname"]);
});


const handleListen = () => console.log('Listening on http://localhost:3000');
httpServer.listen(3000, handleListen);   // 서버 연결!