import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { CommonS3BucketConstruct } from './state-machine-chain/common/s3';
import { InterSnsSqsConstruct } from './state-machine-chain/inter-processing/sns-sqs';
import { ToChangeFormatFunctionConstruct } from './state-machine-chain/first-processing/lambda';
import { FirstProcessingStateMachineConstruct } from './state-machine-chain/first-processing/step-functions';
import { ToChangeTypeFunctionConstruct } from './state-machine-chain/second-processing/lambda';
import { SecondProcessingStateMachineConstruct } from './state-machine-chain/second-processing/step-functions';

export interface StateMachineChainStackProps extends cdk.StackProps {
  projectName: string;
}

export class StateMachineChainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StateMachineChainStackProps) {
    super(scope, id, props);

    // common
    const commonS3BucketConstruct = new CommonS3BucketConstruct(this, 'CommonS3Bucket', {
      projectName: props.projectName
    });

    // inter-processing
    const interSnsSqsConstruct = new InterSnsSqsConstruct(this, 'InterSnsSqsConstruct', {
      projectName: props.projectName
    });

    // first processing
    const toChangeFormatFunctionConstruct = new ToChangeFormatFunctionConstruct(this, 'ToChangeFormatFunction', {
      projectName: props.projectName,
      sourceBucket: commonS3BucketConstruct.sourceBucket,
      intermediateBucket: commonS3BucketConstruct.intermediateBucket,
    });
    const firstProcessingStateMachineConstruct = new FirstProcessingStateMachineConstruct(this, 'FirstProcessingStateMachineConstruct', {
      projectName: props.projectName,
      toChangeFormatFunction: toChangeFormatFunctionConstruct.lambdaFunction,
      snsTopic: interSnsSqsConstruct.snsTopic,
    });

    // second processing
    const toChangeTypeFunctionConstruct = new ToChangeTypeFunctionConstruct(this, 'ToChangeTypeFunction', {
      projectName: props.projectName,
      intermediateBucket: commonS3BucketConstruct.intermediateBucket,
      destinationBucket: commonS3BucketConstruct.destinationBucket,
    });
    const secondProcessingStateMachineConstruct = new SecondProcessingStateMachineConstruct(this, 'SecondProcessingStateMachineConstruct', {
      projectName: props.projectName,
      toChangeTypeFunction: toChangeTypeFunctionConstruct.lambdaFunction,
      sqsQueue: interSnsSqsConstruct.sqsQueue,
    });
  }
}
