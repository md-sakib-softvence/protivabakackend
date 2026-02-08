import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { MessageService } from './message.service';
import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: "*"
  },
  namespace: "/socket/message"
})
@Injectable()
export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private onlineUser: Map<string, string> = new Map();

  constructor(private readonly messageService: MessageService) { }

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;

    if (userId) {
      this.onlineUser.set(userId, client.id);
      console.log(`User Connected : ${userId}`);
    }

  }

  handleDisconnect(client: Socket) {
    const disconnectedUser = Array.from(this.onlineUser.entries()).find(
      ([_, socketId]) => socketId === client.id
    );

    if (disconnectedUser) {
      this.onlineUser.delete(disconnectedUser[0]);
      console.log(`User Disconnected : ${disconnectedUser[0]}`);
    }

  }

  @SubscribeMessage("send_message")
  async handleSentMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sanderId: string, reciverId: string, content: string, messageType: "TEXT" | "AUDIO" }
  ) {

    const { sanderId, reciverId, messageType, content } = payload;


    const message = await this.sendMessage(sanderId, reciverId, content, messageType);

    client.emit("message-sent", message);

    return message;

  }


  async sendMessage(sanderId: string, receiverId: string, content: string, messageType: "TEXT" | "AUDIO") {

    const message = await this.messageService.createMessage(sanderId, receiverId, content, messageType)

    const recevierSocketId = this.onlineUser.get(receiverId);

    if (recevierSocketId) {
      this.server.to(recevierSocketId).emit("recive-message", message);
    }
    return message
  }

  // async sendMessageToUser(sanderId: string, receiverId: string, content: string, messageType: "TEXT" | "AUDIO") {

  //   const message = await this.messageService.createMessage(sanderId, receiverId, content, messageType);


  //   const receiverSocketId = this.onlineUser.get(receiverId);

  //   const ricverId = this.onlineUser.get(receiverId);

  //   if (receiverSocketId) {
  //     this.server.to(receiverSocketId).emit('receive-message', message);
  //   }

  //   return message;
  // }

}
