import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Role, ServicePrincipal, PolicyDocument, PolicyStatement, ManagedPolicy, Effect } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Function, Runtime, Architecture, Code, LayerVersion } from 'aws-cdk-lib/aws-lambda';

export interface toChangeTypeFunctionConstructProps {
  projectName: string;
  intermediateBucket: Bucket;
  destinationBucket: Bucket;
}

export class ToChangeTypeFunctionConstruct extends Construct {
  public readonly lambdaFunction: Function;

  constructor(scope: Construct, id: string, props: toChangeTypeFunctionConstructProps) {
    super(scope, id);

    // IAM Role for Lambda Function
    const toChangeTypeLambdaRole = new Role(this, 'ToChangeTypeLambdaRole', {
      roleName: `${props.projectName}-to-change-type-role`,
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
              props.intermediateBucket.bucketArn,
              `${props.intermediateBucket.bucketArn}/*`,
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
              props.destinationBucket.bucketArn,
              `${props.destinationBucket.bucketArn}/*`,
            ],
          })]
        }),
      }
    });
    toChangeTypeLambdaRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      ));

    // Lambda Layer
    const awsSdkForPandasLayer = LayerVersion.fromLayerVersionArn(this, 'AwsSdkForPandasLayer',
      'arn:aws:lambda:ap-northeast-1:336392948345:layer:AWSSDKPandas-Python312-Arm64:12'
    );

    // Lambda Function
    this.lambdaFunction = new Function(this, 'ToChangeTypeFunction', {
      functionName: `${props.projectName}-to-change-type`,
      runtime: Runtime.PYTHON_3_12,
      architecture: Architecture.ARM_64,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      handler: 'to-change-type.lambda_handler',
      code: Code.fromAsset('./resources/state-machine-chain/second-processing/lambda/'),
      role: toChangeTypeLambdaRole,
      layers: [
        awsSdkForPandasLayer,
      ],
      environment: {
        'DESTINATION_BUCKET_NAME': props.destinationBucket.bucketName,
      },
    });
  }
}
