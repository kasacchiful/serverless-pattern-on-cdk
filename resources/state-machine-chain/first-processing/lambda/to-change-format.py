import os
import boto3
import awswrangler as wr

def lambda_handler(event, context):
    sourceBucket = os.environ.get('SOURCE_BUCKET_NAME')
    destinationBucket = os.environ.get('DESTINATION_BUCKET_NAME')

    destinationPaths = []
    s3 = boto3.resource('s3')
    obj_list = [ k.key for k in s3.Bucket(sourceBucket).objects.all() if (os.path.splitext(os.path.basename(k.key))[1] == '.csv')]
    for sourceObject in obj_list:
        ## to parquet (ex: sample.csv => sample.parquet)
        sourcePath = f's3://{os.path.join(sourceBucket, sourceObject)}'
        destinationPath = f's3://{os.path.join(destinationBucket, os.path.dirname(sourceObject), os.path.splitext(os.path.basename(sourceObject))[0])}.parquet'
        df = wr.s3.read_csv(sourcePath, dtype_backend='pyarrow')
        wr.s3.to_parquet(df, path=destinationPath, index=False)
        destinationPaths.append({"bucket": destinationBucket, "path": destinationPath})

    return {
        'code': 200,
        'msg': {
            'destination': destinationPaths
        },
        'groupId': 'toChangeFormat',
    }
