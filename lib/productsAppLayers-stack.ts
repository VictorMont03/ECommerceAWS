import * as cdk from 'aws-cdk-lib';

import { Construct } from 'constructs';

import * as lambda from "aws-cdk-lib/aws-lambda"

//armazenar parametros | compartilhar parametros entre stacks sem causar dependencias entre elas
import * as ssm from "aws-cdk-lib/aws-ssm"

export class ProductsAppLayersStack extends cdk.Stack{
    readonly productsLayers: lambda.LayerVersion

    constructor(scope: Construct, id: string, props?: cdk.StackProps){
        super(scope, id, props);

        this.productsLayers = new lambda.LayerVersion(this, "ProductsLayer", {
            //localização da função
            code: lambda.Code.fromAsset('lambda/products/layers/productsLayer'), 
            //versoes do node compativeis
            compatibleRuntimes: [lambda.Runtime.NODEJS_14_X],
            //nome do layer | console do lambda 
            layerVersionName: "ProductsLayer",
            //estrategia de remoção | RETAIN mantem o layer msm q apague a stack
            removalPolicy: cdk.RemovalPolicy.RETAIN
        })

        //salvando layer no ssm
        new ssm.StringParameter(this, "ProductsLayerVersionArn", {
            parameterName: "ProductsLayerVersionArn",
            stringValue: this.productsLayers.layerVersionArn
        })
    }
}