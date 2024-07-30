import os
import re
import awswrangler as wr

def lambda_handler(event, context):
    sourceBucket = event.get('bucket')
    sourcePath = event.get('path')
    sourceObject = re.match(f'^s3://{sourceBucket}/(.+)', sourcePath).group(1)
    destinationBucket = os.environ.get('DESTINATION_BUCKET_NAME')

    ## to change type (ex: column: date, string => date)
    destinationPath = f's3://{os.path.join(destinationBucket, os.path.dirname(sourceObject), os.path.basename(sourceObject))}'
    df = wr.s3.read_parquet(sourcePath)
    df = df.astype({'date': 'date64[pyarrow]'})
    wr.s3.to_parquet(df, path=destinationPath, index=False)

    return {
        'code': 200,
        'msg': {
            'destination': destinationPath
        },
    }
