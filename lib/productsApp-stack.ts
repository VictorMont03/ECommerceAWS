import * as lambda from "aws-cdk-lib/aws-lambda"

import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs"

import * as cdk from "aws-cdk-lib"

import {Construct} from "constructs"

import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

import * as ssm from "aws-cdk-lib/aws-ssm"

export class ProductsAppStack extends cdk.Stack{
    readonly productsFetchHandler: lambdaNodeJS.NodejsFunction

    readonly productsAdminHandler: lambdaNodeJS.NodejsFunction

    readonly productsDdb: dynamodb.Table;

    constructor(scope: Construct, id: string, props?: cdk.StackProps){
        super(scope, id, props)

        this.productsDdb = new dynamodb.Table(this, "ProductsDdb", {
            tableName: "products",
            //politica de remoção da tabela: destruir caso destrua a infra
            removalPolicy: cdk.RemovalPolicy.DESTROY,

            partitionKey: {
                name: "id",
                type: dynamodb.AttributeType.STRING
            },
            //Modo de cobrança 
            billingMode: dynamodb.BillingMode.PROVISIONED,
            //Capacidade de leitura 1 leitura por segundo
            readCapacity: 1,
            //Capacidade de escrita 1 por segundo
            writeCapacity: 1,
        })

        //LAYERS PRODUCTS -------------------------------------------------
        //Resgatando layer que salvei no ssm
        const productsLayerArn = ssm.StringParameter.valueForStringParameter(this, "ProductsLayerVersionArn")

        //Mesmo recurso layer criado na stack de layers porem aqui passado como parametro
        const productsLayer = lambda.LayerVersion.fromLayerVersionArn(this, "ProductsLayerVersionArn", productsLayerArn)



        //FIM LAYERS ------------------------------------------------------

        //FUNÇÃO GET PRODUCTS 
        this.productsFetchHandler = new lambdaNodeJS.NodejsFunction(this, "ProductsFetchFunction", {functionName: "ProductsFetchFunction", entry: "lambda/products/productsFetchFunction.ts", handler: "handler", memorySize: 128, timeout: cdk.Duration.seconds(5), bundling: {
            minify: true,
            sourceMap: false
        }, environment: {
            PRODUCTS_DDB: this.productsDdb.tableName
        }, layers: [productsLayer], tracing: lambda.Tracing.ACTIVE})

        //Permitindo que a função possa LER na tabela
        this.productsDdb.grantReadData(this.productsFetchHandler)

        this.productsAdminHandler = new lambdaNodeJS.NodejsFunction(this,
            "ProductsAdminHandler", {functionName: "ProductsAdminHandler", entry: "lambda/products/productsAdminFunction.ts", handler: "handler", memorySize: 128, timeout: cdk.Duration.seconds(5), bundling: {
                minify: true,
                sourceMap: false
            }, environment: {
                PRODUCTS_DDB: this.productsDdb.tableName
            }, 
            //Libera a utilização dos trechos de código por esta função lambda
            layers: [productsLayer],tracing: lambda.Tracing.ACTIVE})

        //Permitindo que a função possa GERENCIAR a tabela
        this.productsDdb.grantWriteData(this.productsAdminHandler)
    }
}