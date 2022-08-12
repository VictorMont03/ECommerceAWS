import * as lambda from "aws-cdk-lib/aws-lambda"

import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs"

import * as cdk from "aws-cdk-lib"

import * as apigateway from "aws-cdk-lib/aws-apigateway"

import * as cwlogs from "aws-cdk-lib/aws-logs";

import {Construct} from "constructs"

//Caracteriza o recebimento de uma função lambda via props na instancia da classe
interface ECommerceApiStackProps extends cdk.StackProps{
    productsFetchHandler: lambdaNodeJS.NodejsFunction
    productsAdminHandler: lambdaNodeJS.NodejsFunction
}

export class ECommerceApiStack extends cdk.Stack{
    constructor(scope: Construct, id: string, props: ECommerceApiStackProps){
        super(scope, id, props)

        //Pastas que guarda os logs
        const logGroup =  new cwlogs.LogGroup(this, "ECommerceApiLogs")

        //Criando REST API utilizando o apigateway do aws cdk
        const api = new apigateway.RestApi(this, "EcommerceApi", {restApiName: "ECommerceApi", deployOptions: {accessLogDestination: new apigateway.LogGroupLogDestination(logGroup), accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({httpMethod: true, ip: true, protocol: true, requestTime: true, resourcePath: true, responseLength: true, status: true, caller: true, user: true})}})

        //Representa como o apigateway vai invocar a funcao passada via props
        const productsFetchIntegration = new apigateway.LambdaIntegration(props.productsFetchHandler)

        //Criação da rota /products
        const productsResource = api.root.addResource("products")
        //Redirecionar uma chamada em /products para a função declarada
        productsResource.addMethod("GET", productsFetchIntegration);

        //Criação da rota /products/{id}
         const productIdResource = productsResource.addResource("{id}")
         productIdResource.addMethod("GET", productsFetchIntegration)

        //Administração de produtos
        const productsAdminIntegration = new apigateway.LambdaIntegration(props.productsAdminHandler)

        productsResource.addMethod("POST", productsAdminIntegration)

        productIdResource.addMethod("PUT", productsAdminIntegration)

        productIdResource.addMethod("DELETE", productsAdminIntegration)

    }


}

