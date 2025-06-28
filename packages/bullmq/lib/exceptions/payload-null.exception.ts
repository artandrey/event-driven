export class PayloadNullException extends Error {
  constructor() {
    super('Payload is null');
  }
}
