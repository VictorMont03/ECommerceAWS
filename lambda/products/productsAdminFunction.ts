import {APIGatewayProxyEvent, APIGatewayProxyResult, Context} from "aws-lambda"
import {Product, ProductRepository} from "/opt/nodejs/productsLayer";
import {DynamoDB} from "aws-sdk"
import * as AWSXRay from "aws-xray-sdk"

//Monitora as funcoes que utilizam o sdk 
AWSXRay.captureAWS(require("aws-sdk"))

//Busca nas variaveis de ambiente a variavel PRODUCTS_DDB, que foi salva na Stack App
const productsDdb = process.env.PRODUCTS_DDB!;
//Iniciando cliente do DynamoDB
const ddbClient = new DynamoDB.DocumentClient();
//inicia o objeto criado anteriormente passando como parametros o cliente ddb e o nome da tabela desejada 
const productRepository = new ProductRepository(ddbClient, productsDdb);

export async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult>{
    const lambdaRequestId = context.awsRequestId;
    const apiRequestId = event.requestContext.requestId;

    console.log(`API GATEWAY REQUEST ID: ${apiRequestId} - LAMBDA REQUEST ID: ${lambdaRequestId}`);
    
   if(event.resource === "/products"){
    console.log("POST /products");

    //Capturando body da requisicao e tipando como a interface a qual defini no productslayer
    const product = JSON.parse(event.body!) as Product;
    const productCreated = await productRepository.createProduct(product)

    return{
        statusCode: 201,
        body: JSON.stringify(productCreated),
    }
   }else if(event.resource === "/products/{id}"){
    const productId = event.pathParameters!.id as string
    
    if(event.httpMethod === "PUT"){
        console.log(`PUT /products/${productId}`);


        //O ponto de exclamação mostra que o acesso do objeto nao é obrigatório, ou seja, o objeto body pode ou não vir no objeto event
        const product = JSON.parse(event.body!)

        try{
            const ProductUpdated = await productRepository.updateProduct(productId, product)

            return{ statusCode:200, body: JSON.stringify(ProductUpdated)}
        }catch(ConditionalCheckFailedException){
            return{ statusCode: 404, body: JSON.stringify({ message: "Product not found"})}
        }
    }else if(event.httpMethod === "DELETE"){
        console.log(`DELETE /products/${productId}`);

        try{
            const product = await productRepository.deleteProduct(productId);

            return{ statusCode: 200, body: JSON.stringify(product)}
        }catch(error){
            return{ statusCode: 200, body: JSON.stringify({ message: (<Error>error).message})}
        }   
    }
   }

   return{ statusCode: 400, body: "Bad Request" };
    
}
