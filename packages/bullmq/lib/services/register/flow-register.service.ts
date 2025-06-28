import { FlowProducer } from 'bullmq';

import { FlowProducerNotRegisteredException } from '../../exceptions';

export class FlowRegisterService {
  private singleton: FlowProducer | null = null;
  private named: Map<string, FlowProducer> = new Map();

  public addSingleton(flow: FlowProducer) {
    this.singleton = flow;
  }

  public getSingleton(): FlowProducer {
    if (!this.singleton) {
      throw new FlowProducerNotRegisteredException('Singleton FlowProducer not registered');
    }
    return this.singleton;
  }

  public addNamed(name: string, flow: FlowProducer) {
    this.named.set(name, flow);
  }

  public getNamed(name: string): FlowProducer {
    const flow = this.named.get(name);
    if (!flow) {
      throw new FlowProducerNotRegisteredException(`Named FlowProducer not registered for name: ${name}`);
    }
    return flow;
  }
}
