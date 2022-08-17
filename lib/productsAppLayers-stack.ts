import * as cdk from "aws-cdk-lib";

import { Construct } from "constructs";

import * as lambda from "aws-cdk-lib/aws-lambda";

//armazenar parametros | compartilhar parametros entre stacks sem causar dependencias entre elas
import * as ssm from "aws-cdk-lib/aws-ssm";

export class ProductsAppLayersStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsLayers = new lambda.LayerVersion(this, "ProductsLayer", {
      //localização da função
      code: lambda.Code.fromAsset("lambda/products/layers/productsLayer"),
      //versoes do node compativeis
      compatibleRuntimes: [lambda.Runtime.NODEJS_14_X],
      //nome do layer | console do lambda
      layerVersionName: "ProductsLayer",
      //estrategia de remoção | RETAIN mantem o layer msm q apague a stack
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    //salvando layer no ssm
    new ssm.StringParameter(this, "ProductsLayerVersionArn", {
      parameterName: "ProductsLayerVersionArn",
      stringValue: productsLayers.layerVersionArn,
    });

    //Ao criar um layer sempre lembrar de adicionar o path do mesmo no arquivo tsconfig.json

    const productEventsLayers = new lambda.LayerVersion(
      this,
      "ProductEventsLayer",
      {
        //localização da função
        code: lambda.Code.fromAsset(
          "lambda/products/layers/productEventsLayer"
        ),
        //versoes do node compativeis
        compatibleRuntimes: [lambda.Runtime.NODEJS_14_X],
        //nome do layer | console do lambda
        layerVersionName: "ProductEventsLayer",
        //estrategia de remoção | RETAIN mantem o layer msm q apague a stack
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      }
    );

    //salvando layer no ssm
    new ssm.StringParameter(this, "ProductEventsLayerVersionArn", {
      parameterName: "ProductEventsLayerVersionArn",
      stringValue: productEventsLayers.layerVersionArn,
    });

    //CINEMA

    const moviesLayers = new lambda.LayerVersion(this, "MoviesLayer", {
      //localização da função
      code: lambda.Code.fromAsset("lambda/products/layers/moviesLayer"),
      //versoes do node compativeis
      compatibleRuntimes: [lambda.Runtime.NODEJS_14_X],
      //nome do layer | console do lambda
      layerVersionName: "MoviesLayer",
      //estrategia de remoção | RETAIN mantem o layer msm q apague a stack
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    //salvando layer no ssm
    new ssm.StringParameter(this, "MoviesLayerVersionArn", {
      parameterName: "MoviesLayerVersionArn",
      stringValue: moviesLayers.layerVersionArn,
      type: ssm.ParameterType.STRING,
    });
  }
}
