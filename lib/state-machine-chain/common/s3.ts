import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket, BlockPublicAccess, BucketEncryption } from 'aws-cdk-lib/aws-s3';

export interface CommonS3BucketConstructProps extends cdk.StackProps {
  projectName: string;
}

export class CommonS3BucketConstruct extends Construct {
  public readonly sourceBucket: Bucket;
  public readonly intermediateBucket: Bucket;
  public readonly destinationBucket: Bucket;

  constructor(scope: Construct, id: string, props: CommonS3BucketConstructProps) {
    super(scope, id);

    // S3 Buckets
    this.sourceBucket = new Bucket(this, 'SourceBucket', {
      bucketName: `${props.projectName}-source-bucket`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
    });

    this.intermediateBucket = new Bucket(this, 'IntermediateBucket', {
      bucketName: `${props.projectName}-intermediate-bucket`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
    });

    this.destinationBucket = new Bucket(this, 'DestinationBucket', {
      bucketName: `${props.projectName}-destination-bucket`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
    });
  }
}
