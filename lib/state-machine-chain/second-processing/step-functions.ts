import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Role, ServicePrincipal, PolicyDocument, PolicyStatement, ManagedPolicy, Effect } from 'aws-cdk-lib/aws-iam';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { StateMachine, DefinitionBody } from 'aws-cdk-lib/aws-stepfunctions';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { CfnPipe } from 'aws-cdk-lib/aws-pipes';

export interface SecondProcessingStateMachineConstructProps {
  projectName: string;
  toChangeTypeFunction: Function;
  sqsQueue: Queue;
}

export class SecondProcessingStateMachineConstruct extends Construct {
  public readonly stateMachine: StateMachine;

  constructor(scope: Construct, id: string, props: SecondProcessingStateMachineConstructProps) {
    super(scope, id);

    // IAM Role for State Machine
    const stateMachineRole = new Role(this, 'SecondProcessingStateMachineRole', {
      roleName: `${props.projectName}-second-state-machine-role`,
      assumedBy: new ServicePrincipal('states.amazonaws.com'),
    });
    stateMachineRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AWSLambda_FullAccess'));

    // State Machine
    this.stateMachine = new StateMachine(this, 'SecondProcessingStateMachine', {
      stateMachineName: `${props.projectName}-second-processing-state-machine`,
      role: stateMachineRole,
      definitionBody: DefinitionBody.fromFile(
        'resources/state-machine-chain/second-processing/step-functions/second-processing-state-machine.asl.yaml'
      ),
      definitionSubstitutions: {
        ToChangeTypeFunctionArn: props.toChangeTypeFunction.functionArn,
      }
    });

    // IAM Role for Pipe
    const sourcePolicy = new PolicyDocument({
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'sqs:ReceiveMessage',
            'sqs:DeleteMessage',
            'sqs:GetQueueAttributes',
            'sqs:GetQueueUrl',
            'sqs:ChangeMessageVisibility',
          ],
          resources: [
            props.sqsQueue.queueArn
          ]
        })
      ]
    });
    const targetPolicy = new PolicyDocument({
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'states:StartExecution'
          ],
          resources: [
            this.stateMachine.stateMachineArn
          ]
        })
      ]
    });
    const pipeRunnerRole = new Role(this, 'PipeRole', {
      inlinePolicies: { sourcePolicy, targetPolicy },
      assumedBy: new ServicePrincipal('pipes.amazonaws.com')
    });

    // Pipe
    new CfnPipe(this, 'Pipe', {
      source: props.sqsQueue.queueArn,
      sourceParameters: {
        sqsQueueParameters: {
          batchSize: 1,
        },
      },
      target: this.stateMachine.stateMachineArn,
      targetParameters: {
        stepFunctionStateMachineParameters: {
          invocationType: 'FIRE_AND_FORGET',  // Invoke asynchronously
        }
      },
      roleArn: pipeRunnerRole.roleArn
    });
  }
}
