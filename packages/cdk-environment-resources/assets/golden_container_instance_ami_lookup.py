import boto3
from datetime import datetime

def handler(event, context):
    if(event['RequestType'] in ['Create', 'Update']):
        client = boto3.client('ec2')
        images = client.describe_images(
            Filters=[
                {
                    'Name': 'tag:Name',
                    'Values': ['Daysmart ECS Windows Optimized AMI']
                }
            ],
            Owners=['self']
        )
        images['Images'].sort(reverse=True, key = lambda image: datetime.strptime(image['CreationDate'], "%Y-%m-%dT%H:%M:%S.%fZ"))
        ami_id = images['Images'][0]['ImageId']
        ami_name = images['Images'][0]['name']
        return {'PhysicalResourceId': ami_id, 'Data': {'ImageId': ami_id, 'Name': ami_name}}
    else:
        return
