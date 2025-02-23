const { log } = require("console");
const express = require("express");
const querystring = require("querystring");
const WebSocket = require("ws");
const app = express();
const port = 3000;

// 提供静态文件
app.use(express.static("public"));

// 处理用户页面路由
app.get("/main/:username", (req, res) => {
  res.sendFile(__dirname + "/public/main.html");
});

// 启动HTTP服务器
const server = app.listen(port, () => {
  console.log(`Server  running on http://localhost:${port}`);
});

// 创建WebSocket服务器
const wss = new WebSocket.Server({ server });
const users = new Map(); // 存储在线用户

wss.on("connection", (socket, req) => {
  // 从查询参数获取用户名
  const params = querystring.parse(req.url.split("?")[1]);
  const username = decodeURIComponent(params.username);

  if (!username) {
    socket.close();
    return;
  }

  // 添加用户到列表
  users.set(socket, username);
  updateAllUsers();

  // 接受客户端消息
  socket.on("message", (message) => {
    const data = JSON.parse(message);
    const { type, content } = data;
    if (type === "message") {
      users.forEach((username, client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "message",
              content: content,
            })
          );
        }
      });
    }
  });
  // 处理连接关闭
  socket.on("close", () => {
    users.delete(socket);
    updateAllUsers();
  });
});

// 广播更新用户列表
function updateAllUsers() {
  const userList = Array.from(users.values());
  users.forEach((username, client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "userlist",
          users: userList,
        })
      );
    }
  });
}
