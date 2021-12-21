export class User {
    uuid;
    username;
    color;
    state;
    
    constructor(json) {
        this.uuid = json.uuid;
        this.username = json.username;
        this.color = json.color;
    }
}