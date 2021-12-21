import { User } from './user';

export class Room {
    name: string;
    host: User;
    playerNumber: number
    
    constructor(name: string, host: User, playerNumber: number) {
        this.name = name;
        this.host = host;
        this.playerNumber = playerNumber;
    }
}