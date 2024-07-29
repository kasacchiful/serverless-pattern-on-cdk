import os
import json
import awswrangler as wr
import pyarrow as pa

def lambda_handler(event, context):
    msg = json.loads(event['Records'][0].get('body', {}))
    sourceBucket = msg.get('bucket_name')
    sourceObject = msg.get('object_key')
    destinationBucket = os.environ.get('DESTINATION_BUCKET_NAME')

    ## to change type (ex: column: date, string => date)
    sourcePath = f's3://{os.path.join(sourceBucket, sourceObject)}'
    destinationPath = f's3://{os.path.join(destinationBucket, os.path.dirname(sourceObject))}{os.path.basename(sourceObject)}'
    df = wr.s3.read_parquet(sourcePath)
    df = df.astype({'date': 'date64[pyarrow]'})
    wr.s3.to_parquet(df, path=destinationPath, index=False)

    return json.dumps({
        'code': 200,
        'msg': {
            'destination': destinationPath
        },
    })
