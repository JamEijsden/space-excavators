export class ChatMessage {
    user;
    msg;
    timestamp;

    constructor(json) {
        this.user = json.user;
        this.msg = json.msg;
        this.timestamp = json.timestamp;
    }
}