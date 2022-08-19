import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { v4 as uuid } from "uuid";

export interface Chair {
  id: string;
  reservation: boolean;
}

export interface Movie {
  id: string;
  movieTitle: string;
  movieSession: string;
  moviePrice: number;
  movieCategory: string;
  moviePoster: string;
  movieLanguage: string;
  movieChairs: Chair[];
}

export class MovieRepository {
  private ddbClient: DocumentClient;
  private moviesDdb: string;

  constructor(ddbClient: DocumentClient, moviesDdb: string) {
    this.ddbClient = ddbClient;
    this.moviesDdb = moviesDdb;
  }

  //return all items of the table
  async getAllMovies(): Promise<Movie[]> {
    const data = await this.ddbClient
      .scan({
        TableName: this.moviesDdb,
      })
      .promise();

    return data.Items as Movie[];
  }

  //search using ID
  async getMovieById(movieId: string): Promise<Movie> {
    const data = await this.ddbClient
      .get({
        TableName: this.moviesDdb,
        Key: {
          id: movieId,
        },
      })
      .promise();

    if (data.Item) {
      return data.Item as Movie;
    } else {
      throw new Error("Movie not found");
    }
  }

  //Return movies for order
  async getMoviesByIds(moviesIds: string[]): Promise<Movie[]> {
    const keys: {
      id: string;
    }[] = [];
    moviesIds.forEach((movieId: string) => {
      keys.push({
        id: movieId,
      });
    });
    const data = await this.ddbClient
      .batchGet({
        RequestItems: {
          [this.moviesDdb]: {
            Keys: keys,
          },
        },
      })
      .promise();

    return data.Responses![this.moviesDdb] as Movie[];
  }

  //Create product in the table
  async createMovie(movie: Movie): Promise<Movie> {
    movie.id = uuid();
    await this.ddbClient
      .put({
        TableName: this.moviesDdb,
        Item: movie,
      })
      .promise();

    return movie;
  }

  //Delete product
  async deleteMovie(movieId: string): Promise<Movie> {
    const data = await this.ddbClient
      .delete({
        TableName: this.moviesDdb,
        Key: {
          id: movieId,
        },
        ReturnValues: "ALL_OLD",
      })
      .promise();

    if (data.Attributes) {
      return data.Attributes as Movie;
    } else {
      throw new Error("Movie not found");
    }
  }

  //Update product attributes
  async updateMovie(movieId: string, movie: Movie): Promise<Movie> {
    const data = await this.ddbClient
      .update({
        TableName: this.moviesDdb,
        Key: {
          id: movieId,
        },
        ConditionExpression: "attribute_exists(id)",
        ReturnValues: "UPDATED_NEW",
        UpdateExpression:
          "set movieTitle = :t, movieSession = :s, moviePrice = :p, movieCategory = :c, moviePoster = :u,movieLanguage = :l,movieChairs = :h",
        ExpressionAttributeValues: {
          ":t": movie.movieTitle,
          ":s": movie.movieSession,
          ":p": movie.moviePrice,
          ":c": movie.movieCategory,
          ":u": movie.moviePoster,
          ":l": movie.movieLanguage,
          ":h": movie.movieChairs,
        },
      })
      .promise();

    data.Attributes!.id = movieId;
    return data.Attributes as Movie;
  }
}
