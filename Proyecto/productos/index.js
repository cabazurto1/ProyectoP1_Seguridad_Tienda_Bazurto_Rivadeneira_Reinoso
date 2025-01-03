const express = require('express');
const { Client } = require('pg');
const soap = require('soap');
const http = require('http');

const app = express();
const port = 3001;

// Conexión a la base de datos PostgreSQL
const client = new Client({
  connectionString: process.env.DATABASE_URL, // La URL de la base de datos PostgreSQL
});

client.connect();

// Middleware para parsear JSON
app.use(express.json()); // Esto es esencial para manejar peticiones con datos en JSON

// Importamos las rutas de productos
const productosRoutes = require('./routes/productos');
app.use('/productos', productosRoutes); // La ruta base para productos es "/productos"

// **Definimos las funciones del servicio SOAP**
const serviceFunctions = {
  ProductoService: {
    ProductoPort: {
      // Obtener el stock de un producto
      getProductStock: async ({ id }) => {
        try {
          if (!Number.isInteger(parseInt(id))) {
            return { stock: 'ID inválido. Debe ser un número entero.' };
          }

          const query = 'SELECT stock FROM productos WHERE id = $1';
          const result = await client.query(query, [id]);

          if (result.rows.length === 0) {
            return { stock: 'Producto no encontrado' };
          }

          return { stock: result.rows[0].stock.toString() };
        } catch (error) {
          console.error('Error en la consulta:', error);
          return { stock: 'Error al obtener el stock' };
        }
      },

      // Actualizar el stock de un producto
      updateProductStock: async ({ id, stock }) => {
        try {
          if (!Number.isInteger(parseInt(id)) || !Number.isInteger(parseInt(stock))) {
            return { message: 'Datos inválidos. ID y stock deben ser números enteros.' };
          }

          const query = 'UPDATE productos SET stock = $1 WHERE id = $2 RETURNING id';
          const result = await client.query(query, [stock, id]);

          if (result.rows.length === 0) {
            return { message: 'Producto no encontrado' };
          }

          return { message: `Stock actualizado para el producto con ID: ${id}` };
        } catch (error) {
          console.error('Error al actualizar el stock:', error);
          return { message: 'Error al actualizar el stock' };
        }
      },

      // Obtener logs de cambios en el inventario
      getProductLogs: async ({ id }) => {
        try {
          if (!Number.isInteger(parseInt(id))) {
            return { logs: 'ID inválido. Debe ser un número entero.' };
          }

          const query = 'SELECT * FROM logs_productos WHERE producto_id = $1 ORDER BY fecha DESC';
          const result = await client.query(query, [id]);

          if (result.rows.length === 0) {
            return { logs: [] }; // Sin registros
          }

          return {
            logs: result.rows.map((log) => ({
              accion: log.accion,
              stock_anterior: log.stock_anterior,
              stock_nuevo: log.stock_nuevo,
              fecha: log.fecha.toISOString(),
            })),
          };
        } catch (error) {
          console.error('Error al obtener los logs:', error);
          return { logs: 'Error al obtener los registros' };
        }
      },

      // Notificar cambios en el stock
      notifyStockChange: async ({ id }) => {
        try {
          const query = 'SELECT * FROM logs_productos WHERE producto_id = $1 ORDER BY fecha DESC LIMIT 1';
          const result = await client.query(query, [id]);

          if (result.rows.length === 0) {
            return { message: 'No se encontraron registros de cambios para este producto.' };
          }

          const log = result.rows[0];
          return {
            producto_id: id,
            accion: log.accion,
            stock_anterior: log.stock_anterior,
            stock_nuevo: log.stock_nuevo,
            fecha: log.fecha.toISOString(),
          };
        } catch (error) {
          console.error('Error al obtener el log de cambios:', error);
          return { message: 'Error al obtener el registro de cambios.' };
        }
      },
    },
  },
};

// **Definimos el WSDL (estructura del servicio SOAP)**
const wsdl = `
<definitions name="ProductoService"
  xmlns="http://schemas.xmlsoap.org/wsdl/"
  xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
  xmlns:tns="http://example.com/producto"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  targetNamespace="http://example.com/producto">
  
  <types>
    <xsd:schema targetNamespace="http://example.com/producto">
      <xsd:element name="getProductStockRequest">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="id" type="xsd:int" />
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="getProductStockResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="stock" type="xsd:string" />
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>

      <xsd:element name="updateProductStockRequest">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="id" type="xsd:int" />
            <xsd:element name="stock" type="xsd:int" />
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="updateProductStockResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="message" type="xsd:string" />
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>

      <xsd:element name="getProductLogsRequest">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="id" type="xsd:int" />
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="getProductLogsResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="logs" type="xsd:string" />
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>

      <xsd:element name="notifyStockChangeRequest">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="id" type="xsd:int" />
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="notifyStockChangeResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="message" type="xsd:string" />
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
    </xsd:schema>
  </types>

  <message name="getProductStockRequest">
    <part name="parameters" element="tns:getProductStockRequest" />
  </message>
  <message name="getProductStockResponse">
    <part name="parameters" element="tns:getProductStockResponse" />
  </message>

  <message name="updateProductStockRequest">
    <part name="parameters" element="tns:updateProductStockRequest" />
  </message>
  <message name="updateProductStockResponse">
    <part name="parameters" element="tns:updateProductStockResponse" />
  </message>

  <message name="getProductLogsRequest">
    <part name="parameters" element="tns:getProductLogsRequest" />
  </message>
  <message name="getProductLogsResponse">
    <part name="parameters" element="tns:getProductLogsResponse" />
  </message>

  <message name="notifyStockChangeRequest">
    <part name="parameters" element="tns:notifyStockChangeRequest" />
  </message>
  <message name="notifyStockChangeResponse">
    <part name="parameters" element="tns:notifyStockChangeResponse" />
  </message>

  <portType name="ProductoPortType">
    <operation name="getProductStock">
      <input message="tns:getProductStockRequest" />
      <output message="tns:getProductStockResponse" />
    </operation>
    <operation name="updateProductStock">
      <input message="tns:updateProductStockRequest" />
      <output message="tns:updateProductStockResponse" />
    </operation>
    <operation name="getProductLogs">
      <input message="tns:getProductLogsRequest" />
      <output message="tns:getProductLogsResponse" />
    </operation>
    <operation name="notifyStockChange">
      <input message="tns:notifyStockChangeRequest" />
      <output message="tns:notifyStockChangeResponse" />
    </operation>
  </portType>

  <binding name="ProductoPortBinding" type="tns:ProductoPortType">
    <soap:binding style="document" transport="http://schemas.xmlsoap.org/soap/http" />
    <operation name="getProductStock">
      <soap:operation soapAction="http://example.com/producto/getProductStock" />
      <input><soap:body use="literal" /></input>
      <output><soap:body use="literal" /></output>
    </operation>
    <operation name="updateProductStock">
      <soap:operation soapAction="http://example.com/producto/updateProductStock" />
      <input><soap:body use="literal" /></input>
      <output><soap:body use="literal" /></output>
    </operation>
    <operation name="getProductLogs">
      <soap:operation soapAction="http://example.com/producto/getProductLogs" />
      <input><soap:body use="literal" /></input>
      <output><soap:body use="literal" /></output>
    </operation>
    <operation name="notifyStockChange">
      <soap:operation soapAction="http://example.com/producto/notifyStockChange" />
      <input><soap:body use="literal" /></input>
      <output><soap:body use="literal" /></output>
    </operation>
  </binding>

  <service name="ProductoService">
    <port name="ProductoPort" binding="tns:ProductoPortBinding">
      <soap:address location="http://localhost:3001/soap" />
    </port>
  </service>
</definitions>
`;

// Crear el servidor SOAP
const soapServer = http.createServer(app);
soap.listen(soapServer, '/soap', serviceFunctions, wsdl);

// Iniciar el servidor
soapServer.listen(port, () => {
  console.log(`Microservicio de productos corriendo en http://localhost:${port}`);
  console.log(`Servicio SOAP disponible en http://localhost:${port}/soap?wsdl`);
});
