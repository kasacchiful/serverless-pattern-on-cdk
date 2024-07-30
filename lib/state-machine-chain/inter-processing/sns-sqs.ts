import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { AccountRootPrincipal, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export interface InterSnsSqsConstructProps extends cdk.StackProps {
  projectName: string;
}

export class InterSnsSqsConstruct extends Construct {
  public readonly snsTopic: Topic;
  public readonly sqsQueue: Queue;

  constructor(scope: Construct, id: string, props: InterSnsSqsConstructProps) {
    super(scope, id);

    // SNS
    this.snsTopic = new Topic(this, 'SnsTopic', {
      topicName: `${props?.projectName}-sns-topic.fifo`,
      fifo: true,
      contentBasedDeduplication: false,
    });

    // SQS
    this.sqsQueue = new Queue(this, 'SqsQueue', {
      queueName: `${props?.projectName}-sqs-queue.fifo`,
      fifo: true,
      contentBasedDeduplication: false,
    });

    this.snsTopic.addSubscription(
      new SqsSubscription(this.sqsQueue, {
        rawMessageDelivery: true,
      }));

    this.sqsQueue.addToResourcePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'sqs:*',
      ],
      resources: [
        this.sqsQueue.queueArn,
      ],
      principals: [
        new AccountRootPrincipal,
      ],
    }));

  }
}
