import * as lambda from "aws-cdk-lib/aws-lambda";

import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs";

import * as cdk from "aws-cdk-lib";

import { Construct } from "constructs";

import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

import * as ssm from "aws-cdk-lib/aws-ssm";

export class InfosAppStack extends cdk.Stack {
  readonly infosAdminHandler: lambdaNodeJS.NodejsFunction;

  readonly infosDdb: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.infosDdb = new dynamodb.Table(this, "InfosDdb", {
      tableName: "infos",
      //politica de remoção da tabela: destruir caso destrua a infra
      removalPolicy: cdk.RemovalPolicy.DESTROY,

      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
      //Modo de cobrança
      billingMode: dynamodb.BillingMode.PROVISIONED,
      //Capacidade de leitura 1 leitura por segundo
      readCapacity: 1,
      //Capacidade de escrita 1 por segundo
      writeCapacity: 1,
    });

    //Resgatando layer que salvei no ssm
    const infosLayerArn = ssm.StringParameter.valueForStringParameter(
      this,
      "InfosLayerVersionArn"
    );

    //Mesmo recurso layer criado na stack de layers porem aqui passado como parametro
    const infosLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "InfosLayerVersionArn",
      infosLayerArn
    );

    //Admin Movies
    this.infosAdminHandler = new lambdaNodeJS.NodejsFunction(
      this,
      "InfosAdminFunction",
      {
        functionName: "InfosAdminFunction",
        entry: "lambda/infos/infosAdminFunction.ts",
        handler: "handler",
        memorySize: 128,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          sourceMap: false,
        },
        environment: {
          INFOS_DDB: this.infosDdb.tableName,
        },
        //Libera a utilização dos trechos de código por esta função lambda
        layers: [infosLayer],
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
      }
    );

    //Permitindo que a função possa GERENCIAR a tabela
    this.infosDdb.grantReadWriteData(this.infosAdminHandler);
  }
}
