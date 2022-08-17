import * as lambda from "aws-cdk-lib/aws-lambda";

import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs";

import * as cdk from "aws-cdk-lib";

import { Construct } from "constructs";

import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

import * as ssm from "aws-cdk-lib/aws-ssm";

export class MoviesAppStack extends cdk.Stack {
  readonly moviesFetchHandler: lambdaNodeJS.NodejsFunction;

  readonly moviesAdminHandler: lambdaNodeJS.NodejsFunction;

  readonly moviesDdb: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.moviesDdb = new dynamodb.Table(this, "MoviesDdb", {
      tableName: "movies",
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
    const moviesLayerArn = ssm.StringParameter.valueForStringParameter(
      this,
      "MoviesLayerVersionArn"
    );

    //Mesmo recurso layer criado na stack de layers porem aqui passado como parametro
    const moviesLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "MoviesLayerVersionArn",
      moviesLayerArn
    );

    //FUNÇÃO GET MOVIES
    this.moviesFetchHandler = new lambdaNodeJS.NodejsFunction(
      this,
      "MoviesFetchFunction",
      {
        functionName: "MoviesFetchFunction",
        entry: "lambda/products/moviesFetchFunction.ts",
        handler: "handler",
        memorySize: 128,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          sourceMap: false,
        },
        environment: {
          MOVIES_DDB: this.moviesDdb.tableName,
        },
        layers: [moviesLayer],
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
      }
    );

    //Permitindo que a função possa LER na tabela
    this.moviesDdb.grantReadData(this.moviesFetchHandler);

    //Admin Movies
    this.moviesAdminHandler = new lambdaNodeJS.NodejsFunction(
      this,
      "MoviesAdminFunction",
      {
        functionName: "MoviesAdminFunction",
        entry: "lambda/products/moviesAdminFunction.ts",
        handler: "handler",
        memorySize: 128,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          sourceMap: false,
        },
        environment: {
          MOVIES_DDB: this.moviesDdb.tableName,
        },
        //Libera a utilização dos trechos de código por esta função lambda
        layers: [moviesLayer],
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
      }
    );

    //Permitindo que a função possa GERENCIAR a tabela
    this.moviesDdb.grantWriteData(this.moviesAdminHandler);
  }
}
