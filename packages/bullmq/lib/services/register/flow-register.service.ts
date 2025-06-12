import { FlowProducer } from 'bullmq';

export class FlowRegisterService {
  private singleton: FlowProducer | null = null;
  private named: Map<string, FlowProducer> = new Map();

  public addSingleton(flow: FlowProducer) {
    this.singleton = flow;
  }

  public getSingleton(): FlowProducer {
    if (!this.singleton) {
      throw new Error('Singleton FlowProducer not registered');
    }
    return this.singleton;
  }

  public addNamed(name: string, flow: FlowProducer) {
    this.named.set(name, flow);
  }

  public getNamed(name: string): FlowProducer {
    const flow = this.named.get(name);
    if (!flow) {
      throw new Error(`Named FlowProducer not registered for name: ${name}`);
    }
    return flow;
  }
}
