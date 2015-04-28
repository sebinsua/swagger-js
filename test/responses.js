/* global describe, it */

'use strict';

var _ = require('lodash-compat');
var expect = require('expect');
var Operation = require('../lib/types/operation');
var petstore = require('./spec/v2/petstore.json');
var SwaggerClient = require('..');

var MonsterResponse = { schema: { $ref: '#/definitions/Monster' }};
var StringResponse = { schema: { type: 'string'} };
var BasicResponseModel = { schema: { $ref: '#/definitions/ResponseModel'}};
var MonsterModel = {
  properties: {
    id: { type: 'integer', format: 'int64' },
    name: { type: 'string' }
  }
};
var ResponseModel = {
  properties: {
    code: { type: 'integer', format: 'int32' },
    message: { type: 'string' }
  }
};

describe('response types', function () {
  it('should return a 200 response definition', function () {
    var responses = {
      200:       MonsterResponse,
      201:       StringResponse,
      'default': BasicResponseModel
    };
    var definitions = {
      Monster: MonsterModel,
      ResponseModel: ResponseModel
    };
    var op = new Operation(
      {},
      'http',
      'operationId',
      'get',
      '/path',
      {responses: responses}, // args
      definitions); // definitions

    expect(typeof op.successResponse).toBe('object');
    expect(op.successResponse['200'].createJSONSample()).toEqual({ id: 0, name: 'string' });

    responses = op.responses;

    expect(typeof responses['201']).toBe('object');
    expect(typeof responses['default']).toBe('object');
  });

  it('should contain expected response properties (Issue 277)', function () {
    var description = 'Test description';
    var examples = {
      'application/json': {
        name: 'Anonymous'
      }
    };
    var headers = {
      'X-Testing': {
        type: 'string'
      }
    };
    var schema = {
      properties: {
        name: {
          type: 'string'
        }
      }
    };
    var responses = {
      '200': {
        description: description,
        examples: examples,
        headers: headers,
        schema: schema
      },
      'default': {
        description: description,
        examples: {
          'application/json': {
            id: 1,
            name: 'Test Monster'
          }
        },
        headers: headers,
        schema: {
          $ref: '#/definitions/Monster'
        }
      }
    };
    var definitions = {
      Monster: MonsterModel
    };

    responses['default'].schema = {
      $ref: '#/definitions/Monster'
    };

    var op = new Operation(
      {},
      'http',
      'operationId',
      'get',
      '/path',
      {responses: responses},
      definitions);

    // responses['200'] seems to be deleted by the Operation so we have to test differently
    expect(op.successResponse['200'].definition).toEqual(schema);
    expect(op.successResponse['200'].description).toBe(description);
    expect(op.successResponse['200'].examples).toEqual(examples);
    expect(op.successResponse['200'].headers).toEqual(headers);

    expect(op.responses['default'].description).toBe(responses['default'].description);
    expect(op.responses['default'].examples).toEqual(responses['default'].examples);
    expect(op.responses['default'].headers).toEqual(responses['default'].headers);
    expect(op.responses['default'].schema).toEqual(responses['default'].schema);
  });

  it('should return JSON example when provided as Object (Issue 300)', function (done) {
    var cPetStore = _.cloneDeep(petstore);
    var testPet = {
      id: 1,
      name: 'Test Pet'
    };

    cPetStore.paths['/pet/{petId}'].get.responses['200'].examples = {
      'application/json': testPet
    };

    var client = new SwaggerClient({
      spec: cPetStore,
      success: function () {
        expect(client.pet.operations.getPetById.successResponse['200'].createJSONSample()).toEqual(testPet);

        done();
      }
    });
  });

  it('should return JSON example when provided as String (Issue 300)', function (done) {
    var cPetStore = _.cloneDeep(petstore);
    var testPet = {
      id: 1,
      name: 'Test Pet'
    };

    cPetStore.paths['/pet/{petId}'].get.responses['200'].examples = {
      'application/json': JSON.stringify(testPet)
    };

    var client = new SwaggerClient({
      spec: cPetStore,
      success: function () {
        expect(client.pet.operations.getPetById.successResponse['200'].createJSONSample()).toEqual(testPet);

        done();
      }
    });
  });

  it('should handle response references (swagger-ui/issues/1078)', function (done) {
    var cPetStore = _.cloneDeep(petstore);

    cPetStore.responses = {
      '200': {
        description: 'successful operation',
        schema: {
          $ref: '#/definitions/PetArray'
        }
      }
    };

    cPetStore.paths['/pet/findByStatus'].get.responses['200'] = {
      $ref: '#/responses/200'
    };

    var client = new SwaggerClient({
      spec: cPetStore,
      success: function () {
        var expectedJson = [{
          id: 0,
          category: {
              id: 0,
              name: 'string'
            },
          name: 'doggie',
          photoUrls: [
              'string'
            ],
          tags: [
              {
                id: 0,
                name: 'string'
              }
            ],
          status: 'string'
        }];
        var response = client.pet.operations.findPetsByStatus.successResponse['200'];

        expect(response.createJSONSample()).toEqual(expectedJson);
        expect(response.getSampleValue()).toEqual(expectedJson);

        // A way of testing 'html'-ish , just a bunch of regexes
        // ... TODO: extract HTML generation from swagger-js
        var htmlish = response.getMockSignature();
        // match PetArray [
        expect(/PetArray *\[/.test(htmlish)).toBe(true);

        done();
      }
    });
  });
});
