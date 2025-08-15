---
'@event-driven-architecture/bullmq': minor
---

Split fanout task hierarchy: make BullMqFanoutTask extend BullMqBaseTask instead of BullMqTask to remove the artificial queueName: '**fanout**' placeholder and simplify type constraints
