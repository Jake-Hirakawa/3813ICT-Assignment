export class User {
  constructor(
    public id: number,
    public username: string,
    public email: string,
    public roles: string[],
    public groups: number[]
  ) {}
}

export class Group {
  constructor(
    public id: number,
    public name: string,
    public description: string,
    public members: number[],
    public channels: number[]
  ) {}
}