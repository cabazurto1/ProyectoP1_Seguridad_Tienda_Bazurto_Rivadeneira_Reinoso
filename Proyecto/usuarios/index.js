const express = require('express');
const { Client } = require('pg');
const soap = require('soap');
const http = require('http');

const app = express();
const port = 3004;

// Conexión a PostgreSQL
const client = new Client({
  connectionString: process.env.DATABASE_URL, // La URL de la base de datos PostgreSQL
});
client.connect();

// Middleware para parsear JSON
app.use(express.json());

// Importamos las rutas de usuarios y tickets
const usuariosRoutes = require('./routes/usuarios');
const ticketsRoutes = require('./routes/ticket');

app.use('/usuarios', usuariosRoutes); // Ruta base para usuarios
app.use('/tickets', ticketsRoutes); // Ruta base para tickets

// **Definimos las funciones del servicio SOAP de soporte**
const soporteFunctions = {
  SoporteService: {
    SoportePort: {
      // Crear un nuevo ticket
      createTicket: async ({ usuario_id, mensaje }) => {
        try {
          const query = `
            INSERT INTO tickets (usuario_id, mensaje, estado)
            VALUES ($1, $2, 'Abierto') RETURNING id
          `;
          const result = await client.query(query, [usuario_id, mensaje]);
          return { message: `Ticket creado con ID: ${result.rows[0].id}` };
        } catch (error) {
          console.error('Error al crear ticket:', error);
          return { message: 'Error al crear el ticket' };
        }
      },

      // Obtener el estado de un ticket con historial
      getTicketStatus: async ({ id }) => {
        try {
          const ticketQuery = 'SELECT mensaje, estado FROM tickets WHERE id = $1';
          const ticketResult = await client.query(ticketQuery, [id]);

          if (ticketResult.rows.length === 0) {
            return { estado: 'Ticket no encontrado', mensaje: '', historial: '' };
          }

          const { mensaje, estado } = ticketResult.rows[0];

          const historialQuery = `
            SELECT accion, fecha 
            FROM logs_usuarios 
            WHERE usuario_id = (SELECT usuario_id FROM tickets WHERE id = $1) 
            ORDER BY fecha DESC
          `;
          const historialResult = await client.query(historialQuery, [id]);

          const historial = historialResult.rows.map((registro) => ({
            fecha: registro.fecha.toISOString(),
            accion: registro.accion,
          }));

          return {
            estado,
            mensaje,
            historial: historial.length > 0 ? historial : 'No hay historial disponible',
          };
        } catch (error) {
          console.error('Error en getTicketStatus:', error);
          return { estado: 'Error al consultar el estado', mensaje: '', historial: '' };
        }
      },

      // Cerrar un ticket
      closeTicket: async ({ id }) => {
        try {
          const query = `
            UPDATE tickets SET estado = 'Cerrado'
            WHERE id = $1 AND estado = 'Abierto' RETURNING id
          `;
          const result = await client.query(query, [id]);

          if (result.rows.length === 0) {
            return { message: 'Ticket no encontrado o ya cerrado' };
          }

          return { message: `Ticket con ID: ${id} cerrado exitosamente` };
        } catch (error) {
          console.error('Error al cerrar ticket:', error);
          return { message: 'Error al cerrar el ticket' };
        }
      },

      // Listar tickets abiertos por usuario
      listTickets: async ({ usuario_id }) => {
        try {
          const query = `
            SELECT id, mensaje, estado 
            FROM tickets 
            WHERE usuario_id = $1 AND estado = 'Abierto'
          `;
          const result = await client.query(query, [usuario_id]);

          return {
            tickets: result.rows.map((ticket) => ({
              id: ticket.id,
              mensaje: ticket.mensaje,
              estado: ticket.estado,
            })),
          };
        } catch (error) {
          console.error('Error en listTickets:', error);
          return { tickets: 'Error al listar los tickets' };
        }
      },
    },
  },
};

// Crear el servidor SOAP
const wsdl = `
<definitions name="SoporteService"
  xmlns="http://schemas.xmlsoap.org/wsdl/"
  xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
  xmlns:tns="http://example.com/soporte"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  targetNamespace="http://example.com/soporte">

  <types>
    <xsd:schema targetNamespace="http://example.com/soporte">
      <!-- Crear un ticket -->
      <xsd:element name="createTicketRequest">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="usuario_id" type="xsd:int" />
            <xsd:element name="mensaje" type="xsd:string" />
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="createTicketResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="message" type="xsd:string" />
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>

      <!-- Obtener estado de un ticket -->
      <xsd:element name="getTicketStatusRequest">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="id" type="xsd:int" />
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="getTicketStatusResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="estado" type="xsd:string" />
            <xsd:element name="mensaje" type="xsd:string" />
            <xsd:element name="historial" type="xsd:string" />
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>

      <!-- Cerrar un ticket -->
      <xsd:element name="closeTicketRequest">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="id" type="xsd:int" />
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="closeTicketResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="message" type="xsd:string" />
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>

      <!-- Listar tickets abiertos -->
      <xsd:element name="listTicketsRequest">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="usuario_id" type="xsd:int" />
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="listTicketsResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="tickets" type="xsd:string" />
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
    </xsd:schema>
  </types>

  <message name="createTicketRequest">
    <part name="parameters" element="tns:createTicketRequest" />
  </message>
  <message name="createTicketResponse">
    <part name="parameters" element="tns:createTicketResponse" />
  </message>
  <message name="getTicketStatusRequest">
    <part name="parameters" element="tns:getTicketStatusRequest" />
  </message>
  <message name="getTicketStatusResponse">
    <part name="parameters" element="tns:getTicketStatusResponse" />
  </message>
  <message name="closeTicketRequest">
    <part name="parameters" element="tns:closeTicketRequest" />
  </message>
  <message name="closeTicketResponse">
    <part name="parameters" element="tns:closeTicketResponse" />
  </message>
  <message name="listTicketsRequest">
    <part name="parameters" element="tns:listTicketsRequest" />
  </message>
  <message name="listTicketsResponse">
    <part name="parameters" element="tns:listTicketsResponse" />
  </message>

  <portType name="SoportePortType">
    <operation name="createTicket">
      <input message="tns:createTicketRequest" />
      <output message="tns:createTicketResponse" />
    </operation>
    <operation name="getTicketStatus">
      <input message="tns:getTicketStatusRequest" />
      <output message="tns:getTicketStatusResponse" />
    </operation>
    <operation name="closeTicket">
      <input message="tns:closeTicketRequest" />
      <output message="tns:closeTicketResponse" />
    </operation>
    <operation name="listTickets">
      <input message="tns:listTicketsRequest" />
      <output message="tns:listTicketsResponse" />
    </operation>
  </portType>

  <binding name="SoportePortBinding" type="tns:SoportePortType">
    <soap:binding style="document" transport="http://schemas.xmlsoap.org/soap/http" />
    <operation name="createTicket">
      <soap:operation soapAction="http://example.com/soporte/createTicket" />
      <input><soap:body use="literal" /></input>
      <output><soap:body use="literal" /></output>
    </operation>
    <operation name="getTicketStatus">
      <soap:operation soapAction="http://example.com/soporte/getTicketStatus" />
      <input><soap:body use="literal" /></input>
      <output><soap:body use="literal" /></output>
    </operation>
    <operation name="closeTicket">
      <soap:operation soapAction="http://example.com/soporte/closeTicket" />
      <input><soap:body use="literal" /></input>
      <output><soap:body use="literal" /></output>
    </operation>
    <operation name="listTickets">
      <soap:operation soapAction="http://example.com/soporte/listTickets" />
      <input><soap:body use="literal" /></input>
      <output><soap:body use="literal" /></output>
    </operation>
  </binding>

  <service name="SoporteService">
    <port name="SoportePort" binding="tns:SoportePortBinding">
      <soap:address location="http://localhost:3004/soap" />
    </port>
  </service>
</definitions>
`;

const soapServer = http.createServer(app);
soap.listen(soapServer, '/soap', soporteFunctions, wsdl);

// Iniciar el servidor
soapServer.listen(port, () => {
  console.log(`Microservicio de usuarios corriendo en http://localhost:${port}`);
  console.log(`Servicio SOAP disponible en http://localhost:${port}/soap?wsdl`);
});
