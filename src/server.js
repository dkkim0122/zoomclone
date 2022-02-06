import http from "http";
import { Server } from "socket.io";
import express from "express";
import {instrument} from "@socket.io/admin-ui";


const app = express();

app.set("view engine", "pug");  // 원하는 엔진을 템플릿 엔진으로 사용하기 위한 설정
app.set("views", __dirname + "/views");  // view 파일들이 모여있는 폴더 지정
app.use("/public", express.static(__dirname + "/public"));  // 유저가 public으로 가면 __dirname + '/public' 폴더를 보여준다.
app.get("/", (req, res) => res.render("home"));  // route handler. 응답해줄 템플릿 파일 home.pug
app.get('/*', (req, res) => res.redirect("/"));  // / 뒤의 다른 url은 다 /으로 리다이렉트된다.


const httpServer = http.createServer(app);
const wsServer = new Server(httpServer, {
    cors: {
      origin: ["https://admin.socket.io"],
      credentials: true
    }
});  // 서버에 socket io 설치

instrument(wsServer, {
    auth: false
  });  


wsServer.on("connection", socket => {
    socket.on("join_room", (roomName, done) => {
        socket.join(roomName);
        done();
        socket.to(roomName).emit("welcome");
    }) 
})



const handleListen = () => console.log('Listening on http://localhost:3000');
httpServer.listen(3000, handleListen);   // 서버 연결!