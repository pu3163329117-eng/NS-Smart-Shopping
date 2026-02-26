import swaggerJsDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart NS Backend API',
      version: '1.0.0',
      description: 'API documentation for the Smart NS Student Company platform',
      contact: {
        name: 'Developer',
        email: 'dev@smartns.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./src/routes/*.js'] // Path to the API docs
};

const specs = swaggerJsDoc(options);
export default specs;
