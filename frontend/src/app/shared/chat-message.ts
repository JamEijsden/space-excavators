import { User } from './class/user';

export class ChatMessage {
    user: User;
    msg: string;
    timestamp: number;

    constructor(user: User, msg: string, timestamp: number) {
        this.user = user;
        this.msg = msg;
        this.timestamp = timestamp;
    }

}