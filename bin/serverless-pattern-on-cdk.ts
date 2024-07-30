#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SimpleS3DataProcessingStack } from '../lib/simple-s3-data-processing-stack';
import { EventDrivenCollaborationStack } from '../lib/event-driven-collaboration-stack';
import { StateMachineChainStack } from '../lib/state-machine-chain-stack';

const app = new cdk.App();
new SimpleS3DataProcessingStack(app, 'SimpleS3DataProcessingStack', {
  projectName: 'sls-patterns-simple-s3-data-processing'
});
new EventDrivenCollaborationStack(app, 'EventDrivenCollaborationStack', {
  projectName: 'sls-patterns-event-driven-collaboration'
});
new StateMachineChainStack(app, 'StateMachineChainStack', {
  projectName: 'sls-patterns-state-machine-chain'
});
