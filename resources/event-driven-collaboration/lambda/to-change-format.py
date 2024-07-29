import os
import json
import uuid
import boto3
import awswrangler as wr

def lambda_handler(event, context):
    sourceBucket = event['Records'][0].get('s3', {}).get('bucket', {}).get('name')
    sourceObject = event['Records'][0].get('s3', {}).get('object', {}).get('key')
    destinationBucket = os.environ.get('DESTINATION_BUCKET_NAME')
    snsTopicArn = os.environ.get('SNS_TOPIC_ARN')

    ## to parquet (ex: sample.csv => sample.parquet)
    sourcePath = f's3://{os.path.join(sourceBucket, sourceObject)}'
    destinationPath = f's3://{os.path.join(destinationBucket, os.path.dirname(sourceObject))}{os.path.splitext(os.path.basename(sourceObject))[0]}.parquet'
    df = wr.s3.read_csv(sourcePath, dtype_backend='pyarrow')
    wr.s3.to_parquet(df, path=destinationPath, index=False)

    sns = boto3.client('sns')
    sns.publish(
        TopicArn=snsTopicArn,
        Message=json.dumps({
            'bucket_name': destinationBucket,
            'object_key': f'{os.path.dirname(sourceObject)}{os.path.splitext(os.path.basename(sourceObject))[0]}.parquet'
        }),
        MessageDeduplicationId=str(uuid.uuid4()),
        MessageGroupId='toChangeFormat',
    )

    return json.dumps({
        'code': 200,
        'msg': {
            'destination': destinationPath
        },
    })
