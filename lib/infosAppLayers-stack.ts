import * as cdk from "aws-cdk-lib";

import { Construct } from "constructs";

import * as lambda from "aws-cdk-lib/aws-lambda";

//armazenar parametros | compartilhar parametros entre stacks sem causar dependencias entre elas
import * as ssm from "aws-cdk-lib/aws-ssm";

export class InfosAppLayersStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const infosLayers = new lambda.LayerVersion(this, "InfosLayers", {
      //localização da função
      code: lambda.Code.fromAsset("lambda/infos/layers/infosLayer"),
      //versoes do node compativeis
      compatibleRuntimes: [lambda.Runtime.NODEJS_14_X],
      //nome do layer | console do lambda
      layerVersionName: "InfosLayers",
      //estrategia de remoção | RETAIN mantem o layer msm q apague a stack
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    //salvando layer no ssm
    new ssm.StringParameter(this, "InfosLayerVersionArn", {
      parameterName: "InfosLayerVersionArn",
      stringValue: infosLayers.layerVersionArn,
      type: ssm.ParameterType.STRING,
    });
  }
}
