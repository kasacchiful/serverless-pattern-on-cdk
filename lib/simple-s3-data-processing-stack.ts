import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Role, ServicePrincipal, PolicyDocument, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { Bucket, EventType, BlockPublicAccess, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Function, Runtime, Architecture, Code, LayerVersion } from 'aws-cdk-lib/aws-lambda';

export interface SimpleS3DataProcessingStackProps extends cdk.StackProps {
  projectName: string;
}

export class SimpleS3DataProcessingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: SimpleS3DataProcessingStackProps) {
    super(scope, id, props);

    // S3 Buckets
    const sourceBucket = new Bucket(this, 'SourceBucket', {
      bucketName: `${props?.projectName}-source-bucket`,
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

    // IAM Role for Lambda
    const lambdaRole = new Role(this, 'LambdaRole', {
      roleName: `${props?.projectName}-lambda-role`,
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
              destinationBucket.bucketArn,
              `${destinationBucket.bucketArn}/*`,
            ],
          })]
        }),
      }
    });
    lambdaRole.addManagedPolicy(
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      ));

    // Lambda for Data Processing
    const awsSdkForPandasLayer = LayerVersion.fromLayerVersionArn(this, 'AwsSdkForPandasLayer',
      'arn:aws:lambda:ap-northeast-1:336392948345:layer:AWSSDKPandas-Python312-Arm64:12'
    );
    const dataProcessingFunction = new Function(this, 'DataProcessingFunction', {
      functionName: `${props?.projectName}-data-processing-function`,
      runtime: Runtime.PYTHON_3_12,
      architecture: Architecture.ARM_64,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      handler: 'data-processing.lambda_handler',
      code: Code.fromAsset('./resources/simple-s3-data-processing/lambda/'),
      role: lambdaRole,
      layers: [
        awsSdkForPandasLayer,
      ],
      environment: {
        'DESTINATION_BUCKET_NAME': destinationBucket.bucketName,
      },
    });
    // add event source.
    dataProcessingFunction.addEventSource(
      new cdk.aws_lambda_event_sources.S3EventSourceV2(sourceBucket, {
        events: [EventType.OBJECT_CREATED,],
      }));
  }
}
