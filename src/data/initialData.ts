/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseState } from '../types';

export const initialData: DatabaseState = {
  inventory: [
    {
      id: "inv_1",
      name: "Multímetro Digital Fluke 115",
      stock: 14,
      unit: "unidades",
      location: { rack: "Estante A", shelf: "Nivel 3", classroom: "Laboratorio Eléctrico y Automatización" },
      category: "Instrumental Técnico",
      minStock: 5
    },
    {
      id: "inv_2",
      name: "Osciloscopio Digital Tektronix 100MHz",
      stock: 5,
      unit: "unidades",
      location: { rack: "Estante A", shelf: "Nivel 1", classroom: "Laboratorio Eléctrico y Automatización" },
      category: "Equipo de Medida",
      minStock: 2
    },
    {
      id: "inv_3",
      name: "Cautín para Soldar Weller 60W",
      stock: 18,
      unit: "unidades",
      location: { rack: "Estante B", shelf: "Nivel 2", box: "Caja Azul 8", classroom: "Laboratorio Eléctrico y Automatización" },
      category: "Herramientas de Soldadura",
      minStock: 6
    },
    {
      id: "inv_4",
      name: "Alambre de Cobre esmaltado 1.5mm AWG",
      stock: 120,
      unit: "metros",
      location: { rack: "Estante C", shelf: "Nivel 2", box: "Rollo 12", classroom: "Laboratorio Eléctrico y Automatización" },
      category: "Consumibles",
      minStock: 30
    },
    {
      id: "inv_5",
      name: "Placa Arduino Uno R3 Original",
      stock: 6,
      unit: "unidades",
      location: { rack: "Estante B", shelf: "Nivel 4", box: "Caja Verde 2", classroom: "Laboratorio de Computación Aplicada" },
      category: "Placas de Desarrollo",
      minStock: 10 // Generates low stock warning since stock 6 < minStock 10!
    },
    {
      id: "inv_6",
      name: "Sensor de Temperatura IC LM35 DZ",
      stock: 45,
      unit: "unidades",
      location: { rack: "Estante B", shelf: "Nivel 4", box: "Organizador Cajón 3", classroom: "Laboratorio Eléctrico y Automatización" },
      category: "Componentes Electrónicos",
      minStock: 15
    },
    {
      id: "inv_7",
      name: "Kit de Herramientas de Freno de Disco",
      stock: 3,
      unit: "sets",
      location: { rack: "Gabinete Mech 1", shelf: "Nivel Inferior", classroom: "Taller de Mecánica Automotriz" },
      category: "Sistemas Mecánicos",
      minStock: 2
    },
    {
      id: "inv_8",
      name: "Micrómetro Exterior Mitutoyo (0-25mm)",
      stock: 4,
      unit: "unidades",
      location: { rack: "Estante Vitrina 1", shelf: "Nivel 2", classroom: "Taller de Mecánica Automotriz" },
      category: "Instrumental Técnico",
      minStock: 2
    },
    {
      id: "inv_9",
      name: "Líquido de Frenos Dot 4",
      stock: 9,
      unit: "litros",
      location: { rack: "Estante Inflamables", shelf: "Nivel Medio", classroom: "Taller de Mecánica Automotriz" },
      category: "Consumibles",
      minStock: 5
    }
  ],
  competencies: [
    {
      id: "comp_1",
      career: "T.N.S. en Electricidad y Automatización Industrial",
      subject: "Electrónica Analógica y Digital",
      code: "ELE-102",
      semester: "Segundo Semestre",
      profileCompetency: "Diagnosticar y reparar fallas en circuitos de control eléctrico y electrónico industrial, utilizando instrumental técnico estándar de acuerdo a especificaciones del plano constructivo.",
      keyLearning: [
        "Analizar el comportamiento de elementos semiconductores básicos en fuentes de poder.",
        "Calibrar medidores lógicos y osciloscopios analógicos.",
        "Construir compuertas lógicas básicas sobre protoboard."
      ]
    },
    {
      id: "comp_2",
      career: "T.N.S. en Electricidad y Automatización Industrial",
      subject: "Microcontroladores en Procesos Industriales",
      code: "AUT-204",
      semester: "Tercer Semestre",
      profileCompetency: "Integrar tecnologías de automatización inteligente y programación de sistemas embebidos en líneas productivas agrícolas e industriales de la Región de Valparaíso.",
      keyLearning: [
        "Configurar entradas/salidas digitales en arquitecturas de un solo chip.",
        "Adquirir señales analógicas provedientes de variables físicas del medio ambiente.",
        "Programar rutinas de control PID sencillas sobre microcontrolador."
      ]
    },
    {
      id: "comp_3",
      career: "T.N.S. en Mecánica Automotriz",
      subject: "Diagnóstico de Sistemas de Frenos y Suspensión",
      code: "MEC-112",
      semester: "Primer Semestre",
      profileCompetency: "Mantener los sistemas de frenado, dirección y suspensión automotriz, utilizando equipos de precisión homologados y respetando normativas vigentes medioambientales y de seguridad.",
      keyLearning: [
        "Inspeccionar desgaste físico de componentes de rozamiento de disco y tambor.",
        "Verificar tolerancias dimensionales con micrómetros e indicadores de esfera.",
        "Efectuar mantención preventiva del módulo servoasistido hidráulico."
      ]
    }
  ],
  traceability: [
    {
      id: "trac_1",
      labExperience: "Laboratorio 1: Rectificación y Medición de Fuentes de Poder Lineales",
      subjectId: "comp_1",
      description: "Montaje físico de rectificadores de media onda y onda completa para analizar las señales alternas y continuas mediante osciloscopio.",
      requiredItems: [
        { itemId: "inv_1", quantityRequired: 2 },
        { itemId: "inv_2", quantityRequired: 1 },
        { itemId: "inv_3", quantityRequired: 1 },
        { itemId: "inv_4", quantityRequired: 10 }
      ]
    },
    {
      id: "trac_2",
      labExperience: "Laboratorio 2: Monitoreo Térmico con Control Embebido Sensorizado",
      subjectId: "comp_2",
      description: "Práctica enfocada en programar un microcontrolador para leer de manera continua el sensor LM35 y gatillar alarmas luminosas de acuerdo al límite térmico configurado.",
      requiredItems: [
        { itemId: "inv_5", quantityRequired: 1 },
        { itemId: "inv_6", quantityRequired: 1 },
        { itemId: "inv_1", quantityRequired: 1 },
        { itemId: "inv_4", quantityRequired: 2 }
      ]
    },
    {
      id: "trac_3",
      labExperience: "Laboratorio 3: Metrología Aplicada y Rectificado de Discos",
      subjectId: "comp_3",
      description: "Verificar el alabeo de discos de frenos y determinar mediante medición micrométrica si corresponden a espesores óptimos de acuerdo al manual del fabricante de origen.",
      requiredItems: [
        { itemId: "inv_8", quantityRequired: 1 },
        { itemId: "inv_7", quantityRequired: 1 },
        { itemId: "inv_9", quantityRequired: 1 }
      ]
    }
  ],
  movements: [
    {
      id: "move_1",
      itemId: "inv_1",
      itemName: "Multímetro Digital Fluke 115",
      type: "entrada",
      quantity: 4,
      user: "Mario Salinas (Bodeguero)",
      timestamp: "2026-06-18T10:30:00Z",
      reason: "Recepción de compra centralizada CFT PUCV Sede Quillota"
    },
    {
      id: "move_2",
      itemId: "inv_5",
      itemName: "Placa Arduino Uno R3 Original",
      type: "salida",
      quantity: 4,
      user: "Paula Henríquez (Coordinador)",
      timestamp: "2026-06-19T14:15:00Z",
      reason: "Asignación fija para proyecto integrador tercer nivel"
    }
  ],
  requests: [
    {
      id: "req_1",
      labExperienceId: "trac_1",
      labExperienceName: "Laboratorio 1: Rectificación y Medición de Fuentes de Poder Lineales",
      subjectCode: "ELE-102",
      requestedBy: "teacher_1",
      teacherName: "Prof. Alejandro Rojas",
      dateRequired: "2026-06-22",
      status: "pendiente",
      notes: "Para el grupo práctico A de la jornada vespertina, requerimos los multímetros calibrados."
    }
  ]
};
