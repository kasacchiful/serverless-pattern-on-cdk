import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Role, ServicePrincipal, AccountRootPrincipal, PolicyDocument, PolicyStatement, ManagedPolicy, Effect } from 'aws-cdk-lib/aws-iam';
import { Bucket, EventType, BlockPublicAccess, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Function, Runtime, Architecture, Code, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { S3EventSourceV2, SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

export interface EventDrivenCollaborationStackProps extends cdk.StackProps {
  projectName: string;
}

export class EventDrivenCollaborationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: EventDrivenCollaborationStackProps) {
    super(scope, id, props);

    // S3 Buckets
    const sourceBucket = new Bucket(this, 'SourceBucket', {
      bucketName: `${props?.projectName}-source-bucket`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
    });

    const intermediateBucket = new Bucket(this, 'IntermediateBucket', {
      bucketName: `${props?.projectName}-intermediate-bucket`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
    });

    const destinationBucket = new Bucket(this, 'DestinationBucket', {
      bucketName: `${props?.projectName}-destination-bucket`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
    });

    // SNS
    const snsTopic = new Topic(this, 'SnsTopic', {
      topicName: `${props?.projectName}-sns-topic.fifo`,
      fifo: true,
      contentBasedDeduplication: false,
    });

    // SQS
    const sqs_queue = new Queue(this, 'SqsQueue', {
      queueName: `${props?.projectName}-sqs-queue.fifo`,
      fifo: true,
      contentBasedDeduplication: false,
    });

    snsTopic.addSubscription(
      new SqsSubscription(sqs_queue, {
        rawMessageDelivery: true,
      }));

    sqs_queue.addToResourcePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'sqs:*',
      ],
      resources: [
        sqs_queue.queueArn,
      ],
      principals: [
        new AccountRootPrincipal,
      ],
    }));

    // IAM Role for Lambda
    const toChangeFormatLambdaRole = new Role(this, 'ToChangeFormatLambdaRole', {
      roleName: `${props?.projectName}-to-change-format-role`,
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        ReadOnlySourceBucket: new PolicyDocument({
          statements: [new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              's3:Get*',
              's3:List*',
            ],
            resources: [
              sourceBucket.bucketArn,
              `${sourceBucket.bucketArn}/*`,
            ],
          })]
        }),
        FullAccessDestinationBucket: new PolicyDocument({
          statements: [new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              's3:*',
            ],
            resources: [
              intermediateBucket.bucketArn,
              `${intermediateBucket.bucketArn}/*`,
            ],
          })]
        }),
        SnsPublish: new PolicyDocument({
          statements: [new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'sns:Publish'
            ],
            resources: [
              snsTopic.topicArn
            ],
          })]
        }),
      }
    });
    toChangeFormatLambdaRole.addManagedPolicy(
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      ));
    const toChangeTypeLambdaRole = new Role(this, 'ToChangeTypeLambdaRole', {
      roleName: `${props?.projectName}-to-change-type-role`,
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        ReadOnlySourceBucket: new PolicyDocument({
          statements: [new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              's3:Get*',
              's3:List*',
            ],
            resources: [
              intermediateBucket.bucketArn,
              `${intermediateBucket.bucketArn}/*`,
            ],
          })]
        }),
        FullAccessDestinationBucket: new PolicyDocument({
          statements: [new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              's3:*',
            ],
            resources: [
              destinationBucket.bucketArn,
              `${destinationBucket.bucketArn}/*`,
            ],
          })]
        }),
      }
    });
    toChangeTypeLambdaRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      ));

    // Lambda for Data Processing
    const awsSdkForPandasLayer = LayerVersion.fromLayerVersionArn(this, 'AwsSdkForPandasLayer',
      'arn:aws:lambda:ap-northeast-1:336392948345:layer:AWSSDKPandas-Python312-Arm64:12'
    );
    const toChangeFormatFunction = new Function(this, 'ToChangeFormatFunction', {
      functionName: `${props?.projectName}-to-change-format`,
      runtime: Runtime.PYTHON_3_12,
      architecture: Architecture.ARM_64,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      handler: 'to-change-format.lambda_handler',
      code: Code.fromAsset('./resources/event-driven-collaboration/lambda/'),
      role: toChangeFormatLambdaRole,
      layers: [
        awsSdkForPandasLayer,
      ],
      environment: {
        'DESTINATION_BUCKET_NAME': intermediateBucket.bucketName,
        'SNS_TOPIC_ARN': snsTopic.topicArn,
      },
    });
    const toChangeTypeFunction = new Function(this, 'ToChangeTypeFunction', {
      functionName: `${props?.projectName}-to-change-type`,
      runtime: Runtime.PYTHON_3_12,
      architecture: Architecture.ARM_64,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      handler: 'to-change-type.lambda_handler',
      code: Code.fromAsset('./resources/event-driven-collaboration/lambda/'),
      role: toChangeTypeLambdaRole,
      layers: [
        awsSdkForPandasLayer,
      ],
      environment: {
        'DESTINATION_BUCKET_NAME': destinationBucket.bucketName,
      },
    });

    // add event source.
    toChangeFormatFunction.addEventSource(
      new S3EventSourceV2(sourceBucket, {
        events: [EventType.OBJECT_CREATED,],
      }));

    toChangeTypeFunction.addEventSource(
      new SqsEventSource(sqs_queue, {
      }));

  }
}
