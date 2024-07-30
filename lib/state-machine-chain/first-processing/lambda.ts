import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Role, ServicePrincipal, PolicyDocument, PolicyStatement, ManagedPolicy, Effect } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Function, Runtime, Architecture, Code, LayerVersion } from 'aws-cdk-lib/aws-lambda';

export interface toChangeFormatFunctionConstructProps {
  projectName: string;
  sourceBucket: Bucket;
  intermediateBucket: Bucket;
}

export class ToChangeFormatFunctionConstruct extends Construct {
  public readonly lambdaFunction: Function;

  constructor(scope: Construct, id: string, props: toChangeFormatFunctionConstructProps) {
    super(scope, id);

    // IAM Role for Lambda Function
    const toChangeFormatLambdaRole = new Role(this, 'ToChangeFormatLambdaRole', {
      roleName: `${props.projectName}-to-change-format-role`,
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
              props.sourceBucket.bucketArn,
              `${props.sourceBucket.bucketArn}/*`,
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
              props.intermediateBucket.bucketArn,
              `${props.intermediateBucket.bucketArn}/*`,
            ],
          })]
        }),
      }
    });
    toChangeFormatLambdaRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      ));

    // Lambda Layer
    const awsSdkForPandasLayer = LayerVersion.fromLayerVersionArn(this, 'AwsSdkForPandasLayer',
      'arn:aws:lambda:ap-northeast-1:336392948345:layer:AWSSDKPandas-Python312-Arm64:12'
    );

    // Lambda Function
    this.lambdaFunction = new Function(this, 'ToChangeFormatFunction', {
      functionName: `${props.projectName}-to-change-format`,
      runtime: Runtime.PYTHON_3_12,
      architecture: Architecture.ARM_64,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      handler: 'to-change-format.lambda_handler',
      code: Code.fromAsset('./resources/state-machine-chain/first-processing/lambda/'),
      role: toChangeFormatLambdaRole,
      layers: [
        awsSdkForPandasLayer,
      ],
      environment: {
        'SOURCE_BUCKET_NAME': props.sourceBucket.bucketName,
        'DESTINATION_BUCKET_NAME': props.intermediateBucket.bucketName,
      },
    });
  }
}
