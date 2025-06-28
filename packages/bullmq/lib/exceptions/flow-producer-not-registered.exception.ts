export class FlowProducerNotRegisteredException extends Error {
  constructor(message?: string) {
    super(message || 'FlowProducer not registered');
  }
}
