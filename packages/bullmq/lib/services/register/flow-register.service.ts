import { FlowProducer } from 'bullmq';

import { FlowProducerNotRegisteredException } from '../../exceptions';

export class FlowRegisterService {
  private default: FlowProducer | null = null;
  private named: Map<string, FlowProducer> = new Map();

  public setDefault(flow: FlowProducer) {
    this.default = flow;
  }

  public getDefault(): FlowProducer {
    if (!this.default) {
      throw new FlowProducerNotRegisteredException('Default FlowProducer not registered');
    }
    return this.default;
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
