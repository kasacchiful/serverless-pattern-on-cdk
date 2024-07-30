import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Role, ServicePrincipal, PolicyDocument, PolicyStatement, ManagedPolicy, Effect } from 'aws-cdk-lib/aws-iam';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { StateMachine, DefinitionBody } from 'aws-cdk-lib/aws-stepfunctions';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { SfnStateMachine } from 'aws-cdk-lib/aws-events-targets';
import { Topic } from 'aws-cdk-lib/aws-sns';

export interface FirstProcessingStateMachineConstructProps {
  projectName: string;
  toChangeFormatFunction: Function;
  snsTopic: Topic;
}

export class FirstProcessingStateMachineConstruct extends Construct {
  public readonly stateMachine: StateMachine;

  constructor(scope: Construct, id: string, props: FirstProcessingStateMachineConstructProps) {
    super(scope, id);

    // IAM Role for State Machine
    const stateMachineRole = new Role(this, 'FirstProcessingStateMachineRole', {
      roleName: `${props.projectName}-first-state-machine-role`,
      assumedBy: new ServicePrincipal('states.amazonaws.com'),
    });
    stateMachineRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AWSLambda_FullAccess'));
    stateMachineRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSNSFullAccess'));

    // State Machine
    this.stateMachine = new StateMachine(this, 'FirstProcessingStateMachine', {
      stateMachineName: `${props.projectName}-first-processing-state-machine`,
      role: stateMachineRole,
      definitionBody: DefinitionBody.fromFile(
        'resources/state-machine-chain/first-processing/step-functions/first-processing-state-machine.asl.yaml'
      ),
      definitionSubstitutions: {
        ToChangeFormatFunctionArn: props.toChangeFormatFunction.functionArn,
        SnsTopicArn: props.snsTopic.topicArn,
      }
    });

    // event schedule rule
    new Rule(this, 'FirstProcessStateMachineScheduleRule', {
      ruleName: `${props.projectName}-first-state-machine-rule`,
      schedule: Schedule.cron({
        minute: '0',
        hour: '21',
      }),
      targets: [new SfnStateMachine(this.stateMachine)],
      enabled: false,
    });
  }
}
